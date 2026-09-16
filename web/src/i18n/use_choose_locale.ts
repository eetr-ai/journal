"use client";

import { usePathname, useRouter } from "next/navigation";
import { LOCALE_COOKIE, type Locale } from "./config";

// One year in seconds.
const COOKIE_MAX_AGE_SECONDS = 31_536_000;

// The path segment the locale occupies: /{locale}/rest.
const LOCALE_SEGMENT = 1;

/**
 * Switches the app's language.
 *
 * The cookie is what a later request with no locale in the path reads back;
 * swapping the first segment is what moves the page you are on right now.
 */
export function useChooseLocale() {
  const pathname = usePathname();
  const router = useRouter();

  return function choose(locale: Locale) {
    document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${COOKIE_MAX_AGE_SECONDS}; samesite=lax`;

    const segments = pathname.split("/");
    segments[LOCALE_SEGMENT] = locale;

    router.push(segments.join("/"));
    router.refresh();
  };
}

export const localeNames: Record<Locale, string> = {
  en: "English",
  es: "Español",
};
