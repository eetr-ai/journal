"use client";

import { useEffect } from "react";
import { EntriesActionType, needsTodayDraft, useEntries } from "./entries_state";
import { draftEntry } from "./types";

/**
 * Keeps a page out for today whenever today has nothing on it, so the panel is
 * somewhere to write rather than a notice. Nothing is stored until it has words.
 */
export function useTodayDraft() {
  const { state, dispatch } = useEntries();
  const needed = needsTodayDraft(state);

  useEffect(() => {
    if (needed) {
      dispatch({ type: EntriesActionType.TodayDrafted, data: draftEntry(state.today) });
    }
  }, [needed, dispatch, state.today]);
}
