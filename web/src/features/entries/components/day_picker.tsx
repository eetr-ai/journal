"use client";

import { useRef, useState } from "react";
import { CakeIcon, CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react";
import { useEntries } from "../entries_state";
import DayPeek from "./day_peek";
import { useShowEntry } from "../use_show_entry";
import { entriesOnDayAction } from "../actions";
import {
  gridFor,
  monthLabel,
  monthOf,
  shiftMonth,
  weekdayInitials,
  type Month,
} from "@/components/calendar";
import { useBirthdays } from "@/features/people/birthdays_provider";
import { birthdaysOn, type Readable } from "@/features/people/birthdays";
import { format } from "@/i18n/format";
import type { Dictionary } from "@/i18n/en";
import type { Locale } from "@/i18n/config";

const ICON_SIZE = 14;
const CAKE_SIZE = 10;
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
  const celebrated = useCelebrated(options.t.widgets.birthdays.you);

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
      <MonthHeading labels={t} locale={options.locale} month={month} onMonth={setMonth} />
      <div aria-hidden className="grid grid-cols-7 gap-1 pb-1 text-center text-xs text-muted">
        {weekdayInitials(options.locale).map((initial, at) => (
          <span key={`${initial}-${at}`}>{initial}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {gridFor(month, options.locale).map((day, at) => (
          <Cell
            at={at}
            day={day}
            key={day.date}
            locale={options.locale}
            onPick={() => void pick(day.date)}
            birthdays={birthdaysOn(celebrated, day.date).map(({ person }) => person.name)}
            today={day.date === state.today}
            t={options.t}
            written={written.has(day.date)}
          />
        ))}
      </div>
    </div>
  );
}

/** Everyone whose birthday the calendar marks, the reader listed as `you`. */
function useCelebrated(you: string): { person: Readable }[] {
  const { people, own } = useBirthdays();

  return own ? [...people, { person: { name: you, relation: "", birthday: own } }] : people;
}

interface CellOptions {
  day: { date: string; inMonth: boolean };
  at: number;
  locale: Locale;
  written: boolean;
  /** Whose birthday it is, by name. */
  birthdays: string[];
  today: boolean;
  t: Dictionary;
  onPick: () => void;
}

const DAY_OF_MONTH = -2;

// What a reader hears for a day: the date, whether anything is written, whose birthday.
function labelOf(options: CellOptions): string {
  const t = options.t.entries.days;
  const said = options.birthdays.length
    ? format(t.birthday, { names: options.birthdays.join(", ") })
    : "";

  return [options.day.date, options.written ? t.written : t.nothing, said]
    .filter(Boolean)
    .join(" — ");
}

function looksOf(options: CellOptions): string {
  const tone = options.written
    ? "font-semibold hover:bg-surface-muted"
    : "cursor-default text-muted";
  const faded = options.day.inMonth ? "" : "opacity-40";
  const ring = options.today ? "ring-1 ring-highlight" : "";

  return `relative grid aspect-square w-full place-items-center rounded text-center text-xs pointer-coarse:min-h-9 ${tone} ${faded} ${ring}`;
}

// The card opens on hover and on focus. It hangs off a wrapper, because a
// disabled button — a birthday nobody wrote on — hears no pointer at all.
function Cell(options: CellOptions) {
  const [peeking, setPeeking] = useState(false);
  const celebrating = options.birthdays.length > 0;
  const number = options.day.date.slice(DAY_OF_MONTH).replace(/^0/u, "");
  const worth = celebrating || options.written;

  return (
    <div
      className="relative"
      onBlur={() => setPeeking(false)}
      onFocus={() => setPeeking(true)}
      onPointerEnter={() => setPeeking(true)}
      onPointerLeave={() => setPeeking(false)}
    >
      <button
        aria-label={labelOf(options)}
        className={looksOf(options)}
        disabled={!options.written}
        onClick={options.onPick}
        type="button"
      >
        {number}
        {celebrating && (
          <CakeIcon
            aria-hidden
            className="absolute top-0 right-0 text-highlight"
            size={CAKE_SIZE}
            weight="fill"
          />
        )}
      </button>
      {peeking && worth && (
        <DayPeek
          at={options.at}
          birthdays={options.birthdays}
          date={options.day.date}
          locale={options.locale}
          t={options.t}
          written={options.written}
        />
      )}
    </div>
  );
}

interface MonthHeadingOptions {
  month: Month;
  locale: Locale;
  labels: Dictionary["entries"]["days"];
  onMonth: (month: Month) => void;
}

function MonthHeading(options: MonthHeadingOptions) {
  return (
    <header className="flex items-center gap-1 pb-2">
      <button
        aria-label={options.labels.previous}
        className="tap-target rounded p-1 text-muted hover:bg-surface-muted hover:text-foreground"
        onClick={() => options.onMonth(shiftMonth(options.month, -A_MONTH))}
        type="button"
      >
        <CaretLeftIcon size={ICON_SIZE} weight="bold" />
      </button>
      <span className="flex-1 text-center text-xs font-medium">
        {monthLabel(options.month, options.locale)}
      </span>
      <button
        aria-label={options.labels.next}
        className="tap-target rounded p-1 text-muted hover:bg-surface-muted hover:text-foreground"
        onClick={() => options.onMonth(shiftMonth(options.month, A_MONTH))}
        type="button"
      >
        <CaretRightIcon size={ICON_SIZE} weight="bold" />
      </button>
    </header>
  );
}
