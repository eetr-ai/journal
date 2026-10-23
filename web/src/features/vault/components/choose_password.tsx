"use client";

import { useState } from "react";
import VaultDisclaimer from "./vault_disclaimer";
import VaultError from "./vault_error";
import VaultField from "./vault_field";
import { useVaultUnlock, type VaultIdentity } from "../use_vault_operations";
import { useVault } from "../vault_state";
import type { Dictionary } from "@/i18n/en";

const CHOOSE_FORM = "vault-choose";

export interface ChoosePasswordOptions {
  t: Dictionary;
  identity: VaultIdentity;
  onChosen: (password: string) => void;
  /** Beside the action, because this screen is the only way forward. */
  signOut: React.ReactNode;
}

export default function ChoosePassword(options: ChoosePasswordOptions) {
  const { state } = useVault();
  const { create } = useVaultUnlock(options.identity);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const t = options.t.vault;

  // The password is handed on only once the vault is stored and open; every
  // other outcome left an error on the state for this screen to show.
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (state.busy) {
      return;
    }

    if (await create(password, confirm)) {
      options.onChosen(password);
    }
  }

  return (
    <>
      <div className="text-center">
        <h1 className="text-xl font-semibold">{t.protectTitle}</h1>
        <p className="mt-1 text-sm text-muted">{t.protectPrompt}</p>
      </div>

      <VaultDisclaimer t={options.t} />

      {/* The fields are the form and the button names it, so Enter in either
          field creates the vault: sign out is a form of its own beside the
          button, and forms cannot nest. */}
      <form
        className="grid w-full gap-4 sm:grid-cols-2"
        id={CHOOSE_FORM}
        onSubmit={(event) => void submit(event)}
      >
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
      </form>

      <VaultError t={options.t} />

      <div className="flex items-center gap-5">
        <button
          className="rounded-lg bg-brand px-5 py-2.5 text-sm font-medium text-on-brand disabled:opacity-50"
          disabled={state.busy}
          form={CHOOSE_FORM}
          type="submit"
        >
          {state.busy ? t.creating : t.create}
        </button>
        {options.signOut}
      </div>
    </>
  );
}
