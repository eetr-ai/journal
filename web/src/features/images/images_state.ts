"use client";

import type { ReducerAction } from "@eetr/react-reducer-utils";
import type { OpenedImage } from "./types";

/**
 * An entry's pictures, which load, open under the key, fail, and load again
 * when the agent keeps another one mid-conversation.
 */

export type ImagesStatus = "idle" | "loading" | "ready" | "failed";

export interface ImagesUiState {
  /** The entry `images` belong to. */
  entryId: string | null;
  status: ImagesStatus;
  images: OpenedImage[];
}

export enum ImagesActionType {
  Cleared = "cleared",
  Loading = "loading",
  Opened = "opened",
  Failed = "failed",
  Removed = "removed",
  Added = "added",
}

export type ImagesAction = ReducerAction<ImagesActionType>;

export const INITIAL_IMAGES_STATE: ImagesUiState = { entryId: null, status: "idle", images: [] };

const handlers: Record<
  ImagesActionType,
  (state: ImagesUiState, action: ImagesAction) => ImagesUiState
> = {
  [ImagesActionType.Cleared]: () => INITIAL_IMAGES_STATE,
  // The same entry's pictures stay on screen while the next set loads, so a
  // picture kept mid-conversation does not blank the ones already there. Another
  // entry's never do.
  [ImagesActionType.Loading]: (state, action) =>
    state.entryId === action.data
      ? { ...state, status: "loading" }
      : { entryId: action.data as string, status: "loading", images: [] },
  [ImagesActionType.Opened]: (state, action) => ({
    ...state,
    status: "ready",
    images: action.data as OpenedImage[],
  }),
  [ImagesActionType.Failed]: (state) => ({ ...state, status: "failed" }),
  // One the reader just stored, already opened: put last, where its ordinal is.
  [ImagesActionType.Added]: (state, action) => ({
    ...state,
    images: [...state.images, action.data as OpenedImage],
  }),
  [ImagesActionType.Removed]: (state, action) => ({
    ...state,
    images: state.images.filter((image) => image.id !== action.data),
  }),
};

export function imagesReducer(state: ImagesUiState, action: ImagesAction): ImagesUiState {
  return handlers[action.type]?.(state, action) ?? state;
}
