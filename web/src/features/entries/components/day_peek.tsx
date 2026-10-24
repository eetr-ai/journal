"use client";

import { CakeIcon, NotebookIcon } from "@phosphor-icons/react";
import { useEntries } from "../entries_state";
import { dayIn } from "../days";
import { isDraft } from "../types";
import type { Dictionary } from "@/i18n/en";
import type { Locale } from "@/i18n/config";

const ICON_SIZE = 12;
const DAYS_IN_WEEK = 7;
// Columns that open the card leftward or rightward, so it stays in the drawer.
const LEFT_COLUMNS = 3;
const RIGHT_COLUMNS = 4;

export interface DayPeekOptions {
  date: string;
  /** Its place in the grid, which decides which way the card opens. */
  at: number;
  /** Whose birthday it is, by name. */
  birthdays: string[];
  written: boolean;
  locale: Locale;
  t: Dictionary;
}

function side(at: number): string {
  const column = at % DAYS_IN_WEEK;

  if (column < LEFT_COLUMNS) {
    return "left-0";
  }

  return column >= RIGHT_COLUMNS ? "right-0" : "left-1/2 -translate-x-1/2";
}

/**
 * What a day holds, on a hover or a focus: whose birthday it is and what was
 * written. Only what the drawer already holds is named; an older day the list
 * does not reach is said to have something on it rather than fetched.
 */
export default function DayPeek(options: DayPeekOptions) {
  const { state } = useEntries();
  const t = options.t.entries.days;
  const held = state.entries.filter((entry) => entry.date === options.date && !isDraft(entry));

  return (
    <div
      className={`pointer-events-none absolute top-full z-30 mt-1 w-56 rounded-lg border border-border bg-surface p-2.5 text-left shadow-lg ${side(options.at)}`}
      role="tooltip"
    >
      <p className="pb-1.5 text-xs font-semibold first-letter:uppercase">
        {dayIn(options.date, options.locale)}
      </p>
      <ul className="flex flex-col gap-1 text-xs">
        {options.birthdays.map((name) => (
          <li className="flex items-center gap-1.5" key={name}>
            <CakeIcon className="shrink-0 text-highlight" size={ICON_SIZE} weight="fill" />
            <span className="truncate">{name}</span>
          </li>
        ))}
        {held.map((entry) => {
          const opened = state.opened[entry.id];

          return (
            <li className="flex items-center gap-1.5" key={entry.id}>
              {opened?.icon ? (
                <span className="shrink-0">{opened.icon}</span>
              ) : (
                <NotebookIcon className="shrink-0 text-muted" size={ICON_SIZE} />
              )}
              <span className="truncate">{opened?.title || options.t.entries.untitled}</span>
            </li>
          );
        })}
        {options.written && held.length === 0 && <li className="text-muted">{t.written}</li>}
      </ul>
    </div>
  );
}
