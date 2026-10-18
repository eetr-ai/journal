"use client";

import { useEffect, useRef } from "react";
import type { Editor } from "@tiptap/core";
import { changedBlocks, markChanged } from "./extensions/changed";

export interface ChangedBlocksOptions {
  /** The words before a write from elsewhere, until that change has been shown. */
  before?: string;
  /** Whether the editor is holding that write, rather than the reader's own words. */
  holding: boolean;
}

function motion(): ScrollBehavior {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
}

/**
 * Marks the blocks a write from elsewhere changed and brings the first into
 * view, once per write and only once the editor holds it, so words the reader
 * kept over it are never marked as somebody else's.
 */
export function useChangedBlocks(editor: Editor | null, options: ChangedBlocksOptions): void {
  const { before, holding } = options;
  const marked = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!editor || marked.current === before) {
      return;
    }

    if (before === undefined) {
      marked.current = undefined;
      markChanged(editor, []);
      return;
    }

    if (!holding) {
      return;
    }

    const old = editor.schema.nodeFromJSON(editor.markdown?.parse(before) ?? { type: "doc" });
    const at = changedBlocks(editor.state.doc, old);

    marked.current = before;
    markChanged(editor, at);

    const first = at.length > 0 ? editor.view.nodeDOM(at[0]) : null;

    if (first instanceof HTMLElement) {
      first.scrollIntoView({ block: "center", behavior: motion() });
    }
  }, [editor, before, holding]);
}
