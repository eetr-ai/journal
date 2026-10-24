"use client";

import { useCallback, useRef, useState } from "react";
import { SmileyIcon } from "@phosphor-icons/react";
import IconPicker from "./icon_picker";
import { useDismiss } from "@/components/use_dismiss";
import { EditorActionType, useEditorState } from "../editor_state";
import type { Dictionary } from "@/i18n/en";
import type { Locale } from "@/i18n/config";

const ICON_SIZE = 16;
// The block an icon change is filed under, so it never coalesces with typing.
const ICON_BLOCK = -2;

export interface IconFieldOptions {
  labels: Dictionary["editor"]["icon"];
  locale: Locale;
}

/** The entry's icon above its title, and the picker that changes it. */
export default function IconField(options: IconFieldOptions) {
  const { state, dispatch } = useEditorState();
  const [open, setOpen] = useState(false);
  const field = useRef<HTMLDivElement>(null);
  const icon = state.present.icon;

  // The whole field, so pressing the button again toggles rather than reopens.
  useDismiss(
    field,
    open,
    useCallback(() => setOpen(false), []),
  );

  function choose(chosen: string) {
    setOpen(false);
    dispatch({
      type: EditorActionType.Typed,
      data: { snapshot: { ...state.present, icon: chosen }, at: Date.now(), block: ICON_BLOCK },
    });
  }

  return (
    <div className="relative mb-1" ref={field}>
      <button
        aria-expanded={open}
        aria-label={icon ? options.labels.change : options.labels.add}
        className={
          icon
            ? "rounded-lg px-1 text-4xl leading-tight hover:bg-surface-muted"
            : "flex items-center gap-1 rounded px-1 py-0.5 text-xs text-muted hover:bg-surface-muted hover:text-foreground"
        }
        onClick={() => setOpen((was) => !was)}
        title={icon ? options.labels.change : options.labels.add}
        type="button"
      >
        {icon || (
          <>
            <SmileyIcon size={ICON_SIZE} />
            {options.labels.add}
          </>
        )}
      </button>
      {open && (
        <IconPicker
          labels={options.labels}
          locale={options.locale}
          onChoose={choose}
          showRemove={icon !== ""}
        />
      )}
    </div>
  );
}
