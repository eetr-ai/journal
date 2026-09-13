import type { Dictionary } from "./en";
import type { Locale } from "./config";
import en from "./en";
import es from "./es";

const dictionaries: Record<Locale, Dictionary> = { en, es };

export function dictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}

// Fills {name}-style placeholders. The whole templating story: the dictionaries
// are ours, so there is no untrusted input here and no reason for anything
// cleverer than a replace.
export function format(template: string, values: Record<string, string>): string {
  let ret = template;

  for (const [key, value] of Object.entries(values)) {
    ret = ret.replaceAll(`{${key}}`, value);
  }

  return ret;
}

export type { Dictionary };
