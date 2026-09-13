"use client";

import { usePathname, useRouter } from "next/navigation";
import { LOCALE_COOKIE, locales, type Locale } from "@/i18n/config";

export interface LanguagePickerOptions {
  current: Locale;
  label: string;
}

const names: Record<Locale, string> = { en: "English", es: "Español" };

// One year in seconds.
const COOKIE_MAX_AGE_SECONDS = 31_536_000;

// The path segment the locale occupies: /{locale}/rest.
const LOCALE_SEGMENT = 1;

export default function LanguagePicker(options: LanguagePickerOptions) {
  const pathname = usePathname();
  const router = useRouter();

  // The cookie is what a later request with no locale in the path reads back;
  // swapping the first segment is what moves the page you are on right now.
  function choose(locale: Locale) {
    document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${COOKIE_MAX_AGE_SECONDS}; samesite=lax`;

    const segments = pathname.split("/");
    segments[LOCALE_SEGMENT] = locale;

    router.push(segments.join("/"));
    router.refresh();
  }

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
            {names[locale]}
          </option>
        ))}
      </select>
    </label>
  );
}
