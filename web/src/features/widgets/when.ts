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

/**
 * The opening of an entry as plain text. A card is a glimpse, not a rendering:
 * headings, pictures and markup are dropped, and links keep only their words.
 */
export function excerptOf(markdown: string): string {
  const plain = markdown
    .split("\n")
    .filter((line) => !/^\s*#/u.test(line))
    .join(" ")
    .replaceAll(/!\[[^\]]*\]\([^)]*\)/gu, "")
    .replaceAll(/\[([^\]]*)\]\([^)]*\)/gu, "$1")
    .replaceAll(/[*_>`~]/gu, "")
    .replaceAll(/\s+/gu, " ")
    .trim();

  if (plain.length <= EXCERPT_CHARS) {
    return plain;
  }

  const cut = plain.slice(0, EXCERPT_CHARS);

  return `${cut.slice(0, cut.lastIndexOf(" "))}…`;
}
