"use client";

import { useState } from "react";
import { FingerprintIcon } from "@phosphor-icons/react";
import VaultError from "./vault_error";
import VaultField from "./vault_field";
import { useVaultUnlock, type VaultIdentity } from "../use_vault_operations";
import { useVault } from "../vault_state";
import type { Dictionary } from "@/i18n/en";

const ICON_SIZE = 16;

export interface VaultLockedOptions {
  t: Dictionary;
  identity: VaultIdentity;
}

export default function VaultLocked(options: VaultLockedOptions) {
  const { state } = useVault();
  const { byPassword, byPasskey } = useVaultUnlock(options.identity);
  const [password, setPassword] = useState("");
  const t = options.t.vault;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">{t.lockedState}</p>

      <VaultField
        autoComplete="current-password"
        id="vault-unlock"
        label={t.password}
        onChange={setPassword}
        value={password}
      />

      <VaultError t={options.t} />

      <div className="flex flex-wrap items-center gap-3">
        <button
          className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-on-brand disabled:opacity-50"
          disabled={state.busy}
          onClick={() => void byPassword(password)}
          type="button"
        >
          {state.busy ? t.unlocking : t.unlock}
        </button>

        {state.passkeys.length > 0 && (
          <button
            className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm disabled:opacity-50"
            disabled={state.busy}
            onClick={() => void byPasskey()}
            type="button"
          >
            <FingerprintIcon size={ICON_SIZE} weight="fill" />
            {t.unlockWithPasskey}
          </button>
        )}
      </div>
    </div>
  );
}
