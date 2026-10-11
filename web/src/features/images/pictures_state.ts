"use client";

import type { ReducerAction } from "@eetr/react-reducer-utils";

/**
 * The pictures dialog: looking at one, asking before throwing one away, the
 * throwing, and saying so when it did not happen.
 */

export interface PicturesUiState {
  /** The picture being looked at, or null for all of them. */
  viewing: string | null;
  /** The picture whose delete is waiting on a second press. */
  confirming: string | null;
  deleting: string | null;
  failed: boolean;
}

export enum PicturesActionType {
  Viewed = "viewed",
  Back = "back",
  Asked = "asked",
  Cancelled = "cancelled",
  Deleting = "deleting",
  Deleted = "deleted",
  Failed = "failed",
}

export type PicturesAction = ReducerAction<PicturesActionType>;

export const INITIAL_PICTURES_STATE: PicturesUiState = {
  viewing: null,
  confirming: null,
  deleting: null,
  failed: false,
};

const handlers: Record<
  PicturesActionType,
  (state: PicturesUiState, action: PicturesAction) => PicturesUiState
> = {
  [PicturesActionType.Viewed]: (state, action) => ({ ...state, viewing: action.data as string }),
  [PicturesActionType.Back]: (state) => ({ ...state, viewing: null }),
  [PicturesActionType.Asked]: (state, action) => ({
    ...state,
    confirming: action.data as string,
    failed: false,
  }),
  [PicturesActionType.Cancelled]: (state) => ({ ...state, confirming: null }),
  [PicturesActionType.Deleting]: (state, action) => ({
    ...state,
    deleting: action.data as string,
    confirming: null,
  }),
  // Back to the grid: the picture being looked at may be the one that went.
  [PicturesActionType.Deleted]: (state) => ({ ...state, deleting: null, viewing: null }),
  [PicturesActionType.Failed]: (state) => ({ ...state, deleting: null, failed: true }),
};

export function picturesReducer(state: PicturesUiState, action: PicturesAction): PicturesUiState {
  return handlers[action.type]?.(state, action) ?? state;
}
