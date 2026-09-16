"use client";

import { useRef, useState } from "react";
import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react";
import { useEntries } from "../entries_state";
import { useShowEntry } from "../use_show_entry";
import { entriesOnDayAction } from "../actions";
import { gridFor, monthLabel, monthOf, shiftMonth, weekdayInitials } from "../calendar";
import type { Dictionary } from "@/i18n/en";
import type { Locale } from "@/i18n/config";

const ICON_SIZE = 14;
const A_MONTH = 1;

export interface DayPickerOptions {
  t: Dictionary;
  locale: Locale;
}

/**
 * The days with something on them, as a month.
 *
 * A day nobody wrote on is not a place to go: it is shown and it does not
 * respond. `useState` for the month on screen because it is this component's
 * and nothing else asks about it — what days exist is the journal's, and comes
 * from the reducer.
 */
export default function DayPicker(options: DayPickerOptions) {
  const { state } = useEntries();
  const show = useShowEntry();
  const [month, setMonth] = useState(() => monthOf(state.today));
  // The day last asked for. Two days picked quickly can come back in the other
  // order, and the one the reader chose second is the one they want.
  const wanted = useRef("");
  const t = options.t.entries.days;
  const written = new Set(state.days);

  // A day the drawer's capped list does not hold is fetched; one it holds is
  // shown without a round trip.
  async function pick(date: string) {
    wanted.current = date;

    const held = state.entries.find((entry) => entry.date === date);
    const entry = held ?? (await entriesOnDayAction(date)).at(0);

    if (entry && wanted.current === date) {
      show(entry);
    }
  }

  return (
    <div className="border-b border-border px-4 pb-3">
      <header className="flex items-center gap-1 pb-2">
        <button
          aria-label={t.previous}
          className="rounded p-1 text-muted hover:bg-surface-muted hover:text-foreground"
          onClick={() => setMonth(shiftMonth(month, -A_MONTH))}
          type="button"
        >
          <CaretLeftIcon size={ICON_SIZE} weight="bold" />
        </button>
        <span className="flex-1 text-center text-xs font-medium">
          {monthLabel(month, options.locale)}
        </span>
        <button
          aria-label={t.next}
          className="rounded p-1 text-muted hover:bg-surface-muted hover:text-foreground"
          onClick={() => setMonth(shiftMonth(month, A_MONTH))}
          type="button"
        >
          <CaretRightIcon size={ICON_SIZE} weight="bold" />
        </button>
      </header>
      <div aria-hidden className="grid grid-cols-7 gap-0.5 pb-1 text-center text-xs text-muted">
        {weekdayInitials(options.locale).map((initial, at) => (
          <span key={`${initial}-${at}`}>{initial}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {gridFor(month, options.locale).map((day) => (
          <Cell
            day={day}
            key={day.date}
            onPick={() => void pick(day.date)}
            today={day.date === state.today}
            t={options.t}
            written={written.has(day.date)}
          />
        ))}
      </div>
    </div>
  );
}

interface CellOptions {
  day: { date: string; inMonth: boolean };
  written: boolean;
  today: boolean;
  t: Dictionary;
  onPick: () => void;
}

const DAY_OF_MONTH = -2;

function Cell(options: CellOptions) {
  const t = options.t.entries.days;
  const label = `${options.day.date} — ${options.written ? t.written : t.nothing}`;
  const number = options.day.date.slice(DAY_OF_MONTH).replace(/^0/u, "");
  const tone = options.written ? "font-semibold" : "text-muted";
  const faded = options.day.inMonth ? "" : "opacity-40";
  const ring = options.today ? "ring-1 ring-highlight" : "";

  return (
    <button
      aria-label={label}
      className={`rounded py-1 text-center text-xs ${tone} ${faded} ${ring} ${
        options.written ? "hover:bg-surface-muted" : "cursor-default"
      }`}
      disabled={!options.written}
      onClick={options.onPick}
      type="button"
    >
      {number}
    </button>
  );
}
