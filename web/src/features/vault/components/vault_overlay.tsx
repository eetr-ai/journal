"use client";

import OverlayDialog from "@/components/overlay_dialog";
import VaultSettings from "./vault_settings";
import type { Dictionary } from "@/i18n/en";
import type { Locale } from "@/i18n/config";
import type { VaultIdentity } from "../use_vault_operations";
import type { Vault, VaultPasskey } from "../types";

export interface VaultOverlayOptions {
  t: Dictionary;
  locale: Locale;
  identity: VaultIdentity;
  vault: Vault;
  passkeys: VaultPasskey[];
}

/** Private storage on its own, rather than a section at the bottom of settings. */
export default function VaultOverlay(options: VaultOverlayOptions) {
  return (
    <OverlayDialog
      closeHref={`/${options.locale}`}
      closeLabel={options.t.close}
      subtitle={options.t.vault.summary}
      title={options.t.vault.title}
    >
      <VaultSettings
        identity={options.identity}
        passkeys={options.passkeys}
        t={options.t}
        vault={options.vault}
      />
    </OverlayDialog>
  );
}
