"use client";

import { createContext, type Dispatch } from "react";
import { useContextNullSafe, type ReducerAction } from "@eetr/react-reducer-utils";
import type { SearchHit } from "./types";

/**
 * The search over the journal, which is a managed interaction: it opens, it
 * waits on a model reading a shortlist, it fails, and it is asked again while
 * the last answer is still on screen.
 *
 * Kept apart from the entries reducer because the two answer different
 * questions — that one holds what the journal is, this one holds what was asked
 * of it — and an answer that is still arriving must not make the drawer
 * flicker.
 *
 * Whether the panel is showing is not here: the bar owns that, and an answer
 * outlives the panel being closed so that reopening finds it.
 */

export interface SearchUiState {
  /** What is in the field, which is not what was asked until it is sent. */
  query: string;
  /** What was asked, so a result can say what it answered. */
  asked: string;
  status: "idle" | "searching" | "answered" | "failed";
  hits: SearchHit[];
}

export enum SearchActionType {
  Typed = "typed",
  Asked = "asked",
  Answered = "answered",
  Failed = "failed",
}

export type SearchAction = ReducerAction<SearchActionType>;

export function initialSearchState(): SearchUiState {
  return { query: "", asked: "", status: "idle", hits: [] };
}

const handlers: Record<
  SearchActionType,
  (state: SearchUiState, action: SearchAction) => SearchUiState
> = {
  [SearchActionType.Typed]: (state, action) => ({ ...state, query: action.data as string }),

  // The last answer stays on screen while the next one is being worked out:
  // emptying the list here would blank the panel for as long as a model takes.
  [SearchActionType.Asked]: (state, action) => ({
    ...state,
    asked: action.data as string,
    status: "searching",
  }),

  [SearchActionType.Answered]: (state, action) => ({
    ...state,
    status: "answered",
    hits: action.data as SearchHit[],
  }),

  [SearchActionType.Failed]: (state) => ({ ...state, status: "failed", hits: [] }),
};

export function searchReducer(state: SearchUiState, action: SearchAction): SearchUiState {
  return handlers[action.type]?.(state, action) ?? state;
}

export const SearchStateContext = createContext<SearchUiState | null>(null);
export const SearchDispatchContext = createContext<Dispatch<SearchAction> | null>(null);

export function useSearch() {
  return {
    state: useContextNullSafe(SearchStateContext),
    dispatch: useContextNullSafe(SearchDispatchContext),
  };
}
