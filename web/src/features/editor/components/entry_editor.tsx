"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Editor } from "@tiptap/core";
import { EditorContent } from "@tiptap/react";
import { SimpleProvider } from "@eetr/react-reducer-utils";
import type { Entry, OpenedEntry } from "@/features/entries/types";
import type { OpenedImage } from "@/features/images/types";
import type { Dictionary } from "@/i18n/en";
import type { Locale } from "@/i18n/config";
import BlockMenu from "./block_menu";
import IconField from "./icon_field";
import { SaveButton, SaveTrouble } from "./save_status";
import { EntryEditorContext, type EntryEditorContextValue } from "../editor_context";
import {
  EditorActionType,
  EditorDispatchContext,
  EditorStateContext,
  editorReducer,
  initialEditorState,
  useEditorState,
  type Snapshot,
} from "../editor_state";
import { useBlockMenu } from "../use_block_menu";
import { useChangedBlocks } from "../use_changed_blocks";
import { useEntrySync, type EntrySync } from "../use_entry_sync";
import { usePictureUpload } from "../use_picture_upload";
import { markdownOf } from "../extensions/slots";
import { useAgentKey } from "@/features/chat/use_agent_key";
import { useEntryTiptap, useLoadedWords } from "../use_entry_tiptap";
import { useIncoming } from "../use_incoming";
import { useShortcuts } from "../use_shortcuts";

export interface EntryEditorOptions {
  t: Dictionary;
  locale: Locale;
  subject: string;
  entry: Entry;
  /** The words the editor opens on. */
  words: OpenedEntry;
  /** Whether `words` are the entry's current version, or older ones standing in. */
  current: boolean;
  /** The current version once it has been opened, which may arrive later. */
  opened?: OpenedEntry;
  /** What the entry said before a write from elsewhere, until that change is shown. */
  changedFrom?: string;
  pictures: OpenedImage[];
  picturesLoading: boolean;
  /** A picture the reader just added, stored and opened. */
  onPictureAdded: (image: OpenedImage) => void;
  /** Where the save button goes in the page's top bar. */
  toolbar: HTMLElement | null;
}

/**
 * An entry, written by hand. Seeded once per entry; mount it keyed by the
 * entry's id so another entry starts from its own words and its own history.
 */
export default function EntryEditor(options: EntryEditorOptions) {
  // Seeded once: later words reach the editor as incoming versions.
  const [initial] = useState(() =>
    initialEditorState({
      title: options.words.title,
      markdown: options.words.content,
      icon: options.words.icon,
      // Older words standing in are at no version we know, so the current one,
      // once opened, replaces them.
      version: options.current ? options.entry.version : 0,
    }),
  );

  return (
    <SimpleProvider
      dispatchContext={EditorDispatchContext}
      initialState={initial}
      reducer={editorReducer}
      stateContext={EditorStateContext}
    >
      <EditorBody {...options} />
    </SimpleProvider>
  );
}

type Beside = Pick<Snapshot, "title" | "icon">;

function snapshotOf(editor: Editor, beside: Beside): Snapshot {
  const { from, to } = editor.state.selection;

  return { ...beside, markdown: markdownOf(editor), selection: { from, to } };
}

// Every change in the words becomes a step the reducer can coalesce or keep.
function useTyping(beside: Beside): (editor: Editor) => void {
  const { dispatch } = useEditorState();
  const latest = useRef(beside);

  useEffect(() => {
    latest.current = beside;
  });

  return useCallback(
    (editor: Editor) =>
      dispatch({
        type: EditorActionType.Typed,
        data: {
          snapshot: snapshotOf(editor, latest.current),
          at: Date.now(),
          block: editor.state.selection.$from.index(0),
        },
      }),
    [dispatch],
  );
}

function useContextValue(
  options: EntryEditorOptions,
  fillSlot: EntryEditorContextValue["fillSlot"],
): EntryEditorContextValue {
  return useMemo(
    () => ({
      t: options.t,
      locale: options.locale,
      pictures: new Map(options.pictures.map((image) => [image.id, image])),
      picturesLoading: options.picturesLoading,
      fillSlot,
    }),
    [options.t, options.locale, options.pictures, options.picturesLoading, fillSlot],
  );
}

// Pictures go up under the agent key, into an entry that is stored first.
function usePictures(options: EntryEditorOptions, sync: EntrySync) {
  const { flush } = sync;

  return usePictureUpload({
    entryId: options.entry.id,
    key: useAgentKey(options.subject),
    store: useCallback(() => flush(true), [flush]),
    kept: sync.kept,
    onAdded: options.onPictureAdded,
  });
}

function EditorBody(options: EntryEditorOptions) {
  const { state } = useEditorState();
  const pictureIds = useMemo(
    () => new Set(options.pictures.map((image) => image.id)),
    [options.pictures],
  );
  const sync = useEntrySync({
    entry: options.entry,
    subject: options.subject,
    pictures: pictureIds,
  });
  const menu = useBlockMenu(options.t.editor.menu);
  const box = useRef<HTMLDivElement>(null);
  const upload = usePictures(options, sync);
  const editor = useEntryTiptap({
    markdown: state.present.markdown,
    placeholder: options.t.editor.placeholder,
    menu,
    onBlur: sync.flush,
    onChange: useTyping({ title: state.present.title, icon: state.present.icon }),
    onPictures: upload.place,
  });
  const { fill } = upload;
  const fillSlot = useCallback(
    (files: File[], token: string) => editor && fill(editor, files, token),
    [editor, fill],
  );

  useIncoming(options.entry, options.opened);
  useLoadedWords(editor, state.present, state.revision);
  useChangedBlocks(editor, {
    before: options.changedFrom,
    holding: state.present.markdown === options.opened?.content,
  });
  useShortcuts(box, sync.flush);

  return (
    <EntryEditorContext value={useContextValue(options, fillSlot)}>
      <div ref={box}>
        <IconField labels={options.t.editor.icon} locale={options.locale} />
        <TitleField editor={editor} labels={options.t.editor} />
        <SaveButton labels={options.t.editor} onSave={sync.flush} slot={options.toolbar} />
        <SaveTrouble labels={options.t.editor} />
        <EditorContent editor={editor} />
        {editor ? <BlockMenu editor={editor} handle={menu} labels={options.t.editor.menu} /> : null}
      </div>
    </EntryEditorContext>
  );
}

interface TitleFieldOptions {
  editor: Editor | null;
  labels: Dictionary["editor"];
}

// One line. Enter carries on into the words, the way it would on paper.
function TitleField(options: TitleFieldOptions) {
  const { state, dispatch } = useEditorState();

  return (
    <input
      aria-label={options.labels.titlePlaceholder}
      className="mb-1 w-full bg-transparent text-lg font-semibold outline-none placeholder:text-muted"
      onChange={(event) =>
        dispatch({
          type: EditorActionType.Typed,
          data: {
            snapshot: { ...state.present, title: event.target.value },
            at: Date.now(),
            block: -1,
          },
        })
      }
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          options.editor?.commands.focus("start");
        }
      }}
      placeholder={options.labels.titlePlaceholder}
      value={state.present.title}
    />
  );
}
