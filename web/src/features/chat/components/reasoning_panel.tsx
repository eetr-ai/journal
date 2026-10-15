"use client";

import { useState } from "react";
import { CaretDownIcon } from "@phosphor-icons/react";
import { useStickToBottom } from "../use_stick_to_bottom";
import type { Dictionary } from "@/i18n/en";

const CARET_SIZE = 12;

export interface ReasoningPanelOptions {
  reasoning: string;
  /** Whether this turn is the one still being written. */
  live: boolean;
  t: Dictionary;
}

/**
 * The model's reasoning, open while it is working and folded away once it has
 * answered — reading along is the point, and re-reading it afterwards rarely
 * is. Opening or closing it yourself wins from then on, for the life of the
 * turn: a panel that springs shut under you is worse than one that never opens.
 *
 * Open, it is a window about five lines tall rather than the whole of it: the
 * reasoning is context for the answer, and left to grow it pushes the answer
 * off the screen. While the turn is live the window follows the newest line,
 * unless the reader has scrolled up in it.
 *
 * useState because that preference belongs to this one turn and nothing outside
 * it has any reason to know.
 */
export default function ReasoningPanel(options: ReasoningPanelOptions) {
  const [chosen, setChosen] = useState<boolean | null>(null);
  const open = chosen ?? options.live;
  // Followed only while it is being written, and counted from when it opened:
  // a window reopened mid-thought lands on the newest line rather than waiting
  // for the next token, and one reopened afterwards starts at the top to be
  // read through.
  const { region, onScroll } = useStickToBottom(
    open && options.live ? options.reasoning.length : 0,
  );

  if (options.reasoning === "") {
    return null;
  }

  return (
    <div className="mb-2 rounded-lg border border-border bg-surface-muted">
      <button
        aria-expanded={open}
        className="flex w-full items-center gap-1.5 px-3 py-1.5 text-left text-xs text-muted"
        onClick={() => setChosen(!open)}
        type="button"
      >
        <span className={`transition-transform ${open ? "rotate-180" : ""}`}>
          <CaretDownIcon size={CARET_SIZE} weight="bold" />
        </span>
        <span className="flex-1">{options.t.chat.reasoning}</span>
      </button>
      {open ? (
        <div
          className="max-h-[calc(5lh+0.625rem)] overflow-y-auto overscroll-contain whitespace-pre-wrap px-3 pb-2.5 text-xs leading-relaxed text-muted"
          onScroll={onScroll}
          ref={region}
        >
          {options.reasoning}
        </div>
      ) : null}
    </div>
  );
}
