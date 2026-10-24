"use client";

import { useMemo } from "react";
import { momentFor } from "@/features/chat/now";
import { useBirthdays } from "@/features/people/birthdays_provider";
import { upcoming, type Upcoming } from "@/features/people/birthdays";

// Two weeks: near enough to act on, far enough to still have time to.
const WITHIN_DAYS = 14;
const MOST_SHOWN = 5;

/** Who the reader's own birthday is listed as, beside their people. */
export const OWN_BIRTHDAY_ID = "own";

/**
 * The birthdays coming up among the reader's people, their own included,
 * counted from their today in their zone. Empty while nothing is known.
 */
export function useUpcomingBirthdays(timezone: string, you: string): Upcoming[] {
  const { people, own } = useBirthdays();

  return useMemo(() => {
    const everyone = own
      ? [...people, { id: OWN_BIRTHDAY_ID, person: { name: you, relation: "", birthday: own } }]
      : people;

    return upcoming(everyone, momentFor(timezone).date, WITHIN_DAYS).slice(0, MOST_SHOWN);
  }, [people, own, timezone, you]);
}
