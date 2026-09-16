"use client";

import { useEntries } from "./entries_state";
import type { Entry } from "./types";

/**
 * The entry the reader opened, or nothing when they are on today's.
 *
 * The distinction is the point: today's entry is the conversation's own note,
 * which is what a write reaches anyway, so it is not something the reader
 * chose. Only a deliberate move counts as one.
 */
export function useOpenEntry(): Entry | undefined {
  const { state } = useEntries();

  if (!state.showing) {
    return undefined;
  }

  return state.entries.find((entry) => entry.id === state.showing);
}
