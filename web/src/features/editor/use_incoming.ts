"use client";

import { useEffect } from "react";
import type { Entry, OpenedEntry } from "@/features/entries/types";
import { EditorActionType, useEditorState } from "./editor_state";

/**
 * Hands the editor a version of the entry written somewhere else — the agent,
 * or another tab — once it has been opened.
 *
 * Only a version past the one the editor holds counts, so the echo of the
 * editor's own save, which carries that same version, is never mistaken for
 * somebody else's write.
 */
export function useIncoming(entry: Entry, opened: OpenedEntry | undefined): void {
  const { state, dispatch } = useEditorState();
  const held = state.saved.version;

  useEffect(() => {
    if (!opened || entry.version <= held) {
      return;
    }

    dispatch({
      type: EditorActionType.Arrived,
      data: {
        title: opened.title,
        markdown: opened.content,
        icon: opened.icon,
        version: entry.version,
      },
    });
  }, [dispatch, entry.version, held, opened]);
}
