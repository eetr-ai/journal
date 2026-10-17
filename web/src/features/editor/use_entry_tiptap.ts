"use client";

import { useEffect, useRef } from "react";
import type { Editor } from "@tiptap/core";
import { Markdown } from "@tiptap/markdown";
import type { EditorView } from "@tiptap/pm/view";
import { Placeholder } from "@tiptap/extension-placeholder";
import { ReactNodeViewRenderer as nodeView, useEditor } from "@tiptap/react";
import PictureSlotView from "./components/picture_slot_view";
import PictureView from "./components/picture_view";
import SearchSlotView from "./components/search_slot_view";
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
  /** Pictures pasted or dropped into the words, and where they landed. */
  onPictures: (editor: Editor, files: File[], at: number) => void;
}

function isOpeningMenu(event: KeyboardEvent): boolean {
  return event.ctrlKey && event.code === "Space";
}

// Pictures in a paste or a drop, which the guard would otherwise swallow.
function picturesIn(transfer: DataTransfer | null | undefined): File[] {
  return Array.from(transfer?.files ?? []).filter((file) => file.type.startsWith("image/"));
}

const ATTRIBUTES = {
  class:
    "prose prose-sm max-w-none min-h-40 focus:outline-none prose-headings:font-semibold prose-p:my-2",
};

// The menu sees a key first; Ctrl+Space opens it anywhere.
function keyed(editor: Editor | null, options: EntryTiptapOptions, event: KeyboardEvent): boolean {
  if (!editor || options.menu.handleKey(editor, event)) {
    return Boolean(editor);
  }

  if (!isOpeningMenu(event)) {
    return false;
  }

  options.menu.openHere(editor);
  return true;
}

// Pictures go to be stored; true when there were any, so they are not pasted as they are.
function took(editor: Editor | null, options: EntryTiptapOptions, files: File[], at: number) {
  if (!editor || files.length === 0) {
    return false;
  }

  options.onPictures(editor, files, at);
  return true;
}

// A drop on a picture slot is the slot's to take; the words leave it alone.
function onSlot(event: DragEvent): boolean {
  return event.target instanceof Element && event.target.closest("[data-picture-slot]") !== null;
}

function droppedAt(view: EditorView, event: DragEvent): number {
  return (
    view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos ?? view.state.selection.from
  );
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
        pictureSlot: nodeView(PictureSlotView),
        searchSlot: nodeView(SearchSlotView),
      }),
      Markdown,
      Placeholder.configure({ placeholder: options.placeholder }),
    ],
    content: options.markdown,
    contentType: "markdown",
    immediatelyRender: false,
    shouldRerenderOnTransaction: false,
    editorProps: {
      attributes: ATTRIBUTES,
      handleKeyDown: (_view, event) => keyed(made.current, latest.current, event),
      handlePaste: (view, event) =>
        took(
          made.current,
          latest.current,
          picturesIn(event.clipboardData),
          view.state.selection.from,
        ),
      handleDrop: (view, event) =>
        onSlot(event) ||
        took(made.current, latest.current, picturesIn(event.dataTransfer), droppedAt(view, event)),
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
