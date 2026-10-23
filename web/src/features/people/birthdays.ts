import { birthdayParts } from "./rules";
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

export interface Placed {
  id: string;
  person: OpenedPerson;
  days: number | null;
}

/** Soonest birthday first, then by name; people with no birthday last, by name. */
export function soonestFirst(a: Placed, b: Placed): number {
  if (a.days !== b.days) {
    if (a.days === null) {
      return 1;
    }

    if (b.days === null) {
      return -1;
    }

    return a.days - b.days;
  }

  return a.person.name.localeCompare(b.person.name, undefined, { sensitivity: "base" });
}

/** A birthday as a reader says it: "2 November", with the year when it is known. */
export function birthdayIn(birthday: string, locale: string): string {
  const parts = birthdayParts(birthday);

  if (!parts) {
    return birthday;
  }

  const year = birthday.length > "MM-DD".length ? Number(birthday.slice(0, "YYYY".length)) : null;
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
