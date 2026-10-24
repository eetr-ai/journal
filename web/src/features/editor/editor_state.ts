"use client";

import { createContext, type Dispatch } from "react";
import { useContextNullSafe, type ReducerAction } from "@eetr/react-reducer-utils";
import type { SaveProblem } from "@/features/entries/rules";

/**
 * One entry being written by hand: its words, the history that undo walks, and
 * where it stands against what the server last confirmed.
 *
 * History is snapshots of the whole entry as markdown, not editor steps, so an
 * undo is a reload of a version the reader saw. A burst of typing inside one
 * block is one step; a pause or a move to another block starts the next.
 *
 * Pure: the time a keystroke happened arrives on the action.
 */

/** A pause longer than this starts a new undo step. */
export const COALESCE_MS = 800;
/** Steps kept; the oldest fall off. */
export const HISTORY_LIMIT = 100;

export interface Selection {
  from: number;
  to: number;
}

export interface Snapshot {
  title: string;
  markdown: string;
  /** One emoji, or empty. Undone and saved with the words. */
  icon: string;
  selection: Selection;
}

/** Words and the version they are stored at. */
export interface Version {
  title: string;
  markdown: string;
  icon: string;
  version: number;
}

/** What a save compares: the words and the icon, not where the caret is. */
type Words = Pick<Snapshot, "title" | "markdown" | "icon">;

export type SaveStatus = "idle" | "saving" | "saved" | "failed" | "stale" | "invalid";

export interface EditorState {
  present: Snapshot;
  past: Snapshot[];
  future: Snapshot[];
  /** What the server last confirmed, or what the entry was opened at. */
  saved: Version;
  status: SaveStatus;
  /** Why a save was refused, while `status` is "invalid". */
  problem: SaveProblem | null;
  /** A newer version written elsewhere while this one had unsaved words. */
  incoming: Version | null;
  /** Moves whenever `present` changed from outside the editor, which must then load it. */
  revision: number;
  /** Moves with every change to the words, so a timer knows typing went on. */
  edits: number;
  lastTyped: { at: number; block: number } | null;
}

export enum EditorActionType {
  Typed = "typed",
  Undone = "undone",
  Redone = "redone",
  SaveStarted = "saveStarted",
  Saved = "saved",
  SaveStale = "saveStale",
  SaveFailed = "saveFailed",
  Rejected = "rejected",
  Arrived = "arrived",
  LoadedLatest = "loadedLatest",
  KeptMine = "keptMine",
}

export type EditorAction = ReducerAction<EditorActionType>;

export interface TypedData {
  snapshot: Snapshot;
  at: number;
  /** The top-level block the caret is in; -1 for the title, -2 for the icon. */
  block: number;
}

export function initialEditorState(opened: Version): EditorState {
  return {
    present: {
      title: opened.title,
      markdown: opened.markdown,
      icon: opened.icon,
      selection: { from: 0, to: 0 },
    },
    past: [],
    future: [],
    saved: opened,
    status: "idle",
    problem: null,
    incoming: null,
    revision: 0,
    edits: 0,
    lastTyped: null,
  };
}

function sameWords(a: Words, b: Words) {
  return a.title === b.title && a.markdown === b.markdown && a.icon === b.icon;
}

/** Whether an entry never stored still has nothing in it but, at most, an icon. */
export function isBlankDraft(state: EditorState): boolean {
  return state.saved.version === 0 && state.present.title === "" && state.present.markdown === "";
}

/** Whether there is anything the server does not have yet. */
export function isDirty(state: EditorState): boolean {
  return !sameWords(state.present, state.saved);
}

function remembered(past: Snapshot[], snapshot: Snapshot): Snapshot[] {
  return [...past, snapshot].slice(-HISTORY_LIMIT);
}

// A save in flight, or a conflict waiting on the reader, outlives typing.
function statusAfterTyping(status: SaveStatus): SaveStatus {
  return status === "saving" || status === "stale" ? status : "idle";
}

