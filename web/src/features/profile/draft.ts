import type { ProfileDraft } from "./rules";
import type { Profile } from "./types";

/** The form's view of a stored profile. */
export function draftFromProfile(profile: Profile): ProfileDraft {
  return {
    name: profile.name,
    email: profile.email,
    pronouns: profile.config.pronouns,
    sex: profile.config.sex,
    treatment: profile.config.treatment,
    language: profile.config.language,
    location: profile.config.location,
    timezone: profile.config.timezone,
    theme: profile.config.theme,
  };
}
