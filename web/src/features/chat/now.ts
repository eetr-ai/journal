import type { Now } from "./types";

/**
 * The moment a run starts, as the person reading it would say it.
 *
 * Every field is in their zone, deliberately. A UTC instant is the one thing
 * that must not travel: a model handed one reasons in it, and tells somebody
 * having breakfast that the afternoon is getting on.
 *
 * The clock is the server's and the zone is theirs. A browser's clock is a
 * thing a caller controls, and an entry filed under a day it chose would be
 * filed there for good.
 *
 * `en-CA` is not a language choice. It is the locale that renders a date as
 * YYYY-MM-DD and a time as HH:MM, which is what Postgres reads without being
 * told how and what no reader can mistake for half past seven in the evening.
 * The words are translated by whoever is speaking to the person, not here.
 */

const DAY = { year: "numeric", month: "2-digit", day: "2-digit" } as const;
const CLOCK = { hour: "2-digit", minute: "2-digit", hour12: false } as const;
const MACHINE_READABLE = "en-CA";

function inZone(at: Date, timezone: string, render: (zone?: string) => string): string {
  try {
    return render(timezone || undefined);
  } catch {
    // An unknown zone falls back to the runtime's rather than failing the run.
    // A note written on the wrong side of midnight is worth more than no note.
    return render(undefined);
  }
}

export function momentFor(timezone: string, at: Date = new Date()): Now {
  const day = (shape: Intl.DateTimeFormatOptions) => (zone?: string) =>
    at.toLocaleDateString(MACHINE_READABLE, { ...shape, timeZone: zone });

  return {
    date: inZone(at, timezone, day(DAY)),
    weekday: inZone(at, timezone, day({ weekday: "long" })),
    time: inZone(at, timezone, (zone) =>
      at.toLocaleTimeString(MACHINE_READABLE, { ...CLOCK, timeZone: zone }),
    ),
    timezone,
  };
}
