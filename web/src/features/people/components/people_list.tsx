"use client";

import { useMemo } from "react";
import { UserPlusIcon } from "@phosphor-icons/react";
import { momentFor } from "@/features/chat/now";
import PersonRow from "./person_row";
import { daysUntil, soonestFirst, type Placed } from "../birthdays";
import { NEW_PERSON, PeopleActionType, usePeople, type PeopleUiState } from "../people_state";
import type { Dictionary } from "@/i18n/en";
import type { Locale } from "@/i18n/config";

const ICON_SIZE = 16;

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

export default function PeopleList(options: PeopleListOptions) {
  const { state, dispatch } = usePeople();
  const t = options.t;
  // The reader's day, not the server's: near midnight the two are different
  // days, and a birthday is the reader's to count.
  const today = useMemo(() => momentFor(options.timezone).date, [options.timezone]);
  const rows = placed(state, today);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <button
          className="flex items-center gap-2 rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-on-brand transition hover:bg-brand-strong"
          onClick={() => dispatch({ type: PeopleActionType.Select, data: NEW_PERSON })}
          type="button"
        >
          <UserPlusIcon size={ICON_SIZE} weight="bold" />
          {t.people.add}
        </button>
      </div>

      {state.people.length === 0 ? (
        <p className="text-sm text-muted">{t.people.empty}</p>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
          {rows.map((row) => (
            <PersonRow key={row.id} locale={options.locale} placed={row} t={t} />
          ))}
        </ul>
      )}
    </div>
  );
}
