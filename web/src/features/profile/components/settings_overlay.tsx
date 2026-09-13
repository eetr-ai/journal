"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { XIcon } from "@phosphor-icons/react";
import VaultSettings from "@/features/vault/components/vault_settings";
import SettingsForm from "./settings_form";
import type { Dictionary } from "@/i18n/en";
import type { Locale } from "@/i18n/config";
import type { Profile } from "../types";
import type { Vault, VaultPasskey } from "@/features/vault/types";

const ICON_SIZE = 18;

export interface SettingsOverlayOptions {
  profile: Profile;
  t: Dictionary;
  locale: Locale;
  /** The vault as stored: opaque to the server, and to this component. */
  vault: Vault;
  passkeys: VaultPasskey[];
}

/**
 * Settings as a cover over the journal rather than a page you navigate away to.
 *
 * It still owns a real URL, so it survives a reload and can be linked; closing
 * it is a navigation back to the journal, not a hidden piece of state.
 */
function SettingsHeader(options: { t: Dictionary; onClose: () => void }) {
  return (
    <header className="flex items-start gap-4 border-b border-border px-6 py-4">
      <div className="flex-1">
        <h1 className="text-lg font-semibold" id="settings-title">
          {options.t.profile.title}
        </h1>
        <p className="mt-0.5 text-sm text-muted">{options.t.profile.subtitle}</p>
      </div>
      <button
        aria-label={options.t.close}
        className="rounded-md p-1.5 text-muted hover:bg-surface-muted hover:text-foreground"
        onClick={options.onClose}
        type="button"
      >
        <XIcon size={ICON_SIZE} weight="bold" />
      </button>
    </header>
  );
}

export default function SettingsOverlay(options: SettingsOverlayOptions) {
  const router = useRouter();

  function close() {
    router.push(`/${options.locale}`);
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        router.push(`/${options.locale}`);
      }
    }

    document.addEventListener("keydown", onKeyDown);

    return () => document.removeEventListener("keydown", onKeyDown);
  }, [router, options.locale]);

  return (
    <div className="fixed inset-0 z-30 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:p-8">
      {/* The backdrop closes on click; the panel stops the click reaching it. */}
      <button
        aria-label={options.t.close}
        className="absolute inset-0 cursor-default"
        onClick={close}
        type="button"
      />

      {/* A real <dialog>, kept open declaratively: the backdrop above is ours,
          because showModal() would put this in the top layer and take the
          route's scroll position with it. */}
      <dialog
        aria-labelledby="settings-title"
        aria-modal
        className="relative m-0 w-full max-w-3xl rounded-lg border border-border bg-background p-0 text-foreground shadow-2xl"
        open
      >
        <SettingsHeader onClose={close} t={options.t} />

        <div className="flex flex-col gap-5 p-6">
          <SettingsForm locale={options.locale} profile={options.profile} t={options.t} />
          <VaultSettings
            identity={{
              subject: options.profile.subject,
              name: options.profile.name,
              email: options.profile.email,
            }}
            passkeys={options.passkeys}
            t={options.t}
            vault={options.vault}
          />
        </div>
      </dialog>
    </div>
  );
}
