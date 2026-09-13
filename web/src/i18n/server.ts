import "server-only";
import { headers } from "next/headers";
import { LOCALE_HEADER, defaultLocale, isLocale, type Locale } from "./config";

/**
 * The locale for this request, for a component with no route params to read it
 * from: the root layout, and the pages that render when no route matched.
 */
export async function requestLocale(): Promise<Locale> {
  const value = (await headers()).get(LOCALE_HEADER);

  return value && isLocale(value) ? value : defaultLocale;
}
