/**
 * A server-sent-events parser, because `EventSource` cannot POST — and because
 * it reconnects on its own, which for a chat turn would silently re-run the
 * agent and charge for it twice.
 *
 * Stateful by necessity: a chunk off the network splits wherever TCP felt like
 * it, so the tail of an unfinished frame has to survive until the rest arrives.
 */

export interface SseEvent {
  name: string;
  data: string;
}

const FRAME_SEPARATOR = /\r?\n\r?\n/u;
const LINE_SEPARATOR = /\r?\n/u;

function eventFrom(frame: string): SseEvent | null {
  let name = "message";
  const data: string[] = [];

  for (const line of frame.split(LINE_SEPARATOR)) {
    // A line starting with a colon is a comment — the heartbeat is one — and
    // exists precisely so something is written on an idle stream.
    if (line.startsWith(":")) {
      continue;
    }

    if (line.startsWith("event:")) {
      name = line.slice("event:".length).trim();
    } else if (line.startsWith("data:")) {
      data.push(line.slice("data:".length).trimStart());
    }
  }

  // Several data lines are one payload joined by newlines, which is what lets a
  // JSON body contain them.
  return data.length > 0 ? { name, data: data.join("\n") } : null;
}

/**
 * A parser over one stream. Feed it decoded text; it returns whatever complete
 * frames that text finished.
 */
export function createSseParser(): (chunk: string) => SseEvent[] {
  let pending = "";

  return (chunk: string): SseEvent[] => {
    pending += chunk;

    const frames = pending.split(FRAME_SEPARATOR);
    // The last piece is either an unfinished frame or the empty string after a
    // clean break. Either way it is not ours to emit yet.
    pending = frames.pop() ?? "";

    const ret: SseEvent[] = [];

    for (const frame of frames) {
      const event = eventFrom(frame);

      if (event) {
        ret.push(event);
      }
    }

    return ret;
  };
}
