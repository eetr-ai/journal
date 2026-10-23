"use client";

import { createContext, type Dispatch } from "react";
import { useContextNullSafe, type ReducerAction } from "@eetr/react-reducer-utils";
import type { OpenedFact, OpenedPerson, Person } from "./types";

/**
 * The people page: a list that arrives sealed and opens under the key, one
 * person whose facts load, open and fail, and writes that land or are refused.
 */

/** What `selected` holds while someone new is being written down. */
export const NEW_PERSON = "new";

export type FactsStatus = "idle" | "loading" | "ready" | "failed";

export interface PeopleUiState {
  /** As stored, sealed. */
  people: Person[];
  /** By id, once the key has opened them. */
  opened: Record<string, OpenedPerson>;
  /** A person's id, NEW_PERSON, or null for the list. */
  selected: string | null;
  facts: { personId: string | null; status: FactsStatus; items: OpenedFact[] };
}

export enum PeopleActionType {
  Opened = "opened",
  Select = "select",
  FactsLoading = "factsLoading",
  FactsOpened = "factsOpened",
  FactsFailed = "factsFailed",
  Saved = "saved",
  Removed = "removed",
  FactAdded = "factAdded",
  FactRemoved = "factRemoved",
}

export type PeopleAction = ReducerAction<PeopleActionType>;

export interface SavedData {
  person: Person;
  opened: OpenedPerson;
}

const NO_FACTS: PeopleUiState["facts"] = { personId: null, status: "idle", items: [] };

export function initialPeopleState(people: Person[]): PeopleUiState {
  return { people, opened: {}, selected: null, facts: NO_FACTS };
}

function saved(state: PeopleUiState, data: SavedData): PeopleUiState {
  const known = state.people.some((person) => person.id === data.person.id);

  return {
    ...state,
    people: known
      ? state.people.map((person) => (person.id === data.person.id ? data.person : person))
      : [...state.people, data.person],
    opened: { ...state.opened, [data.person.id]: data.opened },
    selected: data.person.id,
  };
}

const handlers: Record<
  PeopleActionType,
  (state: PeopleUiState, action: PeopleAction) => PeopleUiState
> = {
  [PeopleActionType.Opened]: (state, action) => ({
    ...state,
    opened: { ...state.opened, ...(action.data as Record<string, OpenedPerson>) },
  }),
  [PeopleActionType.Select]: (state, action) => ({ ...state, selected: action.data as string }),
  // Another person's facts never stay on screen while the next ones load.
  [PeopleActionType.FactsLoading]: (state, action) => ({
    ...state,
    facts: { personId: action.data as string, status: "loading", items: [] },
  }),
  [PeopleActionType.FactsOpened]: (state, action) => ({
    ...state,
    facts: { ...state.facts, status: "ready", items: action.data as OpenedFact[] },
  }),
  [PeopleActionType.FactsFailed]: (state) => ({
    ...state,
    facts: { ...state.facts, status: "failed" },
  }),
  [PeopleActionType.Saved]: (state, action) => saved(state, action.data as SavedData),
  [PeopleActionType.Removed]: (state, action) => ({
    ...state,
    people: state.people.filter((person) => person.id !== action.data),
    selected: null,
    facts: NO_FACTS,
  }),
  [PeopleActionType.FactAdded]: (state, action) => ({
    ...state,
    facts: { ...state.facts, items: [...state.facts.items, action.data as OpenedFact] },
  }),
  [PeopleActionType.FactRemoved]: (state, action) => ({
    ...state,
    facts: {
      ...state.facts,
      items: state.facts.items.filter((fact) => fact.id !== action.data),
    },
  }),
};

export function peopleReducer(state: PeopleUiState, action: PeopleAction): PeopleUiState {
  return handlers[action.type]?.(state, action) ?? state;
}

export const PeopleStateContext = createContext<PeopleUiState | null>(null);
export const PeopleDispatchContext = createContext<Dispatch<PeopleAction> | null>(null);

export function usePeople() {
  return {
    state: useContextNullSafe(PeopleStateContext),
    dispatch: useContextNullSafe(PeopleDispatchContext),
  };
}
