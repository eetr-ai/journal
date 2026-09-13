"use client";

import SelectField from "./select_field";
import SettingsSection from "./settings_section";
import TextField from "./text_field";
import { sexes, treatments } from "../types";
import { themes } from "@/theme/config";
import { locales } from "@/i18n/config";
import { timezoneOptions } from "../timezones";
import { useSettings } from "../settings_state";
import type { Dictionary } from "@/i18n/en";
import type { ProfileDraft } from "../rules";

export interface SettingsFieldsOptions {
  t: Dictionary;
}

const localeNames: Record<string, string> = { en: "English", es: "Español" };

function labelled(values: readonly string[], names: Record<string, string>) {
  return values.map((value) => ({ value, label: names[value] ?? value }));
}

/**
 * The message for whatever the server said about a field, or nothing. An issue
 * code is also its dictionary key, so a new rule needs no mapping table here.
 */
function useFieldError(t: Dictionary) {
  const { state } = useSettings();

  return function error(field: keyof ProfileDraft): string | undefined {
    const code = state.issues[field];

    return code ? t.validation[code] : undefined;
  };
}

function Identity(options: SettingsFieldsOptions) {
  const error = useFieldError(options.t);
  const t = options.t;

  return (
    <SettingsSection title={t.profile.identity}>
      <TextField error={error("name")} field="name" label={t.profile.name} />
      <TextField error={error("email")} field="email" label={t.profile.email} type="email" />
    </SettingsSection>
  );
}

function Preferences(options: SettingsFieldsOptions) {
  const { state } = useSettings();
  const error = useFieldError(options.t);
  const t = options.t;

  return (
    <SettingsSection title={t.profile.preferences}>
      <TextField
        error={error("pronouns")}
        field="pronouns"
        hint={t.profile.pronounsHint}
        label={t.profile.pronouns}
        suggestions={t.profile.pronounOptions}
      />
      <SelectField
        error={error("sex")}
        field="sex"
        label={t.profile.sex}
        options={labelled(sexes, t.values.sex)}
      />
      <SelectField
        error={error("treatment")}
        field="treatment"
        hint={t.profile.treatmentHint}
        label={t.profile.treatment}
        options={labelled(treatments, t.values.treatment)}
      />
      <SelectField
        error={error("language")}
        field="language"
        label={t.language}
        options={labelled(locales, localeNames)}
      />
      <TextField
        error={error("location")}
        field="location"
        hint={t.profile.locationHint}
        label={t.profile.locationLabel}
      />
      <SelectField
        error={error("timezone")}
        field="timezone"
        label={t.profile.timezone}
        options={timezoneOptions(state.draft.timezone).map((zone) => ({
          value: zone,
          label: zone.replaceAll("_", " "),
        }))}
      />
    </SettingsSection>
  );
}

function Appearance(options: SettingsFieldsOptions) {
  const error = useFieldError(options.t);
  const t = options.t;

  return (
    <SettingsSection title={t.profile.appearance}>
      <SelectField
        error={error("theme")}
        field="theme"
        label={t.profile.theme}
        options={labelled(themes, t.values.theme)}
      />
    </SettingsSection>
  );
}

export default function SettingsFields(options: SettingsFieldsOptions) {
  return (
    <>
      <Identity t={options.t} />
      <Preferences t={options.t} />
      <Appearance t={options.t} />
    </>
  );
}
