"use client";

import { MagnifyingGlassIcon } from "@phosphor-icons/react";
import { ShellActionType, useShell } from "../shell_state";
import { useSearch } from "@/features/entries/search_state";
import type { Dictionary } from "@/i18n/en";

const ICON_SIZE = 20;

export interface SearchButtonOptions {
  t: Dictionary;
}

/**
 * Asking the journal something, from the bar that is always there.
 *
 * Not in the drawer with the days: at the size where the drawer is a cover,
 * reaching a search meant opening the thing that covers what you are searching,
 * and the question is about the journal rather than about that list.
 */
export default function SearchButton(options: SearchButtonOptions) {
  const shell = useShell();
  const search = useSearch();
  const asked = search.state.status !== "idle";

  return (
    <button
      aria-label={options.t.entries.search.open}
      className={`tap-target shrink-0 rounded p-1 hover:bg-surface-muted hover:text-foreground ${
        asked ? "bg-surface-muted text-foreground" : "text-muted"
      }`}
      onClick={() => shell.dispatch({ type: ShellActionType.SearchOpened })}
      title={options.t.entries.search.open}
      type="button"
    >
      <MagnifyingGlassIcon size={ICON_SIZE} />
    </button>
  );
}
