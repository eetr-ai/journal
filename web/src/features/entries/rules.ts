import { isAgentKey } from "@/features/vault/rules";
import { isLocale, type Locale } from "@/i18n/config";

/**
 * Every rule about what may be asked of the journal, in one place the popover
 * and the server action both call — so the field and the server can never
 * disagree about what is askable. The agent judges none of it.
 */

// Long enough for a question in a sentence, short enough that nobody pastes an
// essay into a search box and waits for a model to read it back to them.
export const MAX_QUERY_CHARS = 200;

const DAY = /^\d{4}-\d{2}-\d{2}$/u;

export type QueryProblem = "empty" | "tooLong";

export function queryProblem(query: string): QueryProblem | null {
  const trimmed = query.trim();

  if (trimmed === "") {
    return "empty";
  }

  return trimmed.length > MAX_QUERY_CHARS ? "tooLong" : null;
}

/** A stored day, as the calendar names one. Shape only; any date may be asked for. */
export function isDay(value: string): boolean {
  return DAY.test(value);
}

export interface SearchAsk {
  query: string;
  key: string;
  /**
   * What to write the one-line reason in. Named rather than inferred: a model
   * asked to guess a language from an entry guesses, and answering somebody's
   * question about their own journal in a language they do not read is worse
   * than not answering.
   */
  locale: Locale;
}

/**
 * A search as it may be sent, or null when it is not one we would send
 * ourselves. Total: what arrives at an action is unknown, whatever the type on
 * the calling end claimed.
 */
export function searchFrom(query: string, key: string, locale: string): SearchAsk | null {
  if (queryProblem(query) !== null || !isAgentKey(key) || !isLocale(locale)) {
    return null;
  }

  return { query: query.trim(), key, locale };
}
