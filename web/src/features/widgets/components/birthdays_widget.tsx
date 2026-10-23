"use client";

import Link from "next/link";
import { CakeIcon } from "@phosphor-icons/react";
import { useChatSender } from "@/features/chat/chat_sender";
import { birthdayOn, type Upcoming } from "@/features/people/birthdays";
import { useViewHref } from "@/features/shell/use_view_href";
import WidgetFrame, { WIDGET_BUTTON, WIDGET_PRIMARY } from "./widget_frame";
import { format } from "@/i18n/format";
import type { Dictionary } from "@/i18n/en";
import type { Locale } from "@/i18n/config";

const ICON_SIZE = 14;

export interface BirthdaysWidgetOptions {
  /** Soonest first, as many as the card should hold. */
  birthdays: Upcoming[];
  locale: Locale;
  t: Dictionary;
}

/** Birthdays coming up as a card, each one a way to ask the journal for help with it. */
export default function BirthdaysWidget(options: BirthdaysWidgetOptions) {
  const href = useViewHref();
  const t = options.t.widgets.birthdays;

  return (
    <WidgetFrame
      actions={
        <Link className={WIDGET_BUTTON} href={href(`/${options.locale}/people`)}>
          {t.everyone}
        </Link>
      }
      label={<span className="font-semibold text-brand-strong">{t.label}</span>}
    >
      <ul className="flex flex-col divide-y divide-border">
        {options.birthdays.map((birthday) => (
          <BirthdayRow
            birthday={birthday}
            key={birthday.id}
            locale={options.locale}
            t={options.t}
          />
        ))}
      </ul>
    </WidgetFrame>
  );
}

function whenText(days: number, t: Dictionary["widgets"]["birthdays"]): string {
  if (days === 0) {
    return t.today;
  }

  return days === 1 ? t.tomorrow : format(t.inDays, { days: String(days) });
}

interface BirthdayRowOptions {
  birthday: Upcoming;
  locale: Locale;
  t: Dictionary;
}

// Today's are the ones that cannot wait, so they carry the highlight and the
// card's one primary button.
function BirthdayRow(options: BirthdayRowOptions) {
  const { tap } = useChatSender();
  const { id, person, days, on, turns } = options.birthday;
  const t = options.t.widgets.birthdays;
  const today = days === 0;

  return (
    <li className="flex items-center gap-3 py-2">
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-1.5">
          {today ? (
            <CakeIcon
              className="shrink-0 self-center text-highlight"
              size={ICON_SIZE}
              weight="fill"
            />
          ) : null}
          {/* The name keeps its room; who they are gives way first. */}
          <span className="max-w-full shrink-0 truncate text-sm font-medium">{person.name}</span>
          {person.relation ? (
            <span className="min-w-0 truncate text-xs text-muted">{person.relation}</span>
          ) : null}
        </span>
        <span className="block text-xs text-muted">
          <span className={`font-medium ${today ? "text-highlight" : "text-brand"}`}>
            {whenText(days, t)}
          </span>
          {" · "}
          <time dateTime={on}>{birthdayOn(on, options.locale)}</time>
          {turns === null ? null : (
            <>
              {" · "}
              <span className="whitespace-nowrap">{format(t.turns, { age: String(turns) })}</span>
            </>
          )}
        </span>
      </span>
      <button
        className={`shrink-0 ${today ? WIDGET_PRIMARY : WIDGET_BUTTON}`}
        onClick={() => void tap({ widget: "birthday", act: "talk", id, date: on })}
        type="button"
      >
        {t.talk}
      </button>
    </li>
  );
}
