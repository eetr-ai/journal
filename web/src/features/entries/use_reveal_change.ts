"use client";

import { useEffect, type RefObject } from "react";
import { EntriesActionType, useEntries } from "./entries_state";
import type { TextRange } from "./changes";

/** How long a change stays marked. The fade is drawn over the same span. */
export const HIGHLIGHT_MS = 2400;

function motion(): ScrollBehavior {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
}

/**
 * Brings the first changed block of an entry into view, and lets the change go
 * once it has been marked for long enough. Runs once per write: `changed` is
 * null until the new words have been opened, and again after this lets go.
 */
export function useRevealChange(
  box: RefObject<HTMLElement | null>,
  entryId: string | null,
  changed: TextRange[] | null,
) {
  const { dispatch } = useEntries();

  useEffect(() => {
    if (!entryId || !changed) {
      return;
    }

    box.current
      ?.querySelector("[data-changed]")
      ?.scrollIntoView({ block: "center", behavior: motion() });

    const timer = window.setTimeout(
      () => dispatch({ type: EntriesActionType.Highlighted, data: entryId }),
      HIGHLIGHT_MS,
    );

    return () => window.clearTimeout(timer);
  }, [box, changed, dispatch, entryId]);
}
