"use client";

import { SimpleProvider } from "@eetr/react-reducer-utils";
import SettingsBody from "./settings_body";
import { draftFromProfile } from "../draft";
import {
  initialSettingsState,
  settingsReducer,
  SettingsDispatchContext,
  SettingsStateContext,
} from "../settings_state";
import type { Dictionary } from "@/i18n/en";
import type { Locale } from "@/i18n/config";
import type { Profile } from "../types";

export interface SettingsFormOptions {
  profile: Profile;
  t: Dictionary;
  locale: Locale;
}

// SimpleProvider rather than bootstrapProvider: the initial state is the stored
// profile, which is only known per request, and bootstrapProvider fixes it at
// module scope.
export default function SettingsForm(options: SettingsFormOptions) {
  return (
    <SimpleProvider
      dispatchContext={SettingsDispatchContext}
      initialState={initialSettingsState(draftFromProfile(options.profile))}
      reducer={settingsReducer}
      stateContext={SettingsStateContext}
    >
      <SettingsBody locale={options.locale} t={options.t} />
    </SimpleProvider>
  );
}
