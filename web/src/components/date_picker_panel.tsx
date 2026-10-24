"use client";

import { useState } from "react";
import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react";
import {
  gridFor,
  monthOf,
  shiftMonth,
  weekdayInitials,
  type GridDay,
  type Month,
} from "./calendar";
import { NO_YEAR, isoOf, localToday, pickedOf, storedFrom, withYear } from "./dates";
import type { Dictionary } from "@/i18n/en";
import type { Locale } from "@/i18n/config";

const ICON_SIZE = 14;
const A_MONTH = 1;
const MONTHS = 12;
// A birthday a century and more back is still somebody's.
const YEARS_BACK = 120;
const DAY_OF_MONTH = -2;
const STEP = "tap-target rounded p-1 text-muted hover:bg-surface-muted hover:text-foreground";
const SELECT =
  "rounded-md border border-border bg-surface px-1.5 py-1 text-sm outline-none focus:border-brand";

export interface DatePickerPanelOptions {
  value: string;
  locale: Locale;
  labels: Dictionary["datePicker"];
  allowNoYear: boolean;
  /** A day was picked: the panel is done. */
  onPick: (value: string) => void;
  /** The year was given or taken away; the day stays and the panel stays open. */
  onYearKnown: (value: string) => void;
}

function monthNames(locale: string): string[] {
  const format = new Intl.DateTimeFormat(locale, { month: "long", timeZone: "UTC" });

  return Array.from({ length: MONTHS }, (_, at) => format.format(Date.UTC(NO_YEAR, at, 1)));
}

function yearsBack(): number[] {
  const now = new Date().getFullYear();

  return Array.from({ length: YEARS_BACK + 1 }, (_, back) => now - back);
}

// Where the panel opens: on the date picked, else on this month.
function startingMonth(value: string): Month {
  const picked = pickedOf(value);

  return picked ? { year: picked.year ?? NO_YEAR, month: picked.month } : monthOf(localToday());
}

/** A month to pick a day from, and, when allowed, a way to leave the year out. */
export default function DatePickerPanel(options: DatePickerPanelOptions) {
  const picked = pickedOf(options.value);
  const [noYear, setNoYear] = useState(
    options.allowNoYear && picked !== null && picked.year === null,
  );
  const [month, setMonth] = useState(() => startingMonth(options.value));
  // Without a year the grid is a leap year's, so 29 February has a cell.
  const shown = noYear ? { ...month, year: NO_YEAR } : month;
  const selected = picked
    ? isoOf({ ...picked, year: picked.year ?? (noYear ? NO_YEAR : null) })
    : "";

  function toggleYear(unknown: boolean) {
    setNoYear(unknown);

    if (unknown) {
      options.onYearKnown(withYear(options.value, null));
      return;
    }

    const year = month.year === NO_YEAR ? new Date().getFullYear() : month.year;

    setMonth({ ...month, year });
    options.onYearKnown(withYear(options.value, year));
  }

  return (
    <div className="absolute top-full left-0 z-20 mt-1 w-72 max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-surface p-3 shadow-xl">
      <Heading
        labels={options.labels}
        locale={options.locale}
        month={shown}
        noYear={noYear}
        onMonth={setMonth}
      />
      <Days
        locale={options.locale}
        month={shown}
        onPick={(date) => options.onPick(storedFrom(date, !noYear))}
        selected={selected}
      />
      {options.allowNoYear && (
        <label className="mt-2 flex items-center gap-2 text-xs text-muted">
          <input
            checked={noYear}
            onChange={(event) => toggleYear(event.target.checked)}
            type="checkbox"
          />
          {options.labels.noYear}
        </label>
      )}
    </div>
  );
}

interface HeadingOptions {
  month: Month;
  noYear: boolean;
  locale: Locale;
  labels: Dictionary["datePicker"];
  onMonth: (month: Month) => void;
}

// A step either way, and a jump straight to any month and year.
function Heading(options: HeadingOptions) {
  const { month, labels } = options;

  return (
    <div className="flex items-center gap-1 pb-2">
      <button
        aria-label={labels.previous}
        className={STEP}
        onClick={() => options.onMonth(shiftMonth(month, -A_MONTH))}
        type="button"
      >
        <CaretLeftIcon size={ICON_SIZE} weight="bold" />
      </button>
      <select
        aria-label={labels.month}
        className={`${SELECT} min-w-0 flex-1 capitalize`}
        onChange={(event) => options.onMonth({ ...month, month: Number(event.target.value) })}
        value={month.month}
      >
        {monthNames(options.locale).map((name, at) => (
          <option key={name} value={at}>
            {name}
          </option>
        ))}
      </select>
      {!options.noYear && (
        <select
          aria-label={labels.year}
          className={SELECT}
          onChange={(event) => options.onMonth({ ...month, year: Number(event.target.value) })}
          value={month.year}
        >
          {yearsBack().map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      )}
      <button
        aria-label={labels.next}
        className={STEP}
        onClick={() => options.onMonth(shiftMonth(month, A_MONTH))}
        type="button"
      >
        <CaretRightIcon size={ICON_SIZE} weight="bold" />
      </button>
    </div>
  );
}

interface DaysOptions {
  month: Month;
  locale: Locale;
  /** YYYY-MM-DD of the day picked, as the grid names it. */
  selected: string;
  onPick: (date: string) => void;
}

function Days(options: DaysOptions) {
  const today = localToday();

  return (
    <>
      <div aria-hidden className="grid grid-cols-7 gap-1 pb-1 text-center text-xs text-muted">
        {weekdayInitials(options.locale).map((initial, at) => (
          <span key={`${initial}-${at}`}>{initial}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {gridFor(options.month, options.locale).map((day) => (
          <Day
            day={day}
            key={day.date}
            onPick={options.onPick}
            selected={day.date === options.selected}
            today={day.date === today}
          />
        ))}
      </div>
    </>
  );
}

interface DayOptions {
  day: GridDay;
  selected: boolean;
  today: boolean;
  onPick: (date: string) => void;
}

// Only the month's own days are offered; the ones filling the weeks are blank.
function Day(options: DayOptions) {
  if (!options.day.inMonth) {
    return <span aria-hidden />;
  }

  const tone = options.selected ? "bg-brand font-semibold text-on-brand" : "hover:bg-surface-muted";

  return (
    <button
      aria-pressed={options.selected}
      className={`grid aspect-square place-items-center rounded text-xs ${tone} ${options.today ? "ring-1 ring-highlight" : ""}`}
      onClick={() => options.onPick(options.day.date)}
      type="button"
    >
      {options.day.date.slice(DAY_OF_MONTH).replace(/^0/u, "")}
    </button>
  );
}
