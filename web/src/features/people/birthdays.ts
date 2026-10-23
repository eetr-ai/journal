import { birthdayParts, proximityRank } from "./rules";
import type { OpenedPerson } from "./types";

/**
 * When a birthday next comes round, counted from the reader's today.
 *
 * Calendar days in UTC on both sides, so no zone and no daylight-saving change
 * moves a birthday onto the wrong day. A 29 February outside a leap year falls
 * on 1 March, which is when Date.UTC puts it.
 */

const MS_PER_DAY = 86_400_000;
const TODAY = /^(\d{4})-(\d{2})-(\d{2})$/u;
// A leap year, so a 29 February with no year still renders as itself.
const LEAP_YEAR = 2000;

/** Days until the next one, 0 for today; null when there is no birthday or no today. */
export function daysUntil(birthday: string, today: string): number | null {
  const parts = birthdayParts(birthday);
  const now = TODAY.exec(today);

  if (!parts || !now) {
    return null;
  }

  const year = Number(now[1]);
  const from = Date.UTC(year, Number(now[2]) - 1, Number(now[3]));
  let next = Date.UTC(year, parts.month - 1, parts.day);

  if (next < from) {
    next = Date.UTC(year + 1, parts.month - 1, parts.day);
  }

  return Math.round((next - from) / MS_PER_DAY);
}

/**
 * What ordering needs: the days to someone's birthday, and how close they are
 * and their name to break ties with. Without a proximity they rank as not known.
 */
export interface Ranked {
  days: number | null;
  person: { name: string; proximity?: string };
}

export interface Placed extends Ranked {
  id: string;
  person: OpenedPerson;
}

/**
 * Soonest birthday first; people with no birthday last. Ties go to the closer
 * person, then by name.
 */
export function soonestFirst(a: Ranked, b: Ranked): number {
  if (a.days !== b.days) {
    if (a.days === null) {
      return 1;
    }

    if (b.days === null) {
      return -1;
    }

    return a.days - b.days;
  }

  const closer = proximityRank(b.person.proximity ?? "") - proximityRank(a.person.proximity ?? "");

  return closer || a.person.name.localeCompare(b.person.name, undefined, { sensitivity: "base" });
}

/** A birthday as a reader says it: "2 November", with the year when it is known. */
export function birthdayIn(birthday: string, locale: string): string {
  const parts = birthdayParts(birthday);

  if (!parts) {
    return birthday;
  }

  const year = bornIn(birthday);
  const at = new Date(Date.UTC(year ?? LEAP_YEAR, parts.month - 1, parts.day));

  try {
    return at.toLocaleDateString(locale, {
      day: "numeric",
      month: "long",
      year: year === null ? undefined : "numeric",
      timeZone: "UTC",
    });
  } catch {
    return birthday;
  }
}

/** The year in a well-formed birthday, or null for MM-DD. */
function bornIn(birthday: string): number | null {
  return birthday.length > "MM-DD".length ? Number(birthday.slice(0, "YYYY".length)) : null;
}

/** A person as far as their birthday needs them opened. */
export type Readable = Pick<OpenedPerson, "name" | "relation" | "birthday">;

/** A birthday on its way. */
export interface Upcoming extends Ranked {
  id: string;
  person: Readable;
  days: number;
  /** The day it falls on, YYYY-MM-DD. */
  on: string;
  /** The age it brings, or null when the year they were born is not known. */
  turns: number | null;
}

function dayAfter(today: string, days: number): string {
  const [year, month, day] = today.split("-").map(Number);

  return new Date(Date.UTC(year, month - 1, day + days))
    .toISOString()
    .slice(0, "YYYY-MM-DD".length);
}

function turning(birthday: string, on: string): number | null {
  const born = bornIn(birthday);
  const age = born === null ? 0 : Number(on.slice(0, "YYYY".length)) - born;

  // A year of birth still to come is a typo, not an age.
  return age > 0 ? age : null;
}

/** The birthdays from today through `within` days on, soonest first. */
export function upcoming(
  people: { id: string; person: Readable }[],
  today: string,
  within: number,
): Upcoming[] {
  const ret: Upcoming[] = [];

  for (const { id, person } of people) {
    const days = daysUntil(person.birthday, today);

    if (days !== null && days <= within) {
      const on = dayAfter(today, days);

      ret.push({ id, person, days, on, turns: turning(person.birthday, on) });
    }
  }

  return ret.toSorted(soonestFirst);
}

/** The day a birthday falls on, as a reader says it: "Sunday, 25 October". */
export function birthdayOn(on: string, locale: string): string {
  const [year, month, day] = on.split("-").map(Number);

  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
}
