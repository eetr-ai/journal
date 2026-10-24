"use client";

import DatePicker from "@/components/date_picker";
import type { PersonIssueCode } from "../rules";
import type { Dictionary } from "@/i18n/en";
import type { Locale } from "@/i18n/config";

const ID = "person-birthday";

export interface BirthdayFieldOptions {
  /** As stored: YYYY-MM-DD, MM-DD, or empty. */
  value: string;
  onChange: (value: string) => void;
  issue?: PersonIssueCode;
  locale: Locale;
  t: Dictionary;
}

/** Someone's birthday, with the year only when it is known. */
export default function BirthdayField(options: BirthdayFieldOptions) {
  const t = options.t.people;
  const invalid = options.issue ? true : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium" htmlFor={ID}>
        {t.birthday}
      </label>
      <DatePicker
        allowNoYear
        describedBy={`${ID}-note`}
        id={ID}
        invalid={invalid}
        labels={options.t.datePicker}
        locale={options.locale}
        onChange={options.onChange}
        value={options.value}
      />
      <p className={`text-xs ${invalid ? "text-accent" : "text-muted"}`} id={`${ID}-note`}>
        {invalid ? t.badBirthday : t.birthdayHint}
      </p>
    </div>
  );
}
