"use client";

import { NotePencilIcon } from "@phosphor-icons/react";
import { ShellActionType, useShell } from "@/features/shell/shell_state";
import { EntriesActionType, useEntries } from "../entries_state";
import { draftEntry } from "../types";
import type { Dictionary } from "@/i18n/en";

const ICON_SIZE = 20;

export interface NewEntryButtonOptions {
  t: Dictionary;
}

/**
 * A fresh page, from the bar that is always there. Nothing is stored until it
 * has words; the panel is raised because, where it is a cover, the page would
 * otherwise open underneath it.
 */
export default function NewEntryButton(options: NewEntryButtonOptions) {
  const entries = useEntries();
  const shell = useShell();

  function start() {
    entries.dispatch({ type: EntriesActionType.Drafted, data: draftEntry(entries.state.today) });
    shell.dispatch({ type: ShellActionType.EntryRaised });
  }

  return (
    <button
      aria-label={options.t.entries.new}
      className="tap-target shrink-0 rounded p-1 text-muted hover:bg-surface-muted hover:text-foreground"
      onClick={start}
      title={options.t.entries.new}
      type="button"
    >
      <NotePencilIcon size={ICON_SIZE} />
    </button>
  );
}
