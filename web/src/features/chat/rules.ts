import { isLocale, type Locale } from "@/i18n/config";
import type { ChatAsk } from "./types";

/**
 * Every rule about what a message may be, in one place the composer and the
 * route both call — so the form and the server can never disagree about what is
 * sendable. The agent judges none of it.
 */

export const MAX_MESSAGE_CHARS = 4_000;

// A thread id is minted in the browser with crypto.randomUUID(), so the shape
// is fixed and worth checking: it becomes a key in someone's memory.
const THREAD_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u;

export type MessageProblem = "empty" | "tooLong";

export function messageProblem(message: string): MessageProblem | null {
  const trimmed = message.trim();

  if (trimmed === "") {
    return "empty";
  }

  return trimmed.length > MAX_MESSAGE_CHARS ? "tooLong" : null;
}

function isAsk(value: unknown): value is ChatAsk {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.threadId === "string" &&
    typeof candidate.message === "string" &&
    typeof candidate.locale === "string"
  );
}

/**
 * A posted body, or null when it is not one we would send ourselves.
 *
 * Total: it takes `unknown` because what arrives at a route handler is unknown,
 * whatever the type on the other end claimed.
 */
export function askFrom(value: unknown): ChatAsk | null {
  if (!isAsk(value)) {
    return null;
  }

  if (!THREAD_ID.test(value.threadId) || !isLocale(value.locale)) {
    return null;
  }

  return messageProblem(value.message)
    ? null
    : { threadId: value.threadId, message: value.message.trim(), locale: value.locale as Locale };
}

export function newThreadId(): string {
  return crypto.randomUUID();
}
