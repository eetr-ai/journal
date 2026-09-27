import type { Dictionary } from "./en";
import type { Locale } from "./config";
import en from "./en";
import es from "./es";

const dictionaries: Record<Locale, Dictionary> = { en, es };

export function dictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}

export { format } from "./format";

export type { Dictionary };
