import { auth } from "@/auth";
import { vaultGate } from "@/features/vault/gate";
import { chatClient } from "@/features/chat/client";
import { askFrom } from "@/features/chat/rules";
import { momentFor } from "@/features/chat/now";
import { currentProfile } from "@/features/profile/service";

/**
 * The chat stream, proxied from the agent to the browser.
 *
 * A route handler rather than a server action, because an action cannot stream
 * — and the whole point is that the answer arrives as it is written.
 *
 * The message and the answer pass through here in the clear, for the length of
 * one request a person started, and the body also carries the key their agent
 * memory is sealed under. Nothing here may log a body, and nothing here keeps
 * one: it is read, handed on, and gone with the request.
 *
 * No `runtime` or `dynamic` export: nodejs is the default and edge is
 * deprecated, and a POST is never prerendered.
 */

const UNAUTHORIZED = 401;
const LOCKED = 423;
const BAD_REQUEST = 400;
const UNSUPPORTED_MEDIA = 415;
const BAD_GATEWAY = 502;

// no-transform stops a proxy from buffering the stream into one blob, and
// x-accel-buffering says the same thing to anything nginx-shaped in front.
const SSE_HEADERS = {
  "content-type": "text/event-stream; charset=utf-8",
  "cache-control": "no-store, no-transform",
  "x-accel-buffering": "no",
};

async function body(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

/**
 * Who this is, or the answer that turns them away.
 *
 * Three refusals in a row, kept together so the handler below reads as what it
 * does rather than what it guards against.
 */
type Admitted = { subject: string } | { refused: Response };

async function admit(request: Request): Promise<Admitted> {
  // The session is the trust boundary. The subject never comes from the posted
  // body, which is what stops a caller writing into someone else's memory.
  const subject = (await auth())?.user?.subject;

  if (!subject) {
    return { refused: new Response(null, { status: UNAUTHORIZED }) };
  }

  // A JSON content type forces a preflight for a cross-origin caller, on top of
  // the session cookie being SameSite=Lax.
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return { refused: new Response(null, { status: UNSUPPORTED_MEDIA }) };
  }

  // The real gate, not the marker cookie beside it: the cookie is written by
  // client code, so trusting it alone would be a way into the app with no vault
  // — and there is no vault-less path through this app by design.
  if ((await vaultGate()) !== "open") {
    return { refused: new Response(null, { status: LOCKED }) };
  }

  return { subject };
}

export async function POST(request: Request): Promise<Response> {
  const admitted = await admit(request);

  if ("refused" in admitted) {
    return admitted.refused;
  }

  const ask = askFrom(await body(request));

  if (!ask) {
    return new Response(null, { status: BAD_REQUEST });
  }

  // The agent has no clock of its own, and the day it files an entry under has
  // to be the reader's day. The zone is theirs; the instant is ours.
  const profile = await currentProfile();

  const stream = await chatClient.stream({
    subject: admitted.subject,
    ask: { ...ask, now: momentFor(profile?.config.timezone ?? "") },
    signal: request.signal,
  });

  if (!stream) {
    return new Response(null, { status: BAD_GATEWAY });
  }

  // Passed through untouched. A disconnect cancels this stream, which cancels
  // the request to the agent, which is how the agent learns to stop.
  return new Response(stream, { headers: SSE_HEADERS });
}
