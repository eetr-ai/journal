"use client";

import { createPortal } from "react-dom";
import { CheckIcon, CloudArrowUpIcon, SpinnerGapIcon } from "@phosphor-icons/react";
import { EditorActionType, isDirty, useEditorState, type EditorState } from "../editor_state";
import type { EditorDictionary } from "@/i18n/en_editor";

const ICON_SIZE = 16;

export interface SaveButtonOptions {
  labels: EditorDictionary;
  /** Where in the page's top bar the button goes; nothing is drawn without one. */
  slot: HTMLElement | null;
  onSave: () => void;
}

type Look = "save" | "saving" | "saved";

function lookOf(state: EditorState): Look {
  if (state.status === "saving") {
    return "saving";
  }

  return isDirty(state) ? "save" : "saved";
}

const ICONS: Record<Look, React.ReactNode> = {
  save: <CloudArrowUpIcon size={ICON_SIZE} />,
  saving: <SpinnerGapIcon className="animate-spin" size={ICON_SIZE} />,
  saved: <CheckIcon size={ICON_SIZE} />,
};

/**
 * Save, in the top bar, saying where the words stand: there is something to
 * save, it is going, or it is stored. Only the first can be pressed.
 */
export function SaveButton(options: SaveButtonOptions) {
  const { state } = useEditorState();
  const look = lookOf(state);

  if (!options.slot) {
    return null;
  }

  return createPortal(
    <button
      className={`tap-target flex shrink-0 items-center gap-1 rounded px-2 py-1 text-xs font-medium ${
        look === "save" ? "bg-brand text-on-brand hover:bg-brand-strong" : "text-muted"
      }`}
      disabled={look !== "save"}
      onClick={options.onSave}
      title={options.labels.saveHint}
      type="button"
    >
      {ICONS[look]}
      {options.labels.save[look]}
    </button>,
    options.slot,
  );
}

export interface SaveTroubleOptions {
  labels: EditorDictionary;
}

function troubleText(state: EditorState, labels: EditorDictionary): string | null {
  if (state.status === "failed") {
    return labels.status.failed;
  }

  if (state.status === "invalid") {
    return state.problem ? labels.status[state.problem] : labels.status.failed;
  }

  return null;
}

/**
 * What the reader has to know above the words: a save that did not go, or
 * somebody else's write waiting on their choice.
 */
export function SaveTrouble(options: SaveTroubleOptions) {
  const { state, dispatch } = useEditorState();
  const labels = options.labels;

  if (state.incoming) {
    return (
      <div className="mb-3 flex flex-wrap items-center gap-2 rounded border border-border bg-surface-muted px-3 py-2 text-xs">
        <p className="min-w-0 flex-1">{labels.conflict.body}</p>
        <button
          className="rounded px-2 py-1 font-medium hover:bg-surface"
          onClick={() => dispatch({ type: EditorActionType.LoadedLatest })}
          type="button"
        >
          {labels.conflict.latest}
        </button>
        <button
          className="rounded px-2 py-1 font-medium text-brand hover:bg-surface"
          onClick={() => dispatch({ type: EditorActionType.KeptMine })}
          type="button"
        >
          {labels.conflict.mine}
        </button>
      </div>
    );
  }

  const trouble = troubleText(state, labels);

  return trouble ? (
    <p aria-live="polite" className="mb-2 text-xs text-accent">
      {trouble}
    </p>
  ) : null;
}
