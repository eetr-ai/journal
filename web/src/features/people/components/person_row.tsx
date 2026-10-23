"use client";

import { CakeIcon } from "@phosphor-icons/react";
import { birthdayIn, type Placed } from "../birthdays";
import { PeopleActionType, usePeople } from "../people_state";
import { format } from "@/i18n/format";
import type { Dictionary } from "@/i18n/en";
import type { Locale } from "@/i18n/config";

const ICON_SIZE = 14;
// Past this, a countdown is noise rather than a reminder.
const COUNTDOWN_DAYS = 30;

export interface PersonRowOptions {
  placed: Placed;
  locale: Locale;
  t: Dictionary;
}

function countdown(days: number | null, t: Dictionary): string | null {
  if (days === null || days > COUNTDOWN_DAYS) {
    return null;
  }

  if (days === 0) {
    return t.people.today;
  }

  return days === 1 ? t.people.tomorrow : format(t.people.inDays, { days: String(days) });
}

export default function PersonRow(options: PersonRowOptions) {
  const { dispatch } = usePeople();
  const person = options.placed.person;
  const soon = countdown(options.placed.days, options.t);

  return (
    <li>
      <button
        className="flex w-full items-center gap-4 px-4 py-3 text-left hover:bg-surface-muted"
        onClick={() => dispatch({ type: PeopleActionType.Select, data: options.placed.id })}
        type="button"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{person.name}</span>
          {person.relation && (
            <span className="block truncate text-xs text-muted">{person.relation}</span>
          )}
        </span>
        <span className="shrink-0 text-right text-xs text-muted">
          <span className="block">
            {person.birthday
              ? birthdayIn(person.birthday, options.locale)
              : options.t.people.noBirthday}
          </span>
          {soon && (
            <span className="flex items-center justify-end gap-1 font-medium text-brand">
              <CakeIcon size={ICON_SIZE} weight="fill" />
              {soon}
            </span>
          )}
        </span>
      </button>
    </li>
  );
}
