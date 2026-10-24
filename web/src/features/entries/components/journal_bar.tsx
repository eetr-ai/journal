"use client";

import { useState } from "react";
import { BookmarkSimpleIcon, CalendarBlankIcon, NotebookIcon } from "@phosphor-icons/react";
import DayPicker from "./day_picker";
import type { Dictionary } from "@/i18n/en";
import type { Locale } from "@/i18n/config";

const ICON_SIZE = 16;

type Panel = "none" | "days";

export interface JournalBarOptions {
  t: Dictionary;
  locale: Locale;
  subject: string;
  keptOnly: boolean;
  onFilter: (only: boolean) => void;
}

/**
 * The journal's heading, the calendar and the bookmark filter.
 *
 * The calendar starts open: a journal is found again by its days.
 */
export default function JournalBar(options: JournalBarOptions) {
  const [panel, setPanel] = useState<Panel>("days");

  function toggle(wanted: Panel) {
    setPanel((showing) => (showing === wanted ? "none" : wanted));
  }

  return (
    <>
      <header className="flex items-center gap-1 px-4 py-3">
        <span className="shrink-0 text-muted">
          <NotebookIcon size={ICON_SIZE} weight="fill" />
        </span>
        <h2 className="min-w-0 flex-1 truncate text-sm font-semibold">{options.t.shell.entries}</h2>
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
      {panel === "days" && <DayPicker locale={options.locale} t={options.t} />}
    </>
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
