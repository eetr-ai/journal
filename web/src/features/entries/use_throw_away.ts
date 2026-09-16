"use client";

import { useState } from "react";
import { EntriesActionType, useEntries } from "./entries_state";
import { deleteEntryAction } from "./actions";
import type { Entry } from "./types";

/**
 * Throwing an entry away, question and all.
 *
 * Optimistic, and undone by hand when the agent refuses: the row leaves the
 * drawer the moment it is confirmed, because a row sitting there looking
 * deleted is worse than one that comes back. Putting it back is an ordinary
 * arrival, so nothing here has to remember what was removed beyond the call.
 */
export interface ThrowAway {
  asking: boolean;
  failed: boolean;
  ask: () => void;
  cancel: () => void;
  confirm: (going: Entry) => void;
}

export function useThrowAway(): ThrowAway {
  const { dispatch } = useEntries();
  const [asking, setAsking] = useState(false);
  const [failed, setFailed] = useState(false);

  async function throwAway(going: Entry) {
    setAsking(false);
    setFailed(false);
    dispatch({ type: EntriesActionType.Removed, data: going });

    if ((await deleteEntryAction(going.id)) === "failed") {
      dispatch({ type: EntriesActionType.Shown, data: going });
      setFailed(true);
    }
  }

  return {
    asking,
    failed,
    ask: () => setAsking(true),
    cancel: () => setAsking(false),
    confirm: (going: Entry) => void throwAway(going),
  };
}