function typed(state: EditorState, data: TypedData): EditorState {
  if (sameWords(data.snapshot, state.present)) {
    // The caret moved; nothing was written, so nothing to undo.
    return { ...state, present: data.snapshot };
  }

  const last = state.lastTyped;
  const coalesce = last !== null && data.at - last.at < COALESCE_MS && last.block === data.block;

  return {
    ...state,
    present: data.snapshot,
    past: coalesce ? state.past : remembered(state.past, state.present),
    future: [],
    status: statusAfterTyping(state.status),
    edits: state.edits + 1,
    lastTyped: { at: data.at, block: data.block },
  };
}

// Undo and redo are the same move in opposite directions.
function stepped(state: EditorState, from: Snapshot[], to: Snapshot[], back: boolean): EditorState {
  const target = from.at(-1);

  if (!target) {
    return state;
  }

  const rest = from.slice(0, -1);
  const kept = remembered(to, state.present);

  return {
    ...state,
    present: target,
    past: back ? rest : kept,
    future: back ? kept : rest,
    status: statusAfterTyping(state.status),
    revision: state.revision + 1,
    edits: state.edits + 1,
    lastTyped: null,
  };
}

// The present becomes `version`, as an undoable step, and is what is stored.
function loaded(state: EditorState, version: Version): EditorState {
  return {
    ...state,
    present: {
      title: version.title,
      markdown: version.markdown,
      icon: version.icon,
      selection: state.present.selection,
    },
    past: remembered(state.past, state.present),
    future: [],
    saved: version,
    incoming: null,
    status: "idle",
    problem: null,
    revision: state.revision + 1,
    lastTyped: null,
  };
}

function saved(state: EditorState, version: Version): EditorState {
  // A version that is not newer is a save answering after a later one.
  if (version.version <= state.saved.version) {
    return { ...state, status: isDirty(state) ? "idle" : "saved" };
  }

  const next = { ...state, saved: version, problem: null };

  return { ...next, status: isDirty(next) ? "idle" : "saved" };
}

function arrived(state: EditorState, version: Version): EditorState {
  if (version.version <= state.saved.version) {
    return state;
  }

  // Nothing of the reader's would be lost, so the new words simply load.
  return isDirty(state) ? { ...state, incoming: version, status: "stale" } : loaded(state, version);
}

const handlers: Record<
  EditorActionType,
  (state: EditorState, action: EditorAction) => EditorState
> = {
  [EditorActionType.Typed]: (state, action) => typed(state, action.data as TypedData),
  [EditorActionType.Undone]: (state) => stepped(state, state.past, state.future, true),
  [EditorActionType.Redone]: (state) => stepped(state, state.future, state.past, false),
  [EditorActionType.SaveStarted]: (state) => ({ ...state, status: "saving" }),
  [EditorActionType.Saved]: (state, action) => saved(state, action.data as Version),
  [EditorActionType.SaveStale]: (state) => ({ ...state, status: "stale" }),
  [EditorActionType.SaveFailed]: (state) => ({ ...state, status: "failed" }),
  [EditorActionType.Rejected]: (state, action) => ({
    ...state,
    status: "invalid",
    problem: action.data as SaveProblem,
  }),
  [EditorActionType.Arrived]: (state, action) => arrived(state, action.data as Version),
  [EditorActionType.LoadedLatest]: (state) =>
    state.incoming ? loaded(state, state.incoming) : state,
  // The reader's words stay and are written over the newer version, which is
  // now the one the next save names.
  [EditorActionType.KeptMine]: (state) =>
    state.incoming
      ? {
          ...state,
          saved: { ...state.saved, version: state.incoming.version },
          incoming: null,
          status: "idle",
          edits: state.edits + 1,
        }
      : state,
};

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  return handlers[action.type]?.(state, action) ?? state;
}

export const EditorStateContext = createContext<EditorState | null>(null);
export const EditorDispatchContext = createContext<Dispatch<EditorAction> | null>(null);

export function useEditorState() {
  return {
    state: useContextNullSafe(EditorStateContext),
    dispatch: useContextNullSafe(EditorDispatchContext),
  };
}
