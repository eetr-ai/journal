"use client";

import { NotebookIcon } from "@phosphor-icons/react/dist/ssr";
import { EntriesActionType, useEntries } from "../entries_state";
import { shortDayIn } from "../days";
import type { Entry } from "../types";
import type { Dictionary } from "@/i18n/en";
import type { Locale } from "@/i18n/config";

const ICON_SIZE = 16;

export interface EntryListOptions {
  t: Dictionary;
  locale: Locale;
}

/**
 * The journal in the drawer.
 *
 * Rows are buttons rather than links: every entry is already in the browser, so
 * moving between them is a dispatch and a pushState, not a round trip. The URL
 * still changes — see use_entry_url — so one of these can be shared or reloaded.
 */
export default function EntryList(options: EntryListOptions) {
  const { state, dispatch } = useEntries();
  const showing = state.showing ?? state.entries.find((e) => e.date === state.today)?.id;

  if (state.entries.length === 0) {
    return (
      <Section title={options.t.shell.entries}>
        <p className="px-2 py-2 text-xs text-muted">{options.t.entries.none}</p>
      </Section>
    );
  }

  return (
    <Section title={options.t.shell.entries}>
      <ul className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {state.entries.map((entry) => (
          <li key={entry.id}>
            <Row
              current={entry.id === showing}
              entry={entry}
              label={options.t.entries.open}
              locale={options.locale}
              onShow={() => dispatch({ type: EntriesActionType.Shown, data: entry })}
              title={state.opened[entry.id]?.title ?? options.t.entries.opening}
            />
          </li>
        ))}
      </ul>
    </Section>
  );
}

function Section(options: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <header className="flex items-center gap-2 px-4 py-3">
        <span className="text-muted">
          <NotebookIcon size={ICON_SIZE} weight="fill" />
        </span>
        <h2 className="flex-1 text-sm font-semibold">{options.title}</h2>
      </header>
      {options.children}
    </section>
  );
}

interface RowOptions {
  entry: Entry;
  title: string;
  label: string;
  locale: Locale;
  current: boolean;
  onShow: () => void;
}

function Row(options: RowOptions) {
  return (
    <button
      aria-current={options.current ? "true" : undefined}
      aria-label={options.label}
      className={`w-full rounded-lg px-2 py-2 text-left hover:bg-surface-muted ${
        options.current ? "bg-surface-muted" : ""
      }`}
      onClick={options.onShow}
      type="button"
    >
      <p className="truncate text-sm">{options.title}</p>
      <p className="text-xs text-muted">{shortDayIn(options.entry.date, options.locale)}</p>
    </button>
  );
}
