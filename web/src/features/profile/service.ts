import "server-only";
import { cache } from "react";
import { auth } from "@/auth";
import { requestLocale } from "@/i18n/server";
import { profileClient } from "./client";
import { configFromDraft, validateProfile, type ProfileDraft, type ProfileIssues } from "./rules";
import { defaultConfig, type Profile, type ProfileConfig } from "./types";

/**
 * The rules the BFF owns, between the session and the persistence layer.
 *
 * The subject always comes from the session. Nothing here takes one from a
 * caller, so no request can reach a profile that is not its own.
 */

/** The signed-in person's profile, created on first sight. */
export const currentProfile = cache(async (): Promise<Profile | null> => {
  const session = await auth();
  const subject = session?.user?.subject;

  if (!subject) {
    return null;
  }

  const existing = await profileClient.read(subject);

  if (existing) {
    return existing;
  }

  // First sign-in. Seed from the claims the provider gave us and the language
  // this request resolved to, and let the person correct any of it in settings.
  // The time zone is left empty for the browser to fill in; nothing here can
  // know it.
  return profileClient.save(subject, {
    email: session.user.email ?? "",
    name: session.user.name ?? "",
    config: { ...defaultConfig, language: await requestLocale() },
  });
});

/**
 * Merge a partial config into the stored profile.
 *
 * For the settings the app changes on its own — a panel a person dragged —
 * rather than the ones the settings form submits. Read-then-write because the
 * agent replaces the row wholesale.
 */
export async function updateConfig(patch: Partial<ProfileConfig>): Promise<void> {
  const current = await currentProfile();

  if (!current) {
    return;
  }

  await profileClient.save(current.subject, {
    email: current.email,
    name: current.name,
    config: { ...current.config, ...patch },
  });
}

/**
 * Adopt what the browser could tell us, for the fields nobody has chosen yet.
 *
 * Guarded field by field on the server: a value a person set is never replaced
 * by a detected one, however often the browser offers.
 */
export async function detectPreferences(detected: {
  timezone: string;
  location: string;
}): Promise<void> {
  const current = await currentProfile();

  if (!current) {
    return;
  }

  const patch: Partial<ProfileConfig> = {};

  if (current.config.timezone === "" && detected.timezone !== "") {
    patch.timezone = detected.timezone;
  }

  if (current.config.location === "" && detected.location !== "") {
    patch.location = detected.location;
  }

  if (Object.keys(patch).length > 0) {
    await updateConfig(patch);
  }
}

export type SaveOutcome =
  | { status: "saved"; profile: Profile }
  | { status: "invalid"; issues: ProfileIssues }
  | { status: "failed" };

/** Validate a submitted draft and store it against the session's subject. */
export async function saveProfile(draft: ProfileDraft): Promise<SaveOutcome> {
  const current = await currentProfile();

  if (!current) {
    return { status: "failed" };
  }

  const issues = validateProfile(draft);

  if (Object.keys(issues).length > 0) {
    return { status: "invalid", issues };
  }

  try {
    const profile = await profileClient.save(current.subject, {
      email: draft.email.trim(),
      name: draft.name.trim(),
      config: configFromDraft(draft, current.config),
    });

    return { status: "saved", profile };
  } catch {
    // The agent was unreachable or refused the write. The form says so and the
    // person can try again; there is nothing to recover here.
    return { status: "failed" };
  }
}
