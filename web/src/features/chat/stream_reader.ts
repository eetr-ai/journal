"use client";

import { createSseParser } from "./sse";
import { frameFrom } from "./frames";
import type { AgentFrame } from "./types";

/**
 * The agent's frames, as they arrive. A generator rather than a callback, so the
 * hook that consumes it reads as a loop and the pump lives nowhere near React.
 */
export async function* readFrames(body: ReadableStream<Uint8Array>): AsyncGenerator<AgentFrame> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  const parse = createSseParser();

  try {
    for (;;) {
      const { done, value } = await reader.read();

      if (done) {
        return;
      }

      // stream: true keeps a multi-byte character split across two chunks from
      // decoding as two broken ones.
      yield* framesIn(parse(decoder.decode(value, { stream: true })));
    }
  } finally {
    reader.releaseLock();
  }
}

function* framesIn(events: ReturnType<ReturnType<typeof createSseParser>>): Generator<AgentFrame> {
  for (const event of events) {
    const frame = frameFrom(event);

    if (frame) {
      yield frame;
    }
  }
}
