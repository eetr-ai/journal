"use server";

import { cookies } from "next/headers";
import { THEME_COOKIE } from "@/theme/config";
import { LOCALE_COOKIE } from "@/i18n/config";
import { saveProfile, updateConfig, type SaveOutcome } from "./service";
import { clampTodayWidth } from "./types";
import type { ProfileDraft } from "./rules";

// One year in seconds.
const COOKIE_MAX_AGE_SECONDS = 31_536_000;

/**
 * Store a submitted profile and mirror the two settings the first paint needs
 * into cookies, which the layout can read before any session is resolved.
 */
export async function saveProfileAction(draft: ProfileDraft): Promise<SaveOutcome> {
  const outcome = await saveProfile(draft);

  if (outcome.status !== "saved") {
    return outcome;
  }

  const jar = await cookies();
  const options = { path: "/", maxAge: COOKIE_MAX_AGE_SECONDS, sameSite: "lax" as const };

  jar.set(THEME_COOKIE, outcome.profile.config.theme, options);
  jar.set(LOCALE_COOKIE, outcome.profile.config.language, options);

  return outcome;
}

/**
 * Remember how wide the today panel was left. Called once when a drag ends, not
 * while it is moving.
 */
export async function saveTodayWidthAction(width: number): Promise<void> {
  await updateConfig({ todayWidth: clampTodayWidth(width) });
}
