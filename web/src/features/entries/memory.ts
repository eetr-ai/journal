/**
 * Which day to bring back: one written around this time some months or years
 * ago, at random. Days only, so this runs where the calendar already is and
 * nothing sealed has to be read to choose.
 *
 * Months back are tried as windows either side of the anniversary. A journal
 * too young for any of them falls back to anything old enough to be a memory,
 * and a younger one than that has none to give.
 */

const QUARTER = 3;
const HALF_YEAR = 6;
const YEAR = 12;
const YEARS_BACK = 5;
/** How far back a memory may sit: a season, half a year, then each year for five. */
const MONTHS_BACK = [
  QUARTER,
  HALF_YEAR,
  ...Array.from({ length: YEARS_BACK }, (_, at) => (at + 1) * YEAR),
];
// Either side of the anniversary, so a memory is "around then" rather than
// only ever the exact date, which most days are not.
const SPREAD_DAYS = 15;
// Younger than this is last week, not a memory.
const OLDEST_RECENT_DAYS = 60;
const MS_PER_DAY = 86_400_000;

function dayNumber(day: string): number {
  return Math.floor(Date.parse(`${day}T00:00:00Z`) / MS_PER_DAY);
}

// Clamped to the target month's last day: three months before May 31 is the end
// of February, not the March 3rd that rolling the month alone would give.
function monthsBefore(day: string, months: number): number {
  const [year, month, date] = day.split("-").map(Number);
  // Day 0 of the month after is the last day of the target month.
  const last = new Date(Date.UTC(year, month - months, 0)).getUTCDate();

  return Math.floor(Date.UTC(year, month - 1 - months, Math.min(date, last)) / MS_PER_DAY);
}

/** Days written near one of the anniversaries, oldest window last. */
export function memoryDays(days: string[], today: string): string[] {
  const near = days.filter((day) =>
    MONTHS_BACK.some(
      (months) => Math.abs(dayNumber(day) - monthsBefore(today, months)) <= SPREAD_DAYS,
    ),
  );

  if (near.length > 0) {
    return near;
  }

  return days.filter((day) => dayNumber(today) - dayNumber(day) >= OLDEST_RECENT_DAYS);
}

/**
 * One of `candidates`, avoiding `shown` while there is anything else to pick,
 * so asking for another memory is never answered with the same one.
 */
export function pickOne<T>(candidates: T[], shown: (candidate: T) => boolean): T | null {
  const fresh = candidates.filter((candidate) => !shown(candidate));
  const pool = fresh.length > 0 ? fresh : candidates;

  return pool.length > 0 ? pool[Math.floor(Math.random() * pool.length)] : null;
}
