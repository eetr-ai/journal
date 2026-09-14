import type { Locale } from "@/i18n/config";

/**
 * What a conversation is, on both sides of the agent boundary.
 *
 * The agent answers in the shape its SQL produced, so the snake_case entities
 * live here beside the domain types and the mappers between them — nothing
 * downstream ever sees a `thread_key`.
 */

/** One turn of the conversation, as it is sent. */
export interface ChatAsk {
  threadId: string;
  message: string;
  locale: Locale;
}

/** Who said it. The agent's roles are the model's; ours are the reader's. */
export type Speaker = "you" | "journal";

export interface Turn {
  seq: number;
  from: Speaker;
  text: string;
}

export interface Conversation {
  id: string;
  title: string;
  turnCount: number;
  lastActivityAt: string;
}

export interface TurnEntity {
  seq: number;
  role: string;
  content: string;
}

export interface ConversationEntity {
  thread_key: string;
  title: string;
  turn_count: number;
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
  | { kind: "tool"; done: boolean }
  | { kind: "answer"; text: string }
  | { kind: "done" };
