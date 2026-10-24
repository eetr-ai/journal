/**
 * A date as the date picker stores it: YYYY-MM-DD, or MM-DD when the year is
 * not known, or empty. All UTC, so no zone moves a day.
 */

const DAY_CHARS = 10;
const MONTH_DAY_CHARS = 5;
const STORED = /^(?:(\d{4})-)?(\d{2})-(\d{2})$/u;
// A leap year, so a date with no year can still be 29 February.
export const NO_YEAR = 2000;

export interface Picked {
  /** Null when the year is not known. */
  year: number | null;
  /** Zero-based, as Date counts them. */
  month: number;
  day: number;
}

/** The stored date picked apart, or null for empty or unreadable. */
export function pickedOf(value: string): Picked | null {
  const match = STORED.exec(value);

  if (!match) {
    return null;
  }

  return {
    year: match[1] === undefined ? null : Number(match[1]),
    month: Number(match[2]) - 1,
    day: Number(match[3]),
  };
}

/** A day of the grid as stored, with or without its year. */
export function storedFrom(date: string, withYear: boolean): string {
  return withYear ? date.slice(0, DAY_CHARS) : date.slice(DAY_CHARS - MONTH_DAY_CHARS, DAY_CHARS);
}

/** The same day with the year dropped, or given back as `year`. */
export function withYear(value: string, year: number | null): string {
  const picked = pickedOf(value);

  if (!picked) {
    return value;
  }

  const monthDay = storedFrom(isoOf({ ...picked, year: NO_YEAR }), false);

  return year === null ? monthDay : `${year}-${monthDay}`;
}

export function isoOf(picked: Picked): string {
  return new Date(Date.UTC(picked.year ?? NO_YEAR, picked.month, picked.day))
    .toISOString()
    .slice(0, DAY_CHARS);
}

/** "18 de diciembre de 1984", or "18 de diciembre" without a year. */
export function dateIn(value: string, locale: string): string {
  const picked = pickedOf(value);

  if (!picked) {
    return value;
  }

  const at = Date.UTC(picked.year ?? NO_YEAR, picked.month, picked.day);

  return new Date(at).toLocaleDateString(locale, {
    day: "numeric",
    month: "long",
    year: picked.year === null ? undefined : "numeric",
    timeZone: "UTC",
  });
}

/** Today in this browser's zone, YYYY-MM-DD. */
export function localToday(): string {
  const now = new Date();

  return isoOf({ year: now.getFullYear(), month: now.getMonth(), day: now.getDate() });
}
