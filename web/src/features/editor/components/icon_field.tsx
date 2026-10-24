"use client";

import { useEffect, useRef, useState } from "react";
import { SmileyIcon } from "@phosphor-icons/react";
import { isIcon } from "@/features/entries/rules";
import { ICON_CHOICES } from "../icons";
import { EditorActionType, useEditorState } from "../editor_state";
import type { Dictionary } from "@/i18n/en";

const ICON_SIZE = 16;
// The block an icon change is filed under, so it never coalesces with typing.
const ICON_BLOCK = -2;

export interface IconFieldOptions {
  labels: Dictionary["editor"]["icon"];
}

/** The entry's icon above its title, and the picker that changes it. */
export default function IconField(options: IconFieldOptions) {
  const { state, dispatch } = useEditorState();
  const [open, setOpen] = useState(false);
  const icon = state.present.icon;

  function choose(chosen: string) {
    setOpen(false);
    dispatch({
      type: EditorActionType.Typed,
      data: { snapshot: { ...state.present, icon: chosen }, at: Date.now(), block: ICON_BLOCK },
    });
  }

  return (
    <div className="relative mb-1">
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
          onChoose={choose}
          onClose={() => setOpen(false)}
          showRemove={icon !== ""}
        />
      )}
    </div>
  );
}

interface IconPickerOptions {
  labels: Dictionary["editor"]["icon"];
  showRemove: boolean;
  onChoose: (icon: string) => void;
  onClose: () => void;
}

// Closes on Escape and on a press anywhere outside it.
function useDismiss(box: React.RefObject<HTMLDivElement | null>, onClose: () => void) {
  useEffect(() => {
    function outside(event: PointerEvent) {
      if (box.current && !box.current.contains(event.target as Node)) {
        onClose();
      }
    }

    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);

    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [box, onClose]);
}

function IconPicker(options: IconPickerOptions) {
  const box = useRef<HTMLDivElement>(null);

  useDismiss(box, options.onClose);

  return (
    <div
      className="absolute top-full left-0 z-20 mt-1 w-72 max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-surface p-2 shadow-xl"
      ref={box}
    >
      <div className="grid grid-cols-8 gap-0.5">
        {ICON_CHOICES.map((choice) => (
          <button
            aria-label={choice}
            className="rounded p-1 text-xl hover:bg-surface-muted"
            key={choice}
            onClick={() => options.onChoose(choice)}
            type="button"
          >
            {choice}
          </button>
        ))}
      </div>
      <PastedIcon labels={options.labels} onChoose={options.onChoose} />
      {options.showRemove && (
        <button
          className="mt-1 w-full rounded px-2 py-1 text-left text-xs text-muted hover:bg-surface-muted hover:text-accent"
          onClick={() => options.onChoose("")}
          type="button"
        >
          {options.labels.remove}
        </button>
      )}
    </div>
  );
}

interface PastedIconOptions {
  labels: Dictionary["editor"]["icon"];
  onChoose: (icon: string) => void;
}

// Any emoji at all, typed or pasted; taken the moment it is one.
function PastedIcon(options: PastedIconOptions) {
  const [text, setText] = useState("");

  return (
    <input
      aria-label={options.labels.paste}
      className="mt-2 w-full rounded-lg border border-border bg-surface px-2 py-1 text-base outline-none focus:border-brand md:text-sm"
      onChange={(event) => {
        const value = event.target.value.trim();

        setText(event.target.value);

        if (value !== "" && isIcon(value)) {
          options.onChoose(value);
        }
      }}
      placeholder={options.labels.paste}
      value={text}
    />
  );
}
