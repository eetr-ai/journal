"use client";

import { useEffect, useRef } from "react";
import type { Editor } from "@tiptap/core";
import { Markdown } from "@tiptap/markdown";
import { Placeholder } from "@tiptap/extension-placeholder";
import { ReactNodeViewRenderer as nodeView, useEditor } from "@tiptap/react";
import PictureView from "./components/picture_view";
import VerbatimView from "./components/verbatim_view";
import { LOADED } from "./extensions/guard";
import { entrySchema } from "./schema";
import type { BlockMenu } from "./use_block_menu";
import type { Snapshot } from "./editor_state";

/**
 * The editor itself, holding markdown. It reports every change and takes back
 * whatever the reducer decides the words are now — an undo, a redo, the latest
 * version — without that load reporting itself as typing.
 */

export interface EntryTiptapOptions {
  markdown: string;
  placeholder: string;
  menu: BlockMenu;
  onChange: (editor: Editor) => void;
  onBlur: () => void;
}

function isOpeningMenu(event: KeyboardEvent): boolean {
  return event.ctrlKey && event.code === "Space";
}

export function useEntryTiptap(options: EntryTiptapOptions): Editor | null {
  // The editor is made once; its handlers read whatever was rendered last.
  const latest = useRef(options);
  const made = useRef<Editor | null>(null);

  useEffect(() => {
    latest.current = options;
  });

  return useEditor({
    extensions: [
      ...entrySchema({
        picture: nodeView(PictureView, { as: "span" }),
        verbatim: nodeView(VerbatimView),
      }),
      Markdown,
      Placeholder.configure({ placeholder: options.placeholder }),
    ],
    content: options.markdown,
    contentType: "markdown",
    immediatelyRender: false,
    shouldRerenderOnTransaction: false,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none min-h-40 focus:outline-none prose-headings:font-semibold prose-p:my-2",
      },
      handleKeyDown: (_view, event) => {
        const editor = made.current;

        if (!editor) {
          return false;
        }

        if (latest.current.menu.handleKey(editor, event)) {
          return true;
        }

        if (!isOpeningMenu(event)) {
          return false;
        }

        latest.current.menu.openHere(editor);
        return true;
      },
    },
    onCreate: ({ editor }) => {
      made.current = editor;
    },
    onUpdate: ({ editor }) => {
      latest.current.onChange(editor);
      latest.current.menu.follow(editor);
    },
    onSelectionUpdate: ({ editor }) => latest.current.menu.follow(editor),
    onBlur: () => {
      latest.current.menu.close();
      latest.current.onBlur();
    },
  });
}

/**
 * Loads the reducer's words into the editor whenever they changed from outside
 * it, and puts the caret back where it was in that version.
 */
export function useLoadedWords(editor: Editor | null, present: Snapshot, revision: number): void {
  const words = useRef(present);

  useEffect(() => {
    words.current = present;
  });

  useEffect(() => {
    if (!editor || revision === 0) {
      return;
    }

    const { markdown, selection } = words.current;

    editor
      .chain()
      .setMeta(LOADED, true)
      .setContent(markdown, { contentType: "markdown", emitUpdate: false })
      .run();

    const end = editor.state.doc.content.size;

    editor.commands.setTextSelection({
      from: Math.min(selection.from, end),
      to: Math.min(selection.to, end),
    });
  }, [editor, revision]);
}
