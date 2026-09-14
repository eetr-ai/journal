import { auth } from "@/auth";
import { vaultGate } from "@/features/vault/gate";
import { chatClient } from "@/features/chat/client";
import { askFrom } from "@/features/chat/rules";

/**
 * The chat stream, proxied from the agent to the browser.
 *
 * A route handler rather than a server action, because an action cannot stream
 * — and the whole point is that the answer arrives as it is written.
 *
 * The message and the answer pass through here in the clear, for the length of
 * one request a person started. Nothing here may log a body.
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

export async function POST(request: Request): Promise<Response> {
  // The session is the trust boundary. The subject never comes from the posted
  // body, which is what stops a caller writing into someone else's memory.
  const subject = (await auth())?.user?.subject;

  if (!subject) {
    return new Response(null, { status: UNAUTHORIZED });
  }

  // A JSON content type forces a preflight for a cross-origin caller, on top of
  // the session cookie being SameSite=Lax.
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return new Response(null, { status: UNSUPPORTED_MEDIA });
  }

  // The real gate, not the marker cookie beside it: the cookie is written by
  // client code, so trusting it alone would be a way into the app with no vault
  // — and there is no vault-less path through this app by design.
  if ((await vaultGate()) !== "open") {
    return new Response(null, { status: LOCKED });
  }

  const ask = askFrom(await body(request));

  if (!ask) {
    return new Response(null, { status: BAD_REQUEST });
  }

  const stream = await chatClient.stream({ subject, ask, signal: request.signal });

  if (!stream) {
    return new Response(null, { status: BAD_GATEWAY });
  }

  // Passed through untouched. A disconnect cancels this stream, which cancels
  // the request to the agent, which is how the agent learns to stop.
  return new Response(stream, { headers: SSE_HEADERS });
}
