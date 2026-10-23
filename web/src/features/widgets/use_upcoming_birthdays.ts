"use client";

import { useEffect, useState } from "react";
import { useAgentKey } from "@/features/chat/use_agent_key";
import { momentFor } from "@/features/chat/now";
import { peopleAction } from "@/features/people/actions";
import { upcoming, type Upcoming } from "@/features/people/birthdays";
import { openForBirthdays } from "@/features/people/open_birthdays";

// Two weeks: near enough to act on, far enough to still have time to.
const WITHIN_DAYS = 14;
const MOST_SHOWN = 5;

/**
 * The birthdays coming up among the reader's people, opened under the key in
 * this browser, counted from their today in their zone.
 *
 * Fetched once the key is there. Empty while nothing is known, and for good
 * when the vault is locked or the people could not be fetched.
 */
export function useUpcomingBirthdays(subject: string, timezone: string): Upcoming[] {
  const key = useAgentKey(subject);
  const [ret, setRet] = useState<Upcoming[]>([]);

  useEffect(() => {
    if (!key) {
      return;
    }

    let abandoned = false;

    async function load(agentKey: string) {
      // A server action that could not be reached rejects rather than answering.
      const sealed = await peopleAction().catch(() => null);

      if (!sealed || abandoned) {
        return;
      }

      const readable = await openForBirthdays(sealed, agentKey);
      const today = momentFor(timezone).date;

      if (!abandoned) {
        setRet(upcoming(readable, today, WITHIN_DAYS).slice(0, MOST_SHOWN));
      }
    }

    void load(key);

    return () => {
      abandoned = true;
    };
  }, [key, timezone]);

  return ret;
}
