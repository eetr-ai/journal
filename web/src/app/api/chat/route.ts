import { admit, postedJson } from "@/features/vault/admit";
import { chatClient } from "@/features/chat/client";
import { askFrom } from "@/features/chat/rules";
import { maxImages } from "@/features/images/config";
import { maxBodyBytes } from "@/features/images/rules";
import { momentFor } from "@/features/chat/now";
import { currentProfile } from "@/features/profile/service";
import { needsDetection } from "@/features/profile/types";
import type { ChatAsk } from "@/features/chat/types";

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

const BAD_REQUEST = 400;
const TOO_LARGE = 413;
const BAD_GATEWAY = 502;
// Early, not wrong: the reader's zone has not reached the server yet.
const TOO_EARLY = 409;

// no-transform stops a proxy from buffering the stream into one blob, and
// x-accel-buffering says the same thing to anything nginx-shaped in front.
const SSE_HEADERS = {
  "content-type": "text/event-stream; charset=utf-8",
  "cache-control": "no-store, no-transform",
  "x-accel-buffering": "no",
};

/**
 * The posted ask, or the answer that refuses it. A body larger than the picture
 * rules allow could never have been valid, and nothing else caps a route
 * handler's body, so it is refused without being read to the end — or at all,
 * when content-length already says so.
 */
async function askIn(request: Request): Promise<ChatAsk | Response> {
  const limit = maxImages();
  const cap = maxBodyBytes(limit);

  const posted = await postedJson(request, cap);

  if (posted === "tooLarge") {
    return new Response(null, { status: TOO_LARGE });
  }

  return askFrom(posted, limit) ?? new Response(null, { status: BAD_REQUEST });
}

export async function POST(request: Request): Promise<Response> {
  const admitted = await admit(request);

  if ("refused" in admitted) {
    return admitted.refused;
  }

  const ask = await askIn(request);

  if (ask instanceof Response) {
    return ask;
  }

  // The agent has no clock of its own, and the day it files an entry under has
  // to be the reader's day. The zone is theirs; the instant is ours.
  const profile = await currentProfile();

  // Without the zone there is no such thing as the reader's day, and falling
  // back to this process's one would file an entry under a day nobody was
  // living in — permanently, since the note is what stays. The shell fills this
  // in on its first render, so a request that arrives before it has is early
  // rather than wrong, and says so.
  if (!profile || needsDetection(profile.config)) {
    return new Response(null, { status: TOO_EARLY });
  }

  const stream = await chatClient.stream({
    subject: admitted.subject,
    ask: { ...ask, now: momentFor(profile.config.timezone) },
    signal: request.signal,
  });

  if (!stream) {
    return new Response(null, { status: BAD_GATEWAY });
  }

  // Passed through untouched. A disconnect cancels this stream, which cancels
  // the request to the agent, which is how the agent learns to stop.
  return new Response(stream, { headers: SSE_HEADERS });
}
