"use client";

import SelectField from "./select_field";
import SettingsSection from "./settings_section";
import TextField from "./text_field";
import DatePicker from "@/components/date_picker";
import { SettingsActionType } from "../settings_state";
import type { Locale } from "@/i18n/config";
import { sexes, treatments } from "../types";
import { themes } from "@/theme/config";
import { locales } from "@/i18n/config";
import { timezoneOptions } from "../timezones";
import { useSettings } from "../settings_state";
import type { Dictionary } from "@/i18n/en";
import type { ProfileDraft } from "../rules";

export interface SettingsFieldsOptions {
  t: Dictionary;
  locale: Locale;
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

const BIRTHDAY_ID = "profile-birthday";

// Sealed, so it can be edited only once this browser has opened it.
function AboutYou(options: SettingsFieldsOptions) {
  const { state, dispatch } = useSettings();
  const error = useFieldError(options.t)("birthday");
  const t = options.t;

  return (
    <SettingsSection title={t.profile.aboutYou}>
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" htmlFor={BIRTHDAY_ID}>
          {t.profile.birthday}
        </label>
        <DatePicker
          describedBy={`${BIRTHDAY_ID}-note`}
          disabled={state.facts !== "open"}
          id={BIRTHDAY_ID}
          invalid={error ? true : undefined}
          labels={t.datePicker}
          locale={options.locale}
          onChange={(value) =>
            dispatch({ type: SettingsActionType.Edit, data: { field: "birthday", value } })
          }
          value={state.draft.birthday}
        />
        <p className={`text-xs ${error ? "text-accent" : "text-muted"}`} id={`${BIRTHDAY_ID}-note`}>
          {error ?? (state.facts === "sealed" ? t.profile.birthdaySealed : t.profile.birthdayHint)}
        </p>
      </div>
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
      <Identity locale={options.locale} t={options.t} />
      <AboutYou locale={options.locale} t={options.t} />
      <Preferences locale={options.locale} t={options.t} />
      <Appearance locale={options.locale} t={options.t} />
    </>
  );
}
