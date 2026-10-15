"use client";

import { useEffect, useState } from "react";
import MemoryWidget from "./memory_widget";
import { memoryAction } from "@/features/entries/actions";
import type { Entry } from "@/features/entries/types";
import type { Dictionary } from "@/i18n/en";
import type { Locale } from "@/i18n/config";

export interface MemoryLandingOptions {
  t: Dictionary;
  locale: Locale;
}

/**
 * Something from months or years back, for a conversation that has not started.
 *
 * Asked for once the page is up rather than rendered with it: it is an
 * invitation, not the page, and a journal too young to have one shows nothing.
 */
export default function MemoryLanding(options: MemoryLandingOptions) {
  const [memory, setMemory] = useState<Entry | null>(null);

  useEffect(() => {
    let abandoned = false;

    // A memory that could not be fetched is no memory: the landing is an
    // invitation, and the conversation works without it.
    void memoryAction().then(
      (first) => {
        if (!abandoned && first) {
          setMemory(first);
        }
      },
      () => {},
    );

    return () => {
      abandoned = true;
    };
  }, []);

  // A failed ask leaves the memory on screen where it was.
  async function another(shown: string) {
    const next = await memoryAction(shown).catch(() => null);

    if (next) {
      setMemory(next);
    }
  }

  if (!memory) {
    return null;
  }

  return (
    <MemoryWidget
      id={memory.id}
      known={memory}
      locale={options.locale}
      onAnother={() => void another(memory.id)}
      t={options.t}
    />
  );
}
