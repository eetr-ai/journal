import { isLocale, locales } from "@/i18n/config";
import { isTheme, themes, type Theme } from "@/theme/config";
import { sexes, treatments, type ProfileConfig, type Sex, type Treatment } from "./types";
import type { Locale } from "@/i18n/config";

/**
 * The rules that decide whether a profile may be stored. They live here rather
 * than in the persistence layer, which will write whatever it is handed.
 */
export type IssueCode = "required" | "tooLong" | "notAllowed" | "badEmail" | "badTimezone";

/** A profile as the form submits it: every field is still a string. */
export interface ProfileDraft {
  name: string;
  email: string;
  pronouns: string;
  sex: string;
  treatment: string;
  language: string;
  location: string;
  timezone: string;
  theme: string;
}

export type ProfileIssues = Partial<Record<keyof ProfileDraft, IssueCode>>;

const MAX_NAME = 120;
const MAX_PRONOUNS = 40;
const MAX_LOCATION = 120;
const MAX_EMAIL = 320;

// Deliberately loose. An address is proven by sending mail to it, so the only
// thing worth rejecting here is something that cannot be an address at all.
const EMAIL_SHAPE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function requiredText(value: string, limit: number): IssueCode | undefined {
  if (value.trim() === "") {
    return "required";
  }

  return value.length > limit ? "tooLong" : undefined;
}

function optionalText(value: string, limit: number): IssueCode | undefined {
  return value.length > limit ? "tooLong" : undefined;
}

function email(value: string): IssueCode | undefined {
  const missing = requiredText(value, MAX_EMAIL);

  if (missing) {
    return missing;
  }

  return EMAIL_SHAPE.test(value.trim()) ? undefined : "badEmail";
}

/**
 * Accepts anything the runtime's own time zone database knows, so the list is
 * never ours to maintain. An unknown zone makes the formatter throw.
 */
function timezone(value: string): IssueCode | undefined {
  const missing = requiredText(value, MAX_NAME);

  if (missing) {
    return missing;
  }

  try {
    // Called rather than constructed: the point is the throw, and `new` for a
    // value nobody reads is what the linter objects to.
    Intl.DateTimeFormat("en", { timeZone: value.trim() });
    return undefined;
  } catch {
    return "badTimezone";
  }
}

function choice(allowed: readonly string[], value: string): IssueCode | undefined {
  return allowed.includes(value) ? undefined : "notAllowed";
}

function record(issues: ProfileIssues, field: keyof ProfileDraft, code: IssueCode | undefined) {
  if (code) {
    issues[field] = code;
  }
}

/** Every problem with a draft, keyed by field. An empty object means it is good. */
export function validateProfile(draft: ProfileDraft): ProfileIssues {
  const ret: ProfileIssues = {};

  record(ret, "name", requiredText(draft.name, MAX_NAME));
  record(ret, "email", email(draft.email));
  record(ret, "pronouns", optionalText(draft.pronouns, MAX_PRONOUNS));
  record(ret, "location", optionalText(draft.location, MAX_LOCATION));
  record(ret, "timezone", timezone(draft.timezone));
  record(ret, "sex", choice(sexes, draft.sex));
  record(ret, "treatment", choice(treatments, draft.treatment));
  record(ret, "language", choice(locales, draft.language));
  record(ret, "theme", choice(themes, draft.theme));

  return ret;
}

/**
 * The config a validated draft describes, over the config it is replacing.
 *
 * `base` carries through everything the form does not own — panel widths and
 * anything else the app stores about a person — so saving settings cannot quietly
 * drop it. Only call this on a draft `validateProfile` accepted: the casts below
 * are sound exactly because the choice fields were checked against the same lists.
 */
export function configFromDraft(draft: ProfileDraft, base: ProfileConfig): ProfileConfig {
  return {
    ...base,
    pronouns: draft.pronouns.trim(),
    sex: draft.sex as Sex,
    treatment: draft.treatment as Treatment,
    language: isLocale(draft.language) ? (draft.language as Locale) : locales[0],
    location: draft.location.trim(),
    timezone: draft.timezone.trim(),
    theme: isTheme(draft.theme) ? (draft.theme as Theme) : themes[0],
  };
}
