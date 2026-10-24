"use client";

import { useState } from "react";
import { daysIn, monthNames, picksOf, storedOf, type BirthdayPicks } from "../birthday_parts";
import type { PersonIssueCode } from "../rules";
import type { Dictionary } from "@/i18n/en";
import type { Locale } from "@/i18n/config";

const ID = "person-birthday";
const CONTROL =
  "rounded-lg border border-border bg-surface px-3 py-2 text-base outline-none focus:border-brand focus:ring-2 focus:ring-brand/30 md:text-sm aria-[invalid]:border-accent";
const YEAR_DIGITS = 4;

export interface BirthdayFieldOptions {
  /** As stored: YYYY-MM-DD, MM-DD, or empty. */
  value: string;
  onChange: (value: string) => void;
  issue?: PersonIssueCode;
  locale: Locale;
  t: Dictionary;
}

/**
 * Day and month, and the year only when it is known — which a native date
 * input cannot say. The picks are this field's own; what leaves is the stored form.
 */
export default function BirthdayField(options: BirthdayFieldOptions) {
  const [picks, setPicks] = useState(() => picksOf(options.value));
  const t = options.t.people;
  const invalid = options.issue ? true : undefined;
  const days = daysIn(picks.month, picks.year);

  function pick(change: Partial<BirthdayPicks>) {
    const next = { ...picks, ...change };
    // A day the month does not have is let go rather than kept out of sight.
    const fits = Number(next.day) <= daysIn(next.month, next.year);
    const settled = fits ? next : { ...next, day: "" };

    setPicks(settled);
    options.onChange(storedOf(settled));
  }

  return (
    <fieldset aria-describedby={`${ID}-note`} className="flex flex-col gap-1.5">
      <legend className="mb-1.5 text-sm font-medium">{t.birthday}</legend>
      <div className="grid grid-cols-[4.5rem_1fr_5.5rem] gap-2">
        <NumberPick
          count={days}
          invalid={invalid}
          label={t.birthdayDay}
          onPick={(day) => pick({ day })}
          value={picks.day}
        />
        <select
          aria-invalid={invalid}
          aria-label={t.birthdayMonth}
          className={CONTROL}
          onChange={(event) => pick({ month: event.target.value })}
          value={picks.month}
        >
          <option value="">{t.birthdayMonth}</option>
          {monthNames(options.locale).map((name, at) => (
            <option key={name} value={String(at + 1)}>
              {name}
            </option>
          ))}
        </select>
        <input
          aria-invalid={invalid}
          aria-label={t.birthdayYear}
          className={CONTROL}
          inputMode="numeric"
          maxLength={YEAR_DIGITS}
          onChange={(event) => pick({ year: event.target.value.replace(/\D/gu, "") })}
          placeholder={t.birthdayYear}
          value={picks.year}
        />
      </div>
      <p className={`text-xs ${invalid ? "text-accent" : "text-muted"}`} id={`${ID}-note`}>
        {invalid ? t.badBirthday : t.birthdayHint}
      </p>
    </fieldset>
  );
}

interface NumberPickOptions {
  label: string;
  count: number;
  value: string;
  invalid?: boolean;
  onPick: (value: string) => void;
}

// 1 to `count`, with the label standing in for nothing picked.
function NumberPick(options: NumberPickOptions) {
  return (
    <select
      aria-invalid={options.invalid}
      aria-label={options.label}
      className={CONTROL}
      onChange={(event) => options.onPick(event.target.value)}
      value={options.value}
    >
      <option value="">{options.label}</option>
      {Array.from({ length: options.count }, (_, at) => String(at + 1)).map((day) => (
        <option key={day} value={day}>
          {day}
        </option>
      ))}
    </select>
  );
}
