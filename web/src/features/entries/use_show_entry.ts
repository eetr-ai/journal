"use client";

import { ShellActionType, useShell } from "@/features/shell/shell_state";
import { EntriesActionType, useEntries } from "./entries_state";
import type { Entry } from "./types";

/**
 * Showing an entry, asked for from one of the lists that offer them.
 *
 * It also raises the panel that shows it, because where those lists are a cover
 * the entry they name is underneath it: a tap that appears to do nothing is the
 * same to the person doing it as one that did nothing.
 *
 * Only for a person asking. An entry the agent writes mid-answer arrives on the
 * stream and must not throw a panel over what is being read.
 */
export function useShowEntry() {
  const entries = useEntries();
  const shell = useShell();

  return function show(entry: Entry) {
    entries.dispatch({ type: EntriesActionType.Shown, data: entry });
    shell.dispatch({ type: ShellActionType.EntryRaised });
  };
}
