/**
 * The month grid behind the day picker.
 *
 * Everything here is UTC, for the same reason days.ts is: a stored date is the
 * day it was written in the writer's zone and is never re-interpreted in
 * anybody else's. A grid built against a local clock puts the first of the
 * month in the wrong cell west of UTC.
 */

const DAYS_IN_WEEK = 7;
const MONTHS_IN_YEAR = 12;
const FIRST_OF_MONTH = 1;
// Intl numbers weekdays 1..7 from Monday; Date numbers them 0..6 from Sunday.
const MONDAY = 1;
const ISO_SUNDAY = 7;
const DAY_CHARS = 10;
const MS_PER_DAY = 86_400_000;
// An arbitrary Monday, used only to walk a week and read its day names off.
const A_MONDAY = Date.parse("2024-01-01T00:00:00Z");

export interface Month {
  year: number;
  /** Zero-based, as Date counts them. */
  month: number;
}

export interface GridDay {
  /** YYYY-MM-DD. */
  date: string;
  /** False for the days either side that fill the first and last weeks. */
  inMonth: boolean;
}

function dayOf(at: number): string {
  return new Date(at).toISOString().slice(0, DAY_CHARS);
}

export function monthOf(date: string): Month {
  const at = new Date(`${date}T00:00:00Z`);
  const settled = Number.isNaN(at.getTime()) ? new Date() : at;

  return { year: settled.getUTCFullYear(), month: settled.getUTCMonth() };
}

export function shiftMonth(month: Month, by: number): Month {
  const moved = month.month + by;

  return {
    year: month.year + Math.floor(moved / MONTHS_IN_YEAR),
    month: ((moved % MONTHS_IN_YEAR) + MONTHS_IN_YEAR) % MONTHS_IN_YEAR,
  };
}

/**
 * Which day a week starts on here. Not every locale starts on Monday, and
 * getWeekInfo is recent enough to be worth falling back from rather than
 * relying on.
 */
function firstWeekday(locale: string): number {
  try {
    const info = (
      new Intl.Locale(locale) as Intl.Locale & { getWeekInfo?: () => { firstDay: number } }
    ).getWeekInfo?.();

    return info?.firstDay ?? MONDAY;
  } catch {
    return MONDAY;
  }
}

/** The month, padded either side into whole weeks. */
export function gridFor(month: Month, locale: string): GridDay[] {
  const first = Date.UTC(month.year, month.month, FIRST_OF_MONTH);
  const weekday = new Date(first).getUTCDay();
  const iso = weekday === 0 ? ISO_SUNDAY : weekday;
  const lead = (iso - firstWeekday(locale) + DAYS_IN_WEEK) % DAYS_IN_WEEK;
  const length = new Date(Date.UTC(month.year, month.month + 1, 0)).getUTCDate();
  const cells = Math.ceil((lead + length) / DAYS_IN_WEEK) * DAYS_IN_WEEK;
  const ret: GridDay[] = [];

  for (let cell = 0; cell < cells; cell += 1) {
    const at = first + (cell - lead) * MS_PER_DAY;
    const date = dayOf(at);

    ret.push({ date, inMonth: new Date(at).getUTCMonth() === month.month });
  }

  return ret;
}

/** "September 2026", in the reader's language. */
export function monthLabel(month: Month, locale: string): string {
  const at = new Date(Date.UTC(month.year, month.month, FIRST_OF_MONTH));

  try {
    return at.toLocaleDateString(locale, { month: "long", year: "numeric", timeZone: "UTC" });
  } catch {
    return `${month.year}-${month.month + FIRST_OF_MONTH}`;
  }
}

/** The single-letter column headings, in the order this locale's weeks run. */
export function weekdayInitials(locale: string): string[] {
  const start = firstWeekday(locale);
  const ret: string[] = [];

  for (let day = 0; day < DAYS_IN_WEEK; day += 1) {
    const at = new Date(A_MONDAY + (start - MONDAY + day) * MS_PER_DAY);

    try {
      ret.push(at.toLocaleDateString(locale, { weekday: "narrow", timeZone: "UTC" }));
    } catch {
      ret.push("");
    }
  }

  return ret;
}
