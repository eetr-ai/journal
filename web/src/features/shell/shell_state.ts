"use client";

import { createContext, type Dispatch } from "react";
import { useContextNullSafe, type ReducerAction } from "@eetr/react-reducer-utils";

/**
 * Which of the two side panels is raised over the conversation.
 *
 * This does not know how wide the window is, and must not learn: where both
 * panels are docked the stylesheet ignores these flags entirely, so there is
 * one set of rules for every size and no media query in any of the components
 * that read them.
 *
 * The two are mutually exclusive because each covers the screen where it
 * matters — raising one lowers the other rather than stacking on it.
 */

export interface ShellUiState {
  drawer: boolean;
  entry: boolean;
}

export enum ShellActionType {
  DrawerToggled = "drawerToggled",
  EntryToggled = "entryToggled",
  EntryRaised = "entryRaised",
  Dismissed = "dismissed",
}

export type ShellAction = ReducerAction<ShellActionType>;

export function initialShellState(): ShellUiState {
  return { drawer: false, entry: false };
}

const handlers: Record<ShellActionType, (state: ShellUiState) => ShellUiState> = {
  [ShellActionType.DrawerToggled]: (state) => ({ drawer: !state.drawer, entry: false }),

  [ShellActionType.EntryToggled]: (state) => ({ drawer: false, entry: !state.entry }),

  // Opening an entry from the drawer: the panel that shows it has to come up,
  // and the list that was covering it has to go away.
  [ShellActionType.EntryRaised]: () => ({ drawer: false, entry: true }),

  [ShellActionType.Dismissed]: () => initialShellState(),
};

export function shellReducer(state: ShellUiState, action: ShellAction): ShellUiState {
  return handlers[action.type]?.(state) ?? state;
}

export const ShellStateContext = createContext<ShellUiState | null>(null);
export const ShellDispatchContext = createContext<Dispatch<ShellAction> | null>(null);

export function useShell() {
  return {
    state: useContextNullSafe(ShellStateContext),
    dispatch: useContextNullSafe(ShellDispatchContext),
  };
}
