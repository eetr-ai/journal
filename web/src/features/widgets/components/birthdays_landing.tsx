"use client";

import BirthdaysWidget from "./birthdays_widget";
import { useUpcomingBirthdays } from "../use_upcoming_birthdays";
import type { Dictionary } from "@/i18n/en";
import type { Locale } from "@/i18n/config";

export interface BirthdaysLandingOptions {
  /** The reader's zone, which "today" is counted in. */
  timezone: string;
  locale: Locale;
  t: Dictionary;
}

/**
 * The birthdays coming up, for a conversation that has not started.
 *
 * An invitation, not the page: nobody near, nobody readable, a locked vault or
 * a failed fetch all show nothing, and the conversation works without it.
 */
export default function BirthdaysLanding(options: BirthdaysLandingOptions) {
  const birthdays = useUpcomingBirthdays(options.timezone, options.t.widgets.birthdays.you);

  if (birthdays.length === 0) {
    return null;
  }

  return <BirthdaysWidget birthdays={birthdays} locale={options.locale} t={options.t} />;
}
