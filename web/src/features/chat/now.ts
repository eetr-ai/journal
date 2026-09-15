import type { Now } from "./types";

/**
 * The instant a run starts, as the person reading it would write it down.
 *
 * The clock is the server's and the day is theirs: a browser's clock is a thing
 * a caller controls, and an entry filed under a day it chose would be filed
 * there for good. Only the zone comes from the person, and only because they
 * told us what it was.
 *
 * `en-CA` is not a language choice. It is the locale that formats a date as
 * YYYY-MM-DD, which is what the agent files an entry under and what Postgres
 * takes without being told how to read it.
 */

const DAY = { year: "numeric", month: "2-digit", day: "2-digit" } as const;
const ISO_DAY_LOCALE = "en-CA";

function partsIn(at: Date, timezone: string, shape: Intl.DateTimeFormatOptions): string {
  try {
    return at.toLocaleDateString(ISO_DAY_LOCALE, { ...shape, timeZone: timezone || undefined });
  } catch {
    // An unknown zone falls back to the runtime's rather than failing the run.
    // A note written on the wrong side of midnight is worth more than no note.
    return at.toLocaleDateString(ISO_DAY_LOCALE, shape);
  }
}

export function momentFor(timezone: string, at: Date = new Date()): Now {
  return {
    iso: at.toISOString(),
    date: partsIn(at, timezone, DAY),
    weekday: partsIn(at, timezone, { weekday: "long" }),
    timezone,
  };
}
