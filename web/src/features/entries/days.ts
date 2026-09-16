/**
 * A stored day, as a person reads it.
 *
 * An entry's date is the day it was written in the writer's zone, already
 * settled — so it is rendered as that day and not re-interpreted in anybody
 * else's. Parsing "2026-09-15" with a local clock and formatting it in a zone
 * west of UTC shows the fourteenth, which is how a journal starts disagreeing
 * with itself about when things happened.
 *
 * Best-effort: an odd locale falls back rather than throwing, since a date is
 * never worth failing a page over.
 */

const SHAPE = { weekday: "long", day: "numeric", month: "long" } as const;
const AS_STORED = "UTC";

export function dayIn(date: string, locale: string): string {
  const at = new Date(`${date}T00:00:00Z`);

  if (Number.isNaN(at.getTime())) {
    return date;
  }

  try {
    return at.toLocaleDateString(locale, { ...SHAPE, timeZone: AS_STORED });
  } catch {
    return date;
  }
}

/** The same day, short enough for a drawer row. */
export function shortDayIn(date: string, locale: string): string {
  const at = new Date(`${date}T00:00:00Z`);

  if (Number.isNaN(at.getTime())) {
    return date;
  }

  try {
    return at.toLocaleDateString(locale, {
      day: "numeric",
      month: "short",
      timeZone: AS_STORED,
    });
  } catch {
    return date;
  }
}
