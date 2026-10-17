"use client";

import { useCallback, useEffect, useReducer } from "react";
import { openSealed } from "@/features/chat/sealed";
import { useAgentKey } from "@/features/chat/use_agent_key";
import { entryImagesAction } from "./actions";
import {
  ImagesActionType,
  INITIAL_IMAGES_STATE,
  imagesReducer,
  type ImagesUiState,
} from "./images_state";
import { isAcceptedType } from "./rules";
import type { EntryImage, OpenedImage } from "./types";

/**
 * An entry's pictures, fetched sealed and opened here under the key.
 *
 * The key never leaves the browser for this: the server hands back ciphertext
 * and has nothing to open it with. A picture the key will not open, or that
 * claims a type we never store, comes back with no `src` and is shown as a gap.
 */
async function openOne(image: EntryImage, key: string): Promise<OpenedImage> {
  const data = await openSealed(image.data, key);
  const caption = (await openSealed(image.caption, key)) ?? "";

  return {
    id: image.id,
    src: data && isAcceptedType(image.mimeType) ? `data:${image.mimeType};base64,${data}` : null,
    caption,
  };
}

export interface EntryImagesOptions {
  subject: string;
  /** The entry on screen, or null when there is nothing to show pictures for. */
  entryId: string | null;
  /** Bumped when the agent keeps a picture with this entry. */
  revision: number;
}

export interface EntryImages extends ImagesUiState {
  /** Takes a picture off the panel once the server has thrown it away. */
  removed: (id: string) => void;
  /** Puts a picture the reader just stored on the panel, without fetching them all again. */
  added: (image: OpenedImage) => void;
}

export function useEntryImages(options: EntryImagesOptions): EntryImages {
  const [state, dispatch] = useReducer(imagesReducer, INITIAL_IMAGES_STATE);
  const agentKey = useAgentKey(options.subject);
  const { entryId, revision } = options;

  useEffect(() => {
    if (!entryId || !agentKey) {
      dispatch({ type: ImagesActionType.Cleared });

      return;
    }

    let abandoned = false;

    async function load(id: string, key: string) {
      dispatch({ type: ImagesActionType.Loading, data: id });
      // A server action that could not be reached rejects rather than answering.
      const outcome = await entryImagesAction(id).catch(() => ({ kind: "failed" }) as const);

      // The panel may have moved to another entry while this was loading.
      if (abandoned) {
        return;
      }

      if (outcome.kind === "failed") {
        dispatch({ type: ImagesActionType.Failed });

        return;
      }

      const opened = await Promise.all(outcome.images.map((image) => openOne(image, key)));

      if (!abandoned) {
        dispatch({ type: ImagesActionType.Opened, data: opened });
      }
    }

    void load(entryId, agentKey);

    return () => {
      abandoned = true;
    };
  }, [agentKey, entryId, revision]);

  const removed = useCallback(
    (id: string) => dispatch({ type: ImagesActionType.Removed, data: id }),
    [],
  );

  const added = useCallback(
    (image: OpenedImage) => dispatch({ type: ImagesActionType.Added, data: image }),
    [],
  );

  return { ...state, removed, added };
}
