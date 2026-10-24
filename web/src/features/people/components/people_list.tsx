"use client";

import { useMemo, useState } from "react";
import {
  CaretLeftIcon,
  CaretRightIcon,
  MagnifyingGlassIcon,
  UserPlusIcon,
} from "@phosphor-icons/react";
import { momentFor } from "@/features/chat/now";
import { OverlayBody, OverlayFooter } from "@/components/overlay_dialog";
import PersonRow from "./person_row";
import { daysUntil, soonestFirst, type Placed } from "../birthdays";
import { NEW_PERSON, PeopleActionType, usePeople, type PeopleUiState } from "../people_state";
import { format } from "@/i18n/format";
import type { Dictionary } from "@/i18n/en";
import type { Locale } from "@/i18n/config";

const ICON_SIZE = 16;
// A screenful on a laptop, without the list becoming the page.
export const PAGE_SIZE = 10;

export interface PeopleListOptions {
  timezone: string;
  locale: Locale;
  t: Dictionary;
}

// Only the opened ones: a person still sealed has no name to sort by yet.
function placed(state: PeopleUiState, today: string): Placed[] {
  return state.people
    .filter((person) => person.id in state.opened)
    .map((person) => {
      const opened = state.opened[person.id];

      return { id: person.id, person: opened, days: daysUntil(opened.birthday, today) };
    })
    .toSorted(soonestFirst);
}

// Case and accents aside, so "jose" finds José.
function folded(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

function matching(rows: Placed[], query: string): Placed[] {
  const wanted = folded(query.trim());

  return wanted === ""
    ? rows
    : rows.filter(({ person }) => folded(`${person.name} ${person.relation}`).includes(wanted));
}

/** Soonest birthday first, a page at a time, narrowed by what is typed. */
export default function PeopleList(options: PeopleListOptions) {
  const { state } = usePeople();
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const t = options.t;
  // The reader's day, not the server's: near midnight the two are different
  // days, and a birthday is the reader's to count.
  const today = useMemo(() => momentFor(options.timezone).date, [options.timezone]);
  const rows = matching(placed(state, today), query);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  // A narrower search can leave the page past the end.
  const at = Math.min(page, pages - 1);
  const shown = rows.slice(at * PAGE_SIZE, (at + 1) * PAGE_SIZE);

  return (
    <>
      <OverlayBody>
        <div className="flex flex-col gap-4">
          <Toolbar
            onQuery={(value) => {
              setQuery(value);
              setPage(0);
            }}
            query={query}
            t={t}
          />
          <Rows empty={state.people.length === 0} locale={options.locale} shown={shown} t={t} />
        </div>
      </OverlayBody>
      {pages > 1 && (
        <OverlayFooter>
          <Pager at={at} onPage={setPage} pages={pages} t={t} total={rows.length} />
        </OverlayFooter>
      )}
    </>
  );
}

interface ToolbarOptions {
  query: string;
  onQuery: (query: string) => void;
  t: Dictionary;
}

function Toolbar(options: ToolbarOptions) {
  const { dispatch } = usePeople();
  const t = options.t.people;

  return (
    <div className="flex items-center gap-2">
      <label className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5 focus-within:border-brand">
        <MagnifyingGlassIcon className="shrink-0 text-muted" size={ICON_SIZE} />
        <input
          aria-label={t.search}
          className="min-w-0 flex-1 bg-transparent text-base outline-none md:text-sm"
          onChange={(event) => options.onQuery(event.target.value)}
          placeholder={t.search}
          type="search"
          value={options.query}
        />
      </label>
      <button
        className="flex shrink-0 items-center gap-2 rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-on-brand transition hover:bg-brand-strong"
        onClick={() => dispatch({ type: PeopleActionType.Select, data: NEW_PERSON })}
        type="button"
      >
        <UserPlusIcon size={ICON_SIZE} weight="bold" />
        <span className="hidden sm:inline">{t.add}</span>
      </button>
    </div>
  );
}

interface RowsOptions {
  shown: Placed[];
  empty: boolean;
  locale: Locale;
  t: Dictionary;
}

function Rows(options: RowsOptions) {
  if (options.shown.length === 0) {
    return (
      <p className="text-sm text-muted">
        {options.empty ? options.t.people.empty : options.t.people.noMatch}
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
      {options.shown.map((row) => (
        <PersonRow key={row.id} locale={options.locale} placed={row} t={options.t} />
      ))}
    </ul>
  );
}

interface PagerOptions {
  at: number;
  pages: number;
  total: number;
  onPage: (page: number) => void;
  t: Dictionary;
}

const PAGER_BUTTON =
  "tap-target flex items-center gap-1 rounded-md px-2 py-1 text-sm text-muted hover:bg-surface-muted hover:text-foreground disabled:opacity-40 disabled:hover:bg-transparent";

function Pager(options: PagerOptions) {
  const t = options.t.people;
  const from = options.at * PAGE_SIZE + 1;
  const to = Math.min(options.total, from + PAGE_SIZE - 1);

  return (
    <nav className="flex items-center justify-between gap-4">
      <button
        className={PAGER_BUTTON}
        disabled={options.at === 0}
        onClick={() => options.onPage(options.at - 1)}
        type="button"
      >
        <CaretLeftIcon size={ICON_SIZE} />
        {t.previousPage}
      </button>
      <span className="text-xs text-muted">
        {format(t.page, { from: String(from), to: String(to), total: String(options.total) })}
      </span>
      <button
        className={PAGER_BUTTON}
        disabled={options.at >= options.pages - 1}
        onClick={() => options.onPage(options.at + 1)}
        type="button"
      >
        {t.nextPage}
        <CaretRightIcon size={ICON_SIZE} />
      </button>
    </nav>
  );
}
