"use client";

import { useState } from "react";
import { EntriesActionType, useEntries } from "./entries_state";
import { setBookmarkAction } from "./actions";
import type { Entry } from "./types";

/**
 * Keeping an entry, and letting it go.
 *
 * Optimistic and rolled back on refusal, like throwing one away — but a
 * bookmark changes no words, so the flip is applied in place and the failure
 * simply puts it back. A draft nobody has written into has no row to keep, so
 * it is refused here rather than being sent and 404ing.
 */
export interface Keeping {
  failed: boolean;
  keep: (entry: Entry) => void;
}

export function useKeeping(): Keeping {
  const { dispatch } = useEntries();
  const [failed, setFailed] = useState(false);

  async function flip(entry: Entry) {
    const wanted = !entry.bookmarked;

    setFailed(false);
    dispatch({ type: EntriesActionType.Kept, data: { id: entry.id, bookmarked: wanted } });

    if ((await setBookmarkAction(entry.id, wanted)) === null) {
      dispatch({
        type: EntriesActionType.Kept,
        data: { id: entry.id, bookmarked: entry.bookmarked },
      });
      setFailed(true);
    }
  }

  return { failed, keep: (entry: Entry) => void flip(entry) };
}
