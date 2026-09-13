// The locales the app ships. Adding a third is this array, a dictionary module,
// and nothing else — every other file reads the locale list from here.
export const locales = ["en", "es"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

// Picks the best locale from an Accept-Language header. Deliberately naive: we
// look at the language subtag only, in the order the browser ranked them, and
// ignore q-values. With two locales the difference never shows, and this is a
// dozen lines instead of a dependency.
export function negotiate(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) {
    return defaultLocale;
  }

  for (const part of acceptLanguage.split(",")) {
    // "es-419;q=0.8" -> "es"
    const tag = part.trim().split(";")[0].split("-")[0].toLowerCase();

    if (isLocale(tag)) {
      return tag;
    }
  }

  return defaultLocale;
}
