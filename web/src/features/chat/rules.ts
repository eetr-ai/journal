import { isLocale, type Locale } from "@/i18n/config";
import { isAgentKey } from "@/features/vault/rules";
import type { ChatAsk } from "./types";

/**
 * Every rule about what a message may be, in one place the composer and the
 * route both call — so the form and the server can never disagree about what is
 * sendable. The agent judges none of it.
 */

export const MAX_MESSAGE_CHARS = 4_000;

// Minted in the browser with crypto.randomUUID(), so the shape is fixed and
// worth checking: one of these becomes a key in someone's memory, and the other
// becomes the primary key of a row in their journal.
const MINTED_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u;
const DAY = /^\d{4}-\d{2}-\d{2}$/u;

export type MessageProblem = "empty" | "tooLong";

export function messageProblem(message: string): MessageProblem | null {
  const trimmed = message.trim();

  if (trimmed === "") {
    return "empty";
  }

  return trimmed.length > MAX_MESSAGE_CHARS ? "tooLong" : null;
}

/**
 * The open entry, or nothing. Dropped rather than refused when it is malformed:
 * a bad one means the note goes to the conversation's own entry, which is where
 * it would have gone anyway, and refusing the whole message over it would lose
 * what the person said.
 */
function workingIn(value: Record<string, unknown>): ChatAsk["working"] {
  const working = value.working as { id?: unknown; date?: unknown } | undefined;

  if (typeof working?.id !== "string" || typeof working.date !== "string") {
    return undefined;
  }

  return MINTED_ID.test(working.id) && DAY.test(working.date)
    ? { id: working.id, date: working.date }
    : undefined;
}

function isAsk(value: unknown): value is ChatAsk {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.threadId === "string" &&
    typeof candidate.message === "string" &&
    typeof candidate.locale === "string" &&
    typeof candidate.key === "string"
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

  if (!MINTED_ID.test(value.threadId) || !isLocale(value.locale) || !isAgentKey(value.key)) {
    return null;
  }

  const locale = value.locale as Locale;

  // A stop carries no message, and would be refused for being empty if it were
  // held to the same rule.
  if (value.intent === "stop") {
    return {
      threadId: value.threadId,
      message: "",
      locale,
      key: value.key,
      intent: "stop",
    };
  }

  const working = workingIn(value as unknown as Record<string, unknown>);

  return messageProblem(value.message)
    ? null
    : {
        threadId: value.threadId,
        message: value.message.trim(),
        locale,
        key: value.key,
        intent: "say",
        ...(working ? { working } : {}),
      };
}

export function newThreadId(): string {
  return crypto.randomUUID();
}
