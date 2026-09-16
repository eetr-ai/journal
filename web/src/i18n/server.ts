import "server-only";
import { cookies, headers } from "next/headers";
import { LOCALE_COOKIE, LOCALE_HEADER, isLocale, negotiate, type Locale } from "./config";

/**
 * The locale for this request, for a component with no route params to read it
 * from: the root layout, and the pages that render when no route matched.
 *
 * The header is the proxy's answer and is preferred wherever it exists. Routes
 * under /api are not matched by the proxy and carry none, so the same two
 * sources it would have read are resolved here in the same order — otherwise a
 * profile created on one of those paths is seeded with a language nobody asked
 * for.
 */
export async function requestLocale(): Promise<Locale> {
  const sent = await headers();
  const resolved = sent.get(LOCALE_HEADER);

  if (resolved && isLocale(resolved)) {
    return resolved;
  }

  const chosen = (await cookies()).get(LOCALE_COOKIE)?.value;

  if (chosen && isLocale(chosen)) {
    return chosen;
  }

  return negotiate(sent.get("accept-language"));
}
