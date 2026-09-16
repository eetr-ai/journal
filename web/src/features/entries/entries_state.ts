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
  /**
   * Every day with something on it, which reaches further back than `entries`
   * does: the list is capped and a journal is not.
   */
  days: string[];
  /**
   * Thrown away in this session. Held because a search result outlives the
   * entry it names: the hits are kept while the panel is closed, and a click on
   * one would otherwise put a deleted day back on screen with its old words.
   */
  discarded: string[];
}

export enum EntriesActionType {
  Arrived = "arrived",
  Shown = "shown",
  Closed = "closed",
  Opened = "opened",
  Removed = "removed",
  Restored = "restored",
  DaysArrived = "daysArrived",
  Drafted = "drafted",
  Kept = "kept",
}

export type EntriesAction = ReducerAction<EntriesActionType>;

export function initialEntriesState(
  entries: Entry[],
  today: string,
  showing: string | null,
  days: string[],
): EntriesUiState {
  // Sorted here too, not only as entries arrive. The list a page opens with can
  // carry an entry fetched by id, which has any date at all — and it is put in
  // front of the rest by the fetch, not by being the newest.
  return { entries: byNewest(entries), opened: {}, showing, today, days, discarded: [] };
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
  // Gone is gone. A frame or a stale search hit naming a thrown-away entry is
  // refused here rather than in each of the places one can arrive from.
  if (state.discarded.includes(entry.id)) {
    return state;
  }

  const others = state.entries.filter((held) => held.id !== entry.id);
  // What the key made of the old version says nothing about the new one.
  const { [entry.id]: _replaced, ...opened } = state.opened;
  // A first entry on a day is a day the calendar has to start marking — this is
  // the agent writing tonight's note as much as it is a delete being undone.
  const days = state.days.includes(entry.date) ? state.days : [entry.date, ...state.days];

  return { ...state, entries: byNewest([...others, entry]), opened, days };
}

/**
 * Thrown away, before the server has said so.
 *
 * Optimistic because the alternative is a row that sits there looking deleted;
 * putting it back is an `Arrived` with the entry that was held, which is why
 * nothing here has to remember it.
 */
function removed(state: EntriesUiState, entry: Entry): EntriesUiState {
  const entries = state.entries.filter((held) => held.id !== entry.id);
  const { [entry.id]: _gone, ...opened } = state.opened;

  // `days` is deliberately left alone. Whether that was the last thing written
  // on its day is not answerable here — the list is capped and the calendar is
  // not — so it is asked for again once the agent has confirmed the removal.
  return {
    ...state,
    entries,
    opened,
    discarded: [...state.discarded, entry.id],
    showing: state.showing === entry.id ? null : state.showing,
  };
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
    const back = arrived(state, entry);

    // Refused by `arrived`, so there is nothing to show. A hit for an entry
    // that is gone leaves the panel where it was rather than pointing it at a
    // day that no longer exists.
    return back === state && state.discarded.includes(entry.id)
      ? state
      : { ...back, showing: entry.id };
  },

  // Back to today — from the reader pressing back, or leaving an old entry.
  [EntriesActionType.Closed]: (state) => ({ ...state, showing: null }),

  [EntriesActionType.Removed]: (state, action) => removed(state, action.data as Entry),

  // The agent refused the removal, so it was never gone. Taking it off the
  // discarded list first is what lets it arrive at all.
  [EntriesActionType.Restored]: (state, action) => {
    const entry = action.data as Entry;
    const kept = { ...state, discarded: state.discarded.filter((id) => id !== entry.id) };

    return { ...arrived(kept, entry), showing: entry.id };
  },

  // The authoritative calendar, which only the agent can work out.
  [EntriesActionType.DaysArrived]: (state, action) => ({
    ...state,
    days: action.data as string[],
  }),

  // An entry the reader started. An ordinary arrival plus being shown, except
  // for the calendar: nothing is stored until the agent writes, so marking the
  // day now would mark it for a draft that may be abandoned and leave a day
  // nobody can open. It is marked when the written entry arrives.
  [EntriesActionType.Drafted]: (state, action) => {
    const draft = action.data as Entry;

    return { ...arrived(state, draft), days: state.days, showing: draft.id };
  },

  // Flipped where it stands, keeping whatever the key has already made of it —
  // an `Arrived` would drop the opened copy and blank the row while it was
  // decrypted again, for a change that touched no words at all.
  [EntriesActionType.Kept]: (state, action) => {
    const { id, bookmarked } = action.data as { id: string; bookmarked: boolean };

    return {
      ...state,
      entries: state.entries.map((held) => (held.id === id ? { ...held, bookmarked } : held)),
    };
  },

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
