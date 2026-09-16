"use client";

import { useState } from "react";
import {
  BookmarkSimpleIcon,
  CalendarBlankIcon,
  MagnifyingGlassIcon,
  NotebookIcon,
  PlusIcon,
} from "@phosphor-icons/react";
import { EntriesActionType, useEntries } from "../entries_state";
import { draftEntry } from "../types";
import SearchProvider from "./search_provider";
import EntrySearch from "./entry_search";
import DayPicker from "./day_picker";
import type { Dictionary } from "@/i18n/en";
import type { Locale } from "@/i18n/config";

const ICON_SIZE = 16;

type Panel = "none" | "search" | "days";

export interface JournalBarOptions {
  t: Dictionary;
  locale: Locale;
  subject: string;
  keptOnly: boolean;
  onFilter: (only: boolean) => void;
}

/**
 * The journal's heading and the two ways into it.
 *
 * One panel at a time: the drawer is sixteen rems wide, and a calendar under a
 * search under a list is three things competing for the same column.
 */
export default function JournalBar(options: JournalBarOptions) {
  const { state, dispatch } = useEntries();
  const [panel, setPanel] = useState<Panel>("none");

  function toggle(wanted: Panel) {
    setPanel((showing) => (showing === wanted ? "none" : wanted));
  }

  // Nothing is stored here. The entry exists in the browser, the address bar
  // points at it, and the first thing the agent is told to write lands in it.
  function start() {
    setPanel("none");
    dispatch({ type: EntriesActionType.Drafted, data: draftEntry(state.today) });
  }

  return (
    <SearchProvider>
      <header className="flex items-center gap-1 px-4 py-3">
        <span className="shrink-0 text-muted">
          <NotebookIcon size={ICON_SIZE} weight="fill" />
        </span>
        <h2 className="min-w-0 flex-1 truncate text-sm font-semibold">{options.t.shell.entries}</h2>
        <Action label={options.t.entries.new} on={false} onPress={start}>
          <PlusIcon size={ICON_SIZE} />
        </Action>
        <Action
          label={
            panel === "search" ? options.t.entries.search.close : options.t.entries.search.open
          }
          on={panel === "search"}
          onPress={() => toggle("search")}
        >
          <MagnifyingGlassIcon size={ICON_SIZE} />
        </Action>
        <Action
          label={panel === "days" ? options.t.entries.days.close : options.t.entries.days.open}
          on={panel === "days"}
          onPress={() => toggle("days")}
        >
          <CalendarBlankIcon size={ICON_SIZE} />
        </Action>
        <Action
          label={options.keptOnly ? options.t.entries.allEntries : options.t.entries.onlyKept}
          on={options.keptOnly}
          onPress={() => options.onFilter(!options.keptOnly)}
        >
          <BookmarkSimpleIcon size={ICON_SIZE} weight={options.keptOnly ? "fill" : "regular"} />
        </Action>
      </header>
      {panel === "search" && (
        <EntrySearch locale={options.locale} subject={options.subject} t={options.t} />
      )}
      {panel === "days" && <DayPicker locale={options.locale} t={options.t} />}
    </SearchProvider>
  );
}

interface ActionOptions {
  label: string;
  on: boolean;
  onPress: () => void;
  children: React.ReactNode;
}

function Action(options: ActionOptions) {
  return (
    <button
      aria-expanded={options.on}
      aria-label={options.label}
      className={`tap-target shrink-0 rounded p-1 hover:bg-surface-muted hover:text-foreground ${
        options.on ? "bg-surface-muted text-foreground" : "text-muted"
      }`}
      onClick={options.onPress}
      title={options.label}
      type="button"
    >
      {options.children}
    </button>
  );
}
