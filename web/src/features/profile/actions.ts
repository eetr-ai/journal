"use server";

import { cookies } from "next/headers";
import { mirrorProfile } from "./mirror";
import { detectPreferences, saveProfile, updateConfig, type SaveOutcome } from "./service";
import { clampTodayWidth } from "./types";
import type { ProfileDraft } from "./rules";

/**
 * Store a submitted profile and mirror the two settings the first paint needs
 * into cookies, which the layout can read before any session is resolved.
 */
export async function saveProfileAction(draft: ProfileDraft): Promise<SaveOutcome> {
  const outcome = await saveProfile(draft);

  if (outcome.status !== "saved") {
    return outcome;
  }

  mirrorProfile(await cookies(), outcome.profile.config);

  return outcome;
}

/**
 * Remember how wide the today panel was left. Called once when a drag ends, not
 * while it is moving.
 */
export async function saveTodayWidthAction(width: number): Promise<void> {
  await updateConfig({ todayWidth: clampTodayWidth(width) });
}

/** Store what the browser could tell us about fields nobody has chosen yet. */
export async function detectPreferencesAction(detected: {
  timezone: string;
  location: string;
}): Promise<void> {
  await detectPreferences(detected);
}
