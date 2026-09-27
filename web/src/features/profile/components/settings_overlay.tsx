"use client";

import OverlayDialog from "@/components/overlay_dialog";
import SettingsForm from "./settings_form";
import { useViewHref } from "@/features/shell/use_view_href";
import type { Dictionary } from "@/i18n/en";
import type { Locale } from "@/i18n/config";
import type { Profile } from "../types";

export interface SettingsOverlayOptions {
  profile: Profile;
  t: Dictionary;
  locale: Locale;
}

export default function SettingsOverlay(options: SettingsOverlayOptions) {
  const href = useViewHref();

  return (
    <OverlayDialog
      closeHref={href(`/${options.locale}`)}
      closeLabel={options.t.close}
      subtitle={options.t.profile.subtitle}
      title={options.t.profile.title}
    >
      <SettingsForm locale={options.locale} profile={options.profile} t={options.t} />
    </OverlayDialog>
  );
}
