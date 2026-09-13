"use client";

import { useState } from "react";
import VaultDisclaimer from "./vault_disclaimer";
import VaultError from "./vault_error";
import VaultField from "./vault_field";
import { useVaultUnlock, type VaultIdentity } from "../use_vault_operations";
import { useVault } from "../vault_state";
import type { Dictionary } from "@/i18n/en";

export interface VaultSetupOptions {
  t: Dictionary;
  identity: VaultIdentity;
}

export default function VaultSetup(options: VaultSetupOptions) {
  const { state } = useVault();
  const { create } = useVaultUnlock(options.identity);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const t = options.t.vault;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">{t.absent}</p>

      <VaultDisclaimer t={options.t} />

      <div className="grid gap-4 sm:grid-cols-2">
        <VaultField
          autoComplete="new-password"
          id="vault-password"
          label={t.password}
          onChange={setPassword}
          value={password}
        />
        <VaultField
          autoComplete="new-password"
          id="vault-confirm"
          label={t.confirm}
          onChange={setConfirm}
          value={confirm}
        />
      </div>

      <VaultError t={options.t} />

      <div>
        <button
          className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-on-brand disabled:opacity-50"
          disabled={state.busy}
          onClick={() => void create(password, confirm)}
          type="button"
        >
          {state.busy ? t.creating : t.create}
        </button>
      </div>
    </div>
  );
}
