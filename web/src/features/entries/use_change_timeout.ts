"use client";

import { useEffect } from "react";
import { EntriesActionType, useEntries } from "./entries_state";

/** How long a change stays marked. The fade is drawn over the same span. */
export const HIGHLIGHT_MS = 2400;

/**
 * Lets the agent's last write to an entry go once it has been marked for long
 * enough. Runs once per write: `pending` is false until the new words have been
 * opened, and again after this lets go.
 */
export function useChangeTimeout(entryId: string | null, pending: boolean) {
  const { dispatch } = useEntries();

  useEffect(() => {
    if (!entryId || !pending) {
      return;
    }

    const timer = window.setTimeout(
      () => dispatch({ type: EntriesActionType.Highlighted, data: entryId }),
      HIGHLIGHT_MS,
    );

    return () => window.clearTimeout(timer);
  }, [dispatch, entryId, pending]);
}
