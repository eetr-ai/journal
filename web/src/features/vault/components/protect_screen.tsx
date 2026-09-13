"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { SimpleProvider } from "@eetr/react-reducer-utils";
import VaultDisclaimer from "./vault_disclaimer";
import VaultError from "./vault_error";
import VaultField from "./vault_field";
import { useVaultUnlock, type VaultIdentity } from "../use_vault_operations";
import {
  VaultDispatchContext,
  VaultStateContext,
  initialVaultState,
  useVault,
  vaultReducer,
} from "../vault_state";
import type { Dictionary } from "@/i18n/en";
import type { Locale } from "@/i18n/config";

const MASCOT_SIZE = 120;

export interface ProtectScreenOptions {
  t: Dictionary;
  locale: Locale;
  identity: VaultIdentity;
}

function Body(options: ProtectScreenOptions) {
  const { state } = useVault();
  const { create } = useVaultUnlock(options.identity);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const router = useRouter();
  const t = options.t.vault;

  useEffect(() => {
    if (state.status === "unlocked") {
      router.replace(`/${options.locale}`);
    }
  }, [state.status, router, options.locale]);

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-6 p-8">
      <Image alt="" height={MASCOT_SIZE} priority src="/mascot.png" width={MASCOT_SIZE} />

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
        onClick={() => void create(password, confirm)}
        type="button"
      >
        {state.busy ? t.creating : t.create}
      </button>
    </main>
  );
}

/**
 * Choosing the password, before anything else.
 *
 * Not a step in settings: there is no version of this app that stores writing
 * unencrypted, so this is the first screen after signing in and there is no way
 * past it.
 */
export default function ProtectScreen(options: ProtectScreenOptions) {
  return (
    <SimpleProvider
      dispatchContext={VaultDispatchContext}
      initialState={initialVaultState}
      reducer={vaultReducer}
      stateContext={VaultStateContext}
    >
      <Body {...options} />
    </SimpleProvider>
  );
}
