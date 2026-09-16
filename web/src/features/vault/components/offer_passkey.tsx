"use client";

import { FingerprintIcon } from "@phosphor-icons/react";
import VaultError from "./vault_error";
import { deviceLabel } from "../device";
import { useVaultDevices, type VaultIdentity } from "../use_vault_operations";
import { useVault } from "../vault_state";
import type { Dictionary } from "@/i18n/en";

const ICON_SIZE = 16;

export interface OfferPasskeyOptions {
  t: Dictionary;
  identity: VaultIdentity;
  /** Still in hand from the step before, so this does not ask for it again. */
  password: string;
  onEnrolled: () => void;
  onSkipped: () => void;
}

/**
 * Offered straight after the password, which is the moment it is worth having:
 * the warning about losing it is still on screen, and the password is still in
 * this component rather than something we would have to ask for again.
 *
 * Offered, never required — plenty of browsers and authenticators cannot do it.
 */
export default function OfferPasskey(options: OfferPasskeyOptions) {
  const { state } = useVault();
  const { enroll } = useVaultDevices(options.identity);
  const t = options.t.vault;

  async function add() {
    if (await enroll(options.password, deviceLabel())) {
      options.onEnrolled();
    }
  }

  return (
    <>
      <div className="text-center">
        <h1 className="text-xl font-semibold">{t.passkeyStepTitle}</h1>
        <p className="mt-1 text-sm text-muted">{t.passkeyStepPrompt}</p>
      </div>

      <VaultError t={options.t} />

      <div className="flex flex-col items-center gap-3">
        <button
          className="flex items-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-medium text-on-brand disabled:opacity-50"
          disabled={state.busy}
          onClick={() => void add()}
          type="button"
        >
          <FingerprintIcon size={ICON_SIZE} weight="fill" />
          {state.busy ? t.addingPasskey : t.addPasskey}
        </button>

        <button
          className="text-sm text-muted hover:text-foreground"
          disabled={state.busy}
          onClick={options.onSkipped}
          type="button"
        >
          {t.notNow}
        </button>
      </div>
    </>
  );
}
