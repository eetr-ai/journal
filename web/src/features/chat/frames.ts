import type { AgentFrame } from "./types";
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
      return { kind: "tool", done: false };
    case "tool_result":
      return { kind: "tool", done: true };
    case "done":
      return { kind: "done" };
    default:
      return null;
  }
}

function reasoningFrom(event: AgentEvent): AgentFrame | null {
  const text = typeof event.thinking === "string" ? event.thinking : event.text;

  return typeof text === "string" && text !== "" ? { kind: "reasoning", text } : null;
}

export function frameFrom(event: SseEvent): AgentFrame | null {
  const body = parsed(event.data);

  // The final frame is the answer itself, and the flow declares it as text, so
  // it arrives as a JSON string rather than an object.
  if (event.name === "answer") {
    return typeof body === "string" ? { kind: "answer", text: body } : null;
  }

  if (typeof body !== "object" || body === null) {
    return null;
  }

  return agentFrame(body as AgentEvent);
}
