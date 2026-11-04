"use client";

import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from "react";
import type { Editor } from "@tiptap/core";
import { VERBATIM } from "./extensions/verbatim";

/**
 * Where something outside the editor can put a card into the entry being
 * written: the editor on screen registers itself, and a caller hands it the
 * card's markdown. What lands goes through the editor like typing, so it is
 * saved, undone and reconciled like anything else written by hand.
 *
 * A registry rather than state: nothing renders from it, and one editor is
 * mounted at a time, so the last to register is the one written into.
 */

type Place = (source: string) => void;

export interface EntryInserts {
  /** Puts a card at the end of the entry; false when no editor is there to take it. */
  insert: (source: string) => boolean;
  register: (place: Place) => () => void;
}

const EntryInsertsContext = createContext<EntryInserts | null>(null);

export function EntryInsertsProvider(options: { children: ReactNode }) {
  const current = useRef<Place | null>(null);
  const value = useMemo<EntryInserts>(
    () => ({
      insert: (source) => {
        current.current?.(source);

        return current.current !== null;
      },
      register: (place) => {
        current.current = place;

        return () => {
          if (current.current === place) {
            current.current = null;
          }
        };
      },
    }),
    [],
  );

  return <EntryInsertsContext value={value}>{options.children}</EntryInsertsContext>;
}

/** Null outside the provider, where nothing can be written into directly. */
export function useEntryInserts(): EntryInserts | null {
  return useContext(EntryInsertsContext);
}

/**
 * Offers this editor as the place cards go. The caret and the focus stay where
 * they were: whoever asked is somewhere else on the page.
 */
export function useInsertTarget(editor: Editor | null): void {
  const inserts = useEntryInserts();

  useEffect(() => {
    if (!editor || !inserts) {
      return;
    }

    return inserts.register((source) => {
      editor
        .chain()
        .insertContentAt(editor.state.doc.content.size, { type: VERBATIM, attrs: { source } })
        .run();
    });
  }, [editor, inserts]);
}
