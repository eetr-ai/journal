import { defaultLocale, isLocale, type Locale } from "@/i18n/config";
import { defaultTheme, isTheme, type Theme } from "@/theme/config";

export const sexes = ["female", "male", "intersex", "undisclosed"] as const;
export type Sex = (typeof sexes)[number];

// The grammatical gender the journal writes in. Separate from `sex` on purpose:
// the two do not have to agree, and only this one changes any wording.
export const treatments = ["female", "male", "neutral"] as const;
export type Treatment = (typeof treatments)[number];

// The width of the today panel, in pixels. Bounded here rather than in the
// browser so a hand-edited row cannot produce a layout nobody can recover from.
export const MIN_TODAY_WIDTH = 280;
export const MAX_TODAY_WIDTH = 1200;
export const DEFAULT_TODAY_WIDTH = 800;

export function clampTodayWidth(value: number): number {
  return Math.min(Math.max(Math.round(value), MIN_TODAY_WIDTH), MAX_TODAY_WIDTH);
}

/** Everything a person chooses about themselves. Stored as one jsonb column. */
export interface ProfileConfig {
  pronouns: string;
  sex: Sex;
  treatment: Treatment;
  language: Locale;
  location: string;
  timezone: string;
  theme: Theme;
  todayWidth: number;
}

/** A person, as the rest of the app thinks about one. */
export interface Profile {
  id: string;
  subject: string;
  email: string;
  name: string;
  config: ProfileConfig;
}

/**
 * The row as the agent hands it back. `config` arrives as the text the driver
 * read out of the jsonb column, not as an object.
 */
export interface ProfileEntity {
  id: string;
  oidc_subject: string;
  email: string;
  name: string;
  config: string;
  created_at: string;
  updated_at: string;
}

export const defaultConfig: ProfileConfig = {
  pronouns: "",
  sex: "undisclosed",
  treatment: "neutral",
  language: defaultLocale,
  location: "",
  timezone: "UTC",
  theme: defaultTheme,
  todayWidth: DEFAULT_TODAY_WIDTH,
};

function oneOf<T extends string>(allowed: readonly T[], value: unknown, fallback: T): T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

function text(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

/**
 * Reads a stored config back into its typed shape, replacing anything it does
 * not recognise with the default for that field.
 *
 * Deliberately total: a profile written by an older version of this app, or
 * edited by hand in psql, has to render rather than throw.
 */
export function configFromJson(raw: string): ProfileConfig {
  let parsed: Record<string, unknown> = {};

  try {
    const value: unknown = JSON.parse(raw);

    if (value !== null && typeof value === "object") {
      parsed = value as Record<string, unknown>;
    }
  } catch {
    // An unparseable config is a corrupt row, not a reason to fail the request.
  }

  return {
    pronouns: text(parsed.pronouns, defaultConfig.pronouns),
    sex: oneOf(sexes, parsed.sex, defaultConfig.sex),
    treatment: oneOf(treatments, parsed.treatment, defaultConfig.treatment),
    language: isLocale(String(parsed.language))
      ? (parsed.language as Locale)
      : defaultConfig.language,
    location: text(parsed.location, defaultConfig.location),
    timezone: text(parsed.timezone, defaultConfig.timezone),
    theme: isTheme(String(parsed.theme)) ? (parsed.theme as Theme) : defaultConfig.theme,
    todayWidth:
      typeof parsed.todayWidth === "number"
        ? clampTodayWidth(parsed.todayWidth)
        : defaultConfig.todayWidth,
  };
}

export function profileFromEntity(entity: ProfileEntity): Profile {
  return {
    id: entity.id,
    subject: entity.oidc_subject,
    email: entity.email,
    name: entity.name,
    config: configFromJson(entity.config),
  };
}
