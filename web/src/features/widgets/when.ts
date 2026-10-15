/**
 * How a memory says when it was written: "last year", "6 months ago", and the
 * day in full. Days are calendar days in the writer's zone, so all the arithmetic
 * is on the date alone, in UTC, where no clock change can move it.
 */

const MONTHS_PER_YEAR = 12;
const MS_PER_DAY = 86_400_000;
const DAYS_PER_WEEK = 7;

function parts(day: string): [number, number, number] {
  const [year, month, date] = day.split("-").map(Number);

  return [year, month, date];
}

/** Whole months from `then` to `today`, counting a month only once its day has come round. */
function monthsBetween(then: string, today: string): number {
  const [y1, m1, d1] = parts(then);
  const [y2, m2, d2] = parts(today);

  return (y2 - y1) * MONTHS_PER_YEAR + (m2 - m1) - (d2 < d1 ? 1 : 0);
}

export function agoText(then: string, today: string, locale: string): string {
  const relative = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const months = monthsBetween(then, today);

  if (months >= MONTHS_PER_YEAR) {
    // Rounded: twenty-three months is two years ago, not last year.
    return relative.format(-Math.round(months / MONTHS_PER_YEAR), "year");
  }

  if (months >= 1) {
    return relative.format(-months, "month");
  }

  const days = Math.round((Date.parse(today) - Date.parse(then)) / MS_PER_DAY);

  // "4 weeks ago" reads as a memory; "29 days ago" reads as a count.
  return days >= DAYS_PER_WEEK
    ? relative.format(-Math.floor(days / DAYS_PER_WEEK), "week")
    : relative.format(-days, "day");
}

/** The day in words: "Monday, October 13, 2025", or without the weekday when `long`. */
export function dayText(day: string, locale: string, style: "full" | "long" = "full"): string {
  const [year, month, date] = parts(day);

  return new Intl.DateTimeFormat(locale, { dateStyle: style, timeZone: "UTC" }).format(
    Date.UTC(year, month - 1, date),
  );
}

// About four lines of a card.
const EXCERPT_CHARS = 280;
// Either side of a search match: enough to read the sentence it sits in.
const AROUND_CHARS = 90;
// Words shorter than this match everywhere and say nothing about the search.
const MIN_TERM_CHARS = 3;

/**
 * An entry as plain text. A card is a glimpse, not a rendering: headings,
 * pictures and markup are dropped, and links keep only their words.
 */
function plainOf(markdown: string): string {
  return markdown
    .split("\n")
    .filter((line) => !/^\s*#/u.test(line))
    .join(" ")
    .replaceAll(/!\[[^\]]*\]\([^)]*\)/gu, "")
    .replaceAll(/\[([^\]]*)\]\([^)]*\)/gu, "$1")
    .replaceAll(/[*_>`~]/gu, "")
    .replaceAll(/\s+/gu, " ")
    .trim();
}

function cutAt(text: string, chars: number): string {
  if (text.length <= chars) {
    return text;
  }

  const cut = text.slice(0, chars);
  const space = cut.lastIndexOf(" ");

  // Text with no space to break at is cut where it stands rather than lost.
  return `${space > 0 ? cut.slice(0, space) : cut}…`;
}

/** The opening of an entry, as plain text. */
export function excerptOf(markdown: string): string {
  return cutAt(plainOf(markdown), EXCERPT_CHARS);
}

export interface Snippet {
  before: string;
  match: string;
  after: string;
}

// Case and accents aside, so "dia" finds "Día".
function folded(text: string): string {
  return text
    .normalize("NFD")
    .replaceAll(/\p{Mn}/gu, "")
    .toLowerCase();
}

/**
 * Where a search landed in an entry: the first word of the query found in it,
 * with a little either side. An entry the agent matched on meaning rather than
 * words has none, and shows its opening instead.
 */
export function snippetOf(markdown: string, query: string): Snippet {
  const plain = plainOf(markdown);
  // Folding keeps one character per character for the text a journal holds,
  // so a position in the folded text is a position in the plain one.
  const haystack = folded(plain);
  const terms = folded(query)
    .split(/\s+/u)
    .filter((term) => term.length >= MIN_TERM_CHARS);
  const at = terms.map((term) => haystack.indexOf(term)).find((index) => index >= 0);

  if (at === undefined || haystack.length !== plain.length) {
    return { before: cutAt(plain, EXCERPT_CHARS), match: "", after: "" };
  }

  const length = terms.find((term) => haystack.indexOf(term) === at)?.length ?? 0;
  const from = Math.max(0, at - AROUND_CHARS);

  return {
    before: `${from > 0 ? "…" : ""}${plain.slice(from, at)}`,
    match: plain.slice(at, at + length),
    after: cutAt(plain.slice(at + length), AROUND_CHARS),
  };
}
