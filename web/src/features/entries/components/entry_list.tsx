"use client";

import { useState } from "react";

import { BookmarkSimpleIcon } from "@phosphor-icons/react";
import JournalBar from "./journal_bar";
import { useEntries } from "../entries_state";
import { useShowEntry } from "../use_show_entry";
import { shortDayIn } from "../days";
import type { Entry } from "../types";
import type { Dictionary } from "@/i18n/en";
import type { Locale } from "@/i18n/config";

const ICON_SIZE = 12;

export interface EntryListOptions {
  t: Dictionary;
  locale: Locale;
  /** Whose vault holds the key — the search sends it with the question. */
  subject: string;
}

/**
 * The journal in the drawer.
 *
 * Rows are buttons rather than links: every entry is already in the browser, so
 * moving between them is a dispatch and a pushState, not a round trip. The URL
 * still changes — see use_entry_url — so one of these can be shared or reloaded.
 */
export default function EntryList(options: EntryListOptions) {
  const { state } = useEntries();
  const show = useShowEntry();
  const [keptOnly, setKeptOnly] = useState(false);
  const showing = state.showing ?? state.entries.find((e) => e.date === state.today)?.id;
  const shown = keptOnly ? state.entries.filter((entry) => entry.bookmarked) : state.entries;

  if (shown.length === 0) {
    return (
      <Section bar={options} keptOnly={keptOnly} onFilter={setKeptOnly}>
        <p className="px-2 py-2 text-xs text-muted">
          {keptOnly ? options.t.entries.keptNone : options.t.entries.none}
        </p>
      </Section>
    );
  }

  return (
    <Section bar={options} keptOnly={keptOnly} onFilter={setKeptOnly}>
      <ul className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {shown.map((entry) => (
          <li key={entry.id}>
            <Row
              current={entry.id === showing}
              entry={entry}
              label={options.t.entries.open}
              locale={options.locale}
              onShow={() => show(entry)}
              title={
                // `||` not `??`: a draft opens to an empty title, which is a
                // title nobody can read rather than one that has not arrived.
                state.opened[entry.id]?.title || options.t.entries.untitled
              }
            />
          </li>
        ))}
      </ul>
    </Section>
  );
}

interface SectionOptions {
  bar: EntryListOptions;
  keptOnly: boolean;
  onFilter: (only: boolean) => void;
  children: React.ReactNode;
}

function Section(options: SectionOptions) {
  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col">
      <JournalBar
        keptOnly={options.keptOnly}
        locale={options.bar.locale}
        onFilter={options.onFilter}
        subject={options.bar.subject}
        t={options.bar.t}
      />
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
      <p className="flex items-center gap-1 truncate text-sm">
        {options.entry.bookmarked && (
          <span className="shrink-0 text-highlight">
            <BookmarkSimpleIcon size={ICON_SIZE} weight="fill" />
          </span>
        )}
        <span className="truncate">{options.title}</span>
      </p>
      <p className="text-xs text-muted">{shortDayIn(options.entry.date, options.locale)}</p>
    </button>
  );
}
