"use client";

import type { ChatAsk } from "./types";

/**
 * The one module that knows where the browser posts a message.
 *
 * A plain fetch rather than a RestClient: this hop is same-origin, carries no
 * base URL, no auth header and no retry, and a second client configuration to
 * keep in step would buy nothing. The rule it is keeping is that no component
 * builds this URL.
 */

const CHAT_ENDPOINT = "/api/chat";

export interface OpenParams {
  ask: ChatAsk;
  signal?: AbortSignal;
}

/** The answer stream, or null when the BFF refused. */
export async function openChat(params: OpenParams): Promise<ReadableStream<Uint8Array> | null> {
  const response = await fetch(CHAT_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "text/event-stream" },
    body: JSON.stringify(params.ask),
    signal: params.signal,
  });

  if (!response.ok || !response.body) {
    return null;
  }

  return response.body;
}

/**
 * A message for a run already going, or a stop for one.
 *
 * Both answer with an empty body and no stream — the run they reached is what
 * keeps writing, in the stream the reader is already watching — so the response
 * is drained and dropped rather than read for frames.
 */
export async function steerChat(ask: ChatAsk): Promise<boolean> {
  const body = await openChat({ ask });

  if (!body) {
    return false;
  }

  await body.cancel();

  return true;
}
