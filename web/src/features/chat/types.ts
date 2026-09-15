import type { Locale } from "@/i18n/config";
import type { Entry } from "@/features/entries/types";

/**
 * What a conversation is, on both sides of the agent boundary.
 *
 * The agent answers in the shape its SQL produced, so the snake_case entities
 * live here beside the domain types and the mappers between them — nothing
 * downstream ever sees a `thread_key`.
 */

/**
 * One turn of the conversation, as it is sent.
 *
 * `intent` is how a reader ends a run that is already going. It says what the
 * browser wants, not what the agent is told: the BFF turns it into the header
 * the flow reads, and never passes one through.
 *
 * `key` is what the agent's memory is sealed under. It is on the body because
 * the body is the one place a key may travel: it reaches the server only inside
 * the request that needs it, is forwarded to the store with that run, and is
 * kept by nobody. Never log this object.
 */
export interface ChatAsk {
  threadId: string;
  message: string;
  locale: Locale;
  key: string;
  intent?: "say" | "stop";
}

/**
 * When the run is happening, in the reader's terms.
 *
 * Added by the BFF rather than sent by the browser: it is what an entry is
 * dated by, and a date a caller chose is a date they could choose wrongly.
 */
export interface Now {
  iso: string;
  /** YYYY-MM-DD in `timezone`. */
  date: string;
  weekday: string;
  timezone: string;
}

/** What actually reaches the agent: the ask, plus what the browser cannot say. */
export type AgentAsk = ChatAsk & { now: Now };

/** Who said it. The agent's roles are the model's; ours are the reader's. */
export type Speaker = "you" | "journal";

export interface Turn {
  seq: number;
  from: Speaker;
  text: string;
  /** When it was recorded, as the agent stamped it. ISO 8601. */
  at: string;
}

export interface Conversation {
  id: string;
  title: string;
  turnCount: number;
  createdAt: string;
  lastActivityAt: string;
}

export interface TurnEntity {
  seq: number;
  role: string;
  content: string;
  created_at: string;
}

export interface ConversationEntity {
  thread_key: string;
  title: string;
  turn_count: number;
  created_at: string;
  last_activity_at: string;
}

export interface ConversationsEntity {
  chats: ConversationEntity[];
}

export interface TranscriptEntity {
  chat: ConversationEntity;
  turns: TurnEntity[];
}

export function conversationFromEntity(entity: ConversationEntity): Conversation {
  return {
    id: entity.thread_key,
    title: entity.title,
    turnCount: entity.turn_count,
    createdAt: entity.created_at,
    lastActivityAt: entity.last_activity_at,
  };
}

// Anything that is not the person is the journal: the model's roles are its own
// business, and a new one appearing should read as the journal rather than
// crash a list.
export function turnFromEntity(entity: TurnEntity): Turn {
  return {
    seq: entity.seq,
    from: entity.role === "user" ? "you" : "journal",
    text: entity.content,
    at: entity.created_at,
  };
}

/**
 * One event from a running agent.
 *
 * A frame whose type we do not know is dropped rather than rendered, because
 * the runtime may grow event types and a progress panel is not the place to
 * find out.
 */
export type AgentFrame =
  | { kind: "text"; text: string }
  | { kind: "reasoning"; text: string }
  | { kind: "tool"; done: boolean }
  | { kind: "answer"; text: string }
  // The agent writing in the journal beside the conversation, and moving the
  // reader to an entry. Both carry it sealed, the way a page does, so there is
  // one kind of entry in the browser however it arrived.
  | { kind: "entry"; entry: Entry }
  | { kind: "open"; entry: Entry }
  | { kind: "done" };
