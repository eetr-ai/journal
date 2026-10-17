"use client";

import { useEffect, type RefObject } from "react";
import { EditorActionType, useEditorState } from "./editor_state";

/**
 * Save, undo and redo, wherever in the entry the caret is — the title or the
 * words. Undo is the reducer's, so the browser's own is kept out of it.
 */

type Shortcut = "save" | "undo" | "redo";

const KEYS: Record<string, Shortcut> = { s: "save", y: "redo" };

function shortcutOf(event: KeyboardEvent): Shortcut | null {
  if (!(event.metaKey || event.ctrlKey) || event.altKey) {
    return null;
  }

  const key = event.key.toLowerCase();

  if (key === "z") {
    return event.shiftKey ? "redo" : "undo";
  }

  return KEYS[key] ?? null;
}

export function useShortcuts(box: RefObject<HTMLElement | null>, flush: () => void): void {
  const { dispatch } = useEditorState();

  useEffect(() => {
    const element = box.current;

    if (!element) {
      return;
    }

    const pressed = (event: KeyboardEvent) => {
      const shortcut = shortcutOf(event);

      if (!shortcut) {
        return;
      }

      event.preventDefault();

      if (shortcut === "save") {
        flush();
        return;
      }

      dispatch({ type: shortcut === "undo" ? EditorActionType.Undone : EditorActionType.Redone });
    };

    element.addEventListener("keydown", pressed);

    return () => element.removeEventListener("keydown", pressed);
  }, [box, dispatch, flush]);
}
