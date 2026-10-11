"use client";

import type { ReducerAction } from "@eetr/react-reducer-utils";
import type { OpenedImage } from "./types";

/**
 * An entry's pictures, which load, open under the key, fail, and load again
 * when the agent keeps another one mid-conversation.
 */

export type ImagesStatus = "idle" | "loading" | "ready" | "failed";

export interface ImagesUiState {
  status: ImagesStatus;
  images: OpenedImage[];
}

export enum ImagesActionType {
  Cleared = "cleared",
  Loading = "loading",
  Opened = "opened",
  Failed = "failed",
}

export type ImagesAction = ReducerAction<ImagesActionType>;

export const INITIAL_IMAGES_STATE: ImagesUiState = { status: "idle", images: [] };

const handlers: Record<
  ImagesActionType,
  (state: ImagesUiState, action: ImagesAction) => ImagesUiState
> = {
  [ImagesActionType.Cleared]: () => INITIAL_IMAGES_STATE,
  // What was on screen stays while the next set loads, so a picture kept
  // mid-conversation does not blank the ones already there.
  [ImagesActionType.Loading]: (state) => ({ ...state, status: "loading" }),
  [ImagesActionType.Opened]: (_state, action) => ({
    status: "ready",
    images: action.data as OpenedImage[],
  }),
  [ImagesActionType.Failed]: (state) => ({ ...state, status: "failed" }),
};

export function imagesReducer(state: ImagesUiState, action: ImagesAction): ImagesUiState {
  return handlers[action.type]?.(state, action) ?? state;
}
