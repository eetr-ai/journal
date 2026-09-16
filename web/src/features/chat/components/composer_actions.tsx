"use client";

import { PaperPlaneRightIcon, StopIcon } from "@phosphor-icons/react";
import type { Dictionary } from "@/i18n/en";

const ICON_SIZE = 16;

export interface ComposerActionsOptions {
  /** Whether a run is in flight, which is the only time stopping means anything. */
  busy: boolean;
  canSend: boolean;
  onSend: () => void;
  onStop: () => void;
  t: Dictionary;
}

/** Send, and stop — which sit at the bottom of a box that grows upward. */
export default function ComposerActions(options: ComposerActionsOptions) {
  const t = options.t.chat;

  return (
    <>
      {options.busy ? (
        <button
          aria-label={t.stop}
          className="pb-1 text-muted hover:text-foreground"
          onClick={options.onStop}
          type="button"
        >
          <StopIcon size={ICON_SIZE} weight="fill" />
        </button>
      ) : null}
      <button
        aria-label={t.send}
        className="pb-1 text-muted hover:text-foreground disabled:opacity-40 disabled:hover:text-muted"
        disabled={!options.canSend}
        onClick={options.onSend}
        type="button"
      >
        <PaperPlaneRightIcon size={ICON_SIZE} weight="fill" />
      </button>
    </>
  );
}
