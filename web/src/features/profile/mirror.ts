import "server-only";
import { LOCALE_COOKIE } from "@/i18n/config";
import { THEME_COOKIE } from "@/theme/config";
import type { ProfileConfig } from "./types";

// One year in seconds.
const COOKIE_MAX_AGE_SECONDS = 31_536_000;

const OPTIONS = { path: "/", maxAge: COOKIE_MAX_AGE_SECONDS, sameSite: "lax" as const };

/** A cookie jar or a response — both write a cookie the same way. */
interface CookieWriter {
  set(name: string, value: string, options: typeof OPTIONS): unknown;
}

/**
 * The two settings the first paint needs before any session has been resolved.
 *
 * They are copies of the profile and never a preference of their own, so they
 * are written wherever the profile is settled and read nowhere else as truth.
 * What they said before a sign-in belongs to whoever used this browser last.
 */
export function mirrorProfile(into: CookieWriter, config: ProfileConfig): void {
  into.set(THEME_COOKIE, config.theme, OPTIONS);
  into.set(LOCALE_COOKIE, config.language, OPTIONS);
}
