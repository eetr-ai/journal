"use client";

import { createContext, type Dispatch } from "react";
import { useContextNullSafe, type ReducerAction } from "@eetr/react-reducer-utils";
import type { Entry, OpenedEntry } from "./types";

/**
 * The journal beside the conversation, which is a managed interaction: it
 * arrives sealed, is opened a beat later, is written into by a stream while
 * somebody is reading it, and is navigated away from and back.
 *
 * Entries are held as they are stored — sealed — and what the key made of them
 * is held beside them under `opened`. Keeping the two apart is what lets a
 * frame land in the list before it has been decrypted, without a component ever
 * being handed ciphertext to render.
 */

export interface EntriesUiState {
  /** Newest first, sealed. */
  entries: Entry[];
  opened: Record<string, OpenedEntry>;
  /** The entry the panel is on. Null means today's, whatever that turns out to be. */
  showing: string | null;
  /** The reader's day, decided on the server where the zone is known. */
  today: string;
}

export enum EntriesActionType {
  Arrived = "arrived",
  Shown = "shown",
  Closed = "closed",
  Opened = "opened",
}

export type EntriesAction = ReducerAction<EntriesActionType>;

export function initialEntriesState(
  entries: Entry[],
  today: string,
  showing: string | null,
): EntriesUiState {
  // Sorted here too, not only as entries arrive. The list a page opens with can
  // carry an entry fetched by id, which has any date at all — and it is put in
  // front of the rest by the fetch, not by being the newest.
  return { entries: byNewest(entries), opened: {}, showing, today };
}

// Newest first, the order the list is kept in and the order the drawer reads.
function byNewest(entries: Entry[]): Entry[] {
  return entries.toSorted((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/**
 * An entry the agent just wrote, folded in.
 *
 * Replaced by id rather than appended, because the running note arrives again
 * every time it grows — and the one already on screen is the same entry, not a
 * previous one worth keeping.
 */
function arrived(state: EntriesUiState, entry: Entry): EntriesUiState {
  const others = state.entries.filter((held) => held.id !== entry.id);
  // What the key made of the old version says nothing about the new one.
  const { [entry.id]: _replaced, ...opened } = state.opened;

  return { ...state, entries: byNewest([...others, entry]), opened };
}

const handlers: Record<
  EntriesActionType,
  (state: EntriesUiState, action: EntriesAction) => EntriesUiState
> = {
  [EntriesActionType.Arrived]: (state, action) => arrived(state, action.data as Entry),

  // The agent moved the reader, or the reader moved themselves. The entry
  // travels with it, because the one being opened may be older than anything
  // the page was rendered with.
  [EntriesActionType.Shown]: (state, action) => {
    const entry = action.data as Entry;

    return { ...arrived(state, entry), showing: entry.id };
  },

  // Back to today — from the reader pressing back, or leaving an old entry.
  [EntriesActionType.Closed]: (state) => ({ ...state, showing: null }),

  [EntriesActionType.Opened]: (state, action) => ({
    ...state,
    opened: {
      ...state.opened,
      ...(action.data as Record<string, OpenedEntry>),
    },
  }),
};

export function entriesReducer(state: EntriesUiState, action: EntriesAction): EntriesUiState {
  return handlers[action.type]?.(state, action) ?? state;
}

export const EntriesStateContext = createContext<EntriesUiState | null>(null);
export const EntriesDispatchContext = createContext<Dispatch<EntriesAction> | null>(null);

export function useEntries() {
  return {
    state: useContextNullSafe(EntriesStateContext),
    dispatch: useContextNullSafe(EntriesDispatchContext),
  };
}

/**
 * What the panel is looking at: what was opened, or else the newest thing
 * written today. A day nobody has written on yet shows nothing, which is the
 * honest answer — the agent fills it in as they talk.
 */
export function entryShowing(state: EntriesUiState): Entry | null {
  if (state.showing) {
    return state.entries.find((entry) => entry.id === state.showing) ?? null;
  }

  return state.entries.find((entry) => entry.date === state.today) ?? null;
}
