"use client";

import { useEffect, useState } from "react";
import { readEntryAction } from "@/features/entries/actions";
import { EntriesActionType, useEntries } from "@/features/entries/entries_state";
import type { Entry, OpenedEntry } from "@/features/entries/types";

export interface HeldEntry {
  entry?: Entry;
  /** What the key made of it, once it has been through. */
  opened?: OpenedEntry;
  /** Not this person's, or thrown away: there is nothing to show. */
  missing: boolean;
  /** The journal could not be reached. Not the same as gone: it may be there. */
  failed: boolean;
}

/**
 * An entry a widget names, brought into the journal beside the conversation.
 *
 * It joins the same list the drawer and the panel read, so it is opened by the
 * same key on the same path as every other entry, and opening it from a card
 * is the ordinary way of opening one. `known` is the entry when the caller
 * already has it; otherwise it is fetched, sealed, by id.
 *
 * Only an entry the list does not hold is added: one already there is left
 * alone, because adding it again reads as the agent having rewritten it.
 */
export function useHeldEntry(id: string, known?: Entry): HeldEntry {
  const { state, dispatch } = useEntries();
  const [gone, setGone] = useState(false);
  const [failed, setFailed] = useState(false);
  const entry = state.entries.find((held) => held.id === id);
  const held = entry !== undefined;
  const discarded = state.discarded.includes(id);

  useEffect(() => {
    if (held || discarded) {
      return;
    }

    if (known?.id === id) {
      dispatch({ type: EntriesActionType.Arrived, data: known });

      return;
    }

    let abandoned = false;

    void readEntryAction(id).then(
      (read) => {
        if (abandoned) {
          return;
        }

        if (read) {
          dispatch({ type: EntriesActionType.Arrived, data: read });
        } else {
          setGone(true);
        }
      },
      () => {
        if (!abandoned) {
          setFailed(true);
        }
      },
    );

    return () => {
      abandoned = true;
    };
  }, [discarded, dispatch, held, id, known]);

  // A read that failed says nothing once the entry has arrived some other way,
  // as the agent writing into it or the drawer loading it.
  return {
    entry,
    opened: state.opened[id],
    missing: gone || discarded,
    failed: failed && !held,
  };
}
