/**
 * A birthday as the picker holds it — day, month and an optional year, each
 * still text — and the stored form it stands for: YYYY-MM-DD, MM-DD, or empty.
 * Pure, so the field and its tests agree on what a half-filled picker means.
 */

export interface BirthdayPicks {
  day: string;
  month: string;
  year: string;
}

const MONTHS = 12;
// A leap year, so a birthday with no year can still be on 29 February.
const LEAP_YEAR = 2000;
const STORED = /^(?:(\d{4})-)?(\d{2})-(\d{2})$/u;
const PAD = 2;

export const NO_PICKS: BirthdayPicks = { day: "", month: "", year: "" };

/** The picks a stored birthday is made of. Anything unreadable starts empty. */
export function picksOf(stored: string): BirthdayPicks {
  const match = STORED.exec(stored);

  if (!match) {
    return NO_PICKS;
  }

  return { year: match[1] ?? "", month: String(Number(match[2])), day: String(Number(match[3])) };
}

/**
 * The stored form of the picks. Nothing picked is no birthday; a half-filled
 * picker comes out as something the birthday rule refuses, so it is reported
 * rather than quietly dropped.
 */
export function storedOf(picks: BirthdayPicks): string {
  const { day, month, year } = picks;

  if (day === "" && month === "" && year === "") {
    return "";
  }

  const date = `${month.padStart(PAD, "0")}-${day.padStart(PAD, "0")}`;

  return year === "" ? date : `${year}-${date}`;
}

/** How many days a month has, in the year given or else in a leap year. */
export function daysIn(month: string, year: string): number {
  const inYear = /^\d{4}$/u.test(year) ? Number(year) : LEAP_YEAR;
  const at = Number(month) || 1;

  // Day 0 of the next month is the last day of this one.
  return new Date(Date.UTC(inYear, at, 0)).getUTCDate();
}

/** The months, by name, in the reader's language. */
export function monthNames(locale: string): string[] {
  const format = new Intl.DateTimeFormat(locale, { month: "long", timeZone: "UTC" });

  return Array.from({ length: MONTHS }, (_, at) => format.format(Date.UTC(LEAP_YEAR, at, 1)));
}
