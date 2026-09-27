import { entryFromEntity, type EntryEntity } from "@/features/entries/types";
import type { AgentFrame } from "./types";
import type { ToolFrame } from "./tool_steps";
import type { SseEvent } from "./sse";

/**
 * What the agent's events mean to a panel that is drawing them.
 *
 * The runtime can grow event types, so anything unrecognised is dropped rather
 * than rendered or thrown: a progress panel is the wrong place to discover a
 * new one.
 */

interface AgentEvent {
  type?: unknown;
  text?: unknown;
  thinking?: unknown;
  tool?: unknown;
  toolCallId?: unknown;
  isError?: unknown;
}

function parsed(data: string): unknown {
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

function agentFrame(event: AgentEvent): AgentFrame | null {
  switch (event.type) {
    case "text":
      return typeof event.text === "string" ? { kind: "text", text: event.text } : null;
    // The runtime names this field for the event, not for us, so both spellings
    // are accepted rather than depending on which one a version uses.
    case "thinking":
      return reasoningFrom(event);
    case "tool_call":
      return toolFrom(event, false);
    case "tool_result":
      return toolFrom(event, true);
    case "done":
      return { kind: "done" };
    default:
      return null;
  }
}

// A tool without a name still gets a step: the name only chooses its words.
function toolFrom(event: AgentEvent, done: boolean): AgentFrame {
  const frame: ToolFrame = {
    id: typeof event.toolCallId === "string" ? event.toolCallId : "",
    name: typeof event.tool === "string" ? event.tool : "",
    done,
    failed: event.isError === true,
  };

  return { kind: "tool", ...frame };
}

function reasoningFrom(event: AgentEvent): AgentFrame | null {
  const text = typeof event.thinking === "string" ? event.thinking : event.text;

  return typeof text === "string" && text !== "" ? { kind: "reasoning", text } : null;
}

// Every field the mapper reads, because it reads them as strings — and one that
// is not is not a broken entry, it is an exception thrown out of the parser and
// caught as a failed run. Dropping the frame is the contract this file keeps.
const ENTRY_FIELDS = [
  "id",
  "thread_key",
  "entry_date",
  "title",
  "content",
  "created_at",
  "updated_at",
] as const;

// A row, as the entry flows send it. Anything that is not a whole one is
// dropped rather than rendered as half an entry.
function entryFrame(kind: "entry" | "open", body: unknown): AgentFrame | null {
  if (typeof body !== "object" || body === null) {
    return null;
  }

  const row = body as Record<string, unknown>;

  if (ENTRY_FIELDS.some((field) => typeof row[field] !== "string")) {
    return null;
  }

  return { kind, entry: entryFromEntity(body as EntryEntity) };
}

export function frameFrom(event: SseEvent): AgentFrame | null {
  const body = parsed(event.data);

  // The final frame is the answer itself, and the flow declares it as text, so
  // it arrives as a JSON string rather than an object.
  if (event.name === "answer") {
    return typeof body === "string" ? { kind: "answer", text: body } : null;
  }

  // Written by a tool straight onto the stream, rather than by the agent's own
  // event path — so these are named frames and carry a row, not an event type.
  if (event.name === "entry" || event.name === "open") {
    return entryFrame(event.name, body);
  }

  if (typeof body !== "object" || body === null) {
    return null;
  }

  return agentFrame(body as AgentEvent);
}
