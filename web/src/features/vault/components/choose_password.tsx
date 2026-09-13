"use client";

import { useState } from "react";
import VaultDisclaimer from "./vault_disclaimer";
import VaultError from "./vault_error";
import VaultField from "./vault_field";
import { useVaultUnlock, type VaultIdentity } from "../use_vault_operations";
import { useVault } from "../vault_state";
import type { Dictionary } from "@/i18n/en";

export interface ChoosePasswordOptions {
  t: Dictionary;
  identity: VaultIdentity;
  onChosen: (password: string) => void;
}

export default function ChoosePassword(options: ChoosePasswordOptions) {
  const { state } = useVault();
  const { create } = useVaultUnlock(options.identity);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const t = options.t.vault;

  async function submit() {
    await create(password, confirm);
    // `create` only reaches unlocked when it stored the vault; anything else
    // left an error on the state and this hands nothing on.
    options.onChosen(password);
  }

  return (
    <>
      <div className="text-center">
        <h1 className="text-xl font-semibold">{t.protectTitle}</h1>
        <p className="mt-1 text-sm text-muted">{t.protectPrompt}</p>
      </div>

      <VaultDisclaimer t={options.t} />

      <div className="grid w-full gap-4 sm:grid-cols-2">
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

      <button
        className="rounded-lg bg-brand px-5 py-2.5 text-sm font-medium text-on-brand disabled:opacity-50"
        disabled={state.busy}
        onClick={() => void submit()}
        type="button"
      >
        {state.busy ? t.creating : t.create}
      </button>
    </>
  );
}
