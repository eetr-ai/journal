"use client";

import { useState } from "react";
import { CaretDownIcon } from "@phosphor-icons/react";
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
 * useState because that preference belongs to this one turn and nothing outside
 * it has any reason to know.
 */
export default function ReasoningPanel(options: ReasoningPanelOptions) {
  const [chosen, setChosen] = useState<boolean | null>(null);

  if (options.reasoning === "") {
    return null;
  }

  const open = chosen ?? options.live;

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
        <p className="whitespace-pre-wrap px-3 pb-2.5 text-xs leading-relaxed text-muted">
          {options.reasoning}
        </p>
      ) : null}
    </div>
  );
}
