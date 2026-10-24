import { isAgentKey } from "@/features/vault/rules";
import { anchoredIn } from "@/features/images/rules";
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

// Entry ids are UUIDs, whoever minted them.
const ENTRY_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u;

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

/** Shape only: whether the entry is this person's is the agent's to answer. */
export function isEntryId(value: unknown): value is string {
  return typeof value === "string" && ENTRY_ID.test(value);
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

// A title is a line; a day is a few pages. Both are room to spare, and both stop
// a runaway paste before it is sealed, embedded and paid for.
export const MAX_TITLE_CHARS = 200;
export const MAX_CONTENT_CHARS = 50_000;
// An emoji can be several code points — a flag, a family, a skin tone — so the
// cap is on graphemes, with a generous ceiling on the code units behind them.
const MAX_ICON_UNITS = 32;
// A pictograph, a flag's regional letters, or a keycap: what makes a grapheme an emoji.
const EMOJI = /\p{Extended_Pictographic}|\p{Regional_Indicator}|\u20E3/u;

/** An entry as the reader saves it by hand. */
export interface EntrySave {
  id: string;
  title: string;
  content: string;
  /** One emoji, or empty for none. */
  icon: string;
  date: string;
  /** The version the reader's copy was opened at; 0 for one never written. */
  version: number;
}

export type SaveProblem = "titleTooLong" | "contentTooLong" | "badIcon" | "pictures";

/** Whether this is an icon: one emoji, joined or flagged or not, or nothing at all. */
export function isIcon(value: string): boolean {
  if (value === "") {
    return true;
  }

  if (value.length > MAX_ICON_UNITS || value.trim() !== value) {
    return false;
  }

  const graphemes = [...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(value)];

  return graphemes.length === 1 && EMOJI.test(value);
}

/**
 * What stops a save, or null. `pictures` is the ids kept with the entry: a save
 * may drop an anchor but never name a picture the entry does not have, because
 * for now pictures are added only through the conversation.
 */
export function saveProblem(
  save: Pick<EntrySave, "title" | "content" | "icon">,
  pictures: ReadonlySet<string>,
): SaveProblem | null {
  if (!isIcon(save.icon)) {
    return "badIcon";
  }

  if (save.title.length > MAX_TITLE_CHARS) {
    return "titleTooLong";
  }

  if (save.content.length > MAX_CONTENT_CHARS) {
    return "contentTooLong";
  }

  return [...anchoredIn(save.content)].every((id) => pictures.has(id)) ? null : "pictures";
}

/** Whether the words name any picture at all, which is what costs a lookup. */
export function namesPictures(content: string): boolean {
  return anchoredIn(content).size > 0;
}

function isVersion(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function isText(value: unknown): value is string {
  return typeof value === "string";
}

/**
 * A save as it may be sent, or null when its shape is not one we would send
 * ourselves. Total, like `searchFrom`: what arrives at an action is unknown.
 */
export function saveFrom(value: unknown, key: string): EntrySave | null {
  const save = value as Partial<EntrySave> | null;

  if (!save || !isAgentKey(key) || !isEntryId(save.id) || !isVersion(save.version)) {
    return null;
  }

  if (!isText(save.title) || !isText(save.content) || !isText(save.date) || !isDay(save.date)) {
    return null;
  }

  return {
    id: save.id,
    title: save.title,
    content: save.content,
    icon: isText(save.icon) ? save.icon : "",
    date: save.date,
    version: save.version,
  };
}
