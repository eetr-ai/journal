"use client";

import { createContext, type Dispatch } from "react";
import { useContextNullSafe, type ReducerAction } from "@eetr/react-reducer-utils";
import type { ProfileDraft, ProfileIssues } from "./rules";

/**
 * The settings form is a managed interaction: it edits, submits, is rejected by
 * the server's rules, and has to say which of those it is in. That is what the
 * reducer holds; the fields themselves own nothing.
 */
export interface SettingsState {
  draft: ProfileDraft;
  /** The last draft the server confirmed. What "unsaved changes" compares to. */
  stored: ProfileDraft;
  issues: ProfileIssues;
  status: "idle" | "saving" | "saved" | "failed";
}

export enum SettingsActionType {
  Edit = "edit",
  Submit = "submit",
  Stored = "stored",
  Rejected = "rejected",
  Failed = "failed",
}

export type SettingsAction = ReducerAction<SettingsActionType>;

export interface EditData {
  field: keyof ProfileDraft;
  value: string;
}

export function initialSettingsState(draft: ProfileDraft): SettingsState {
  return { draft, stored: draft, issues: {}, status: "idle" };
}

export function settingsReducer(state: SettingsState, action: SettingsAction): SettingsState {
  switch (action.type) {
    case SettingsActionType.Edit: {
      const { field, value } = action.data as EditData;
      const issues = { ...state.issues };

      // An edit is the answer to whatever the server said about that field, so
      // the message goes as soon as the field changes rather than on re-submit.
      delete issues[field];

      return { ...state, draft: { ...state.draft, [field]: value }, issues, status: "idle" };
    }

    case SettingsActionType.Submit:
      return { ...state, status: "saving", issues: {} };

    case SettingsActionType.Stored: {
      const stored = action.data as ProfileDraft;

      return { draft: stored, stored, issues: {}, status: "saved" };
    }

    case SettingsActionType.Rejected:
      return { ...state, status: "idle", issues: action.data as ProfileIssues };

    case SettingsActionType.Failed:
      return { ...state, status: "failed" };

    default:
      return state;
  }
}

export const SettingsStateContext = createContext<SettingsState | null>(null);
export const SettingsDispatchContext = createContext<Dispatch<SettingsAction> | null>(null);

export function useSettings() {
  return {
    state: useContextNullSafe(SettingsStateContext),
    dispatch: useContextNullSafe(SettingsDispatchContext),
  };
}

export function isDirty(state: SettingsState): boolean {
  return (Object.keys(state.draft) as (keyof ProfileDraft)[]).some(
    (field) => state.draft[field] !== state.stored[field],
  );
}
