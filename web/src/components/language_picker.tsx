"use client";

import { locales, type Locale } from "@/i18n/config";
import { localeNames, useChooseLocale } from "@/i18n/use_choose_locale";

export interface LanguagePickerOptions {
  current: Locale;
  label: string;
}

/** The standalone control, for pages with no menu to put the choice in. */
export default function LanguagePicker(options: LanguagePickerOptions) {
  const choose = useChooseLocale();

  return (
    <label className="flex items-center gap-2 text-xs text-muted">
      <span className="sr-only">{options.label}</span>
      <select
        className="rounded-lg border border-border bg-surface px-2 py-1 text-xs text-foreground outline-none focus:border-brand"
        onChange={(event) => choose(event.target.value as Locale)}
        value={options.current}
      >
        {locales.map((locale) => (
          <option key={locale} value={locale}>
            {localeNames[locale]}
          </option>
        ))}
      </select>
    </label>
  );
}
