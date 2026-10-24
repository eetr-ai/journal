"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useAgentKey } from "@/features/chat/use_agent_key";
import { peopleAction } from "./actions";
import { openForBirthdays } from "./open_birthdays";
import { openFacts } from "@/features/profile/facts";
import type { Readable } from "./birthdays";

/** Everyone's birthday this browser could open, and the reader's own. */
export interface Birthdays {
  people: { id: string; person: Readable }[];
  /** YYYY-MM-DD, or empty when they have not told us. */
  own: string;
}

const none: Birthdays = { people: [], own: "" };

const BirthdaysContext = createContext<Birthdays>(none);

export interface BirthdaysProviderOptions {
  subject: string;
  /** The profile's facts, still sealed. */
  facts: string;
  children: React.ReactNode;
}

async function openAll(facts: string, key: string): Promise<Birthdays | null> {
  // A server action that could not be reached rejects rather than answering.
  const sealed = await peopleAction().catch(() => null);
  const people = sealed ? await openForBirthdays(sealed, key) : [];
  const own = await openFacts(facts, key);

  return sealed || own ? { people, own: own?.birthday ?? "" } : null;
}

/**
 * Opened once, under the key in this browser, for everything that marks a
 * birthday. Empty while nothing is known, and for good when the vault is locked
 * or nothing could be fetched; for now it is not refreshed until the next load.
 */
export function BirthdaysProvider(options: BirthdaysProviderOptions) {
  const key = useAgentKey(options.subject);
  const [ret, setRet] = useState<Birthdays>(none);

  useEffect(() => {
    if (!key) {
      return;
    }

    let live = true;

    void openAll(options.facts, key).then((opened) => {
      if (live && opened) {
        setRet(opened);
      }
    });

    return () => {
      live = false;
    };
  }, [key, options.facts]);

  return <BirthdaysContext value={ret}>{options.children}</BirthdaysContext>;
}

export function useBirthdays(): Birthdays {
  return useContext(BirthdaysContext);
}
