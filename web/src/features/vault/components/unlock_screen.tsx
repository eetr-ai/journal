"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { SimpleProvider } from "@eetr/react-reducer-utils";
import { FingerprintIcon } from "@phosphor-icons/react";
import VaultError from "./vault_error";
import VaultField from "./vault_field";
import { useVaultUnlock, type VaultIdentity } from "../use_vault_operations";
import {
  VaultDispatchContext,
  VaultStateContext,
  lockedVaultState,
  useVault,
  vaultReducer,
} from "../vault_state";
import type { Dictionary } from "@/i18n/en";
import type { Locale } from "@/i18n/config";
import type { VaultState } from "../types";

const ICON_SIZE = 16;
const MASCOT_SIZE = 120;

export interface UnlockScreenOptions {
  t: Dictionary;
  locale: Locale;
  identity: VaultIdentity;
  stored: VaultState;
}

function Body(options: UnlockScreenOptions) {
  const { state } = useVault();
  const { byPassword, byPasskey } = useVaultUnlock(options.identity);
  const [password, setPassword] = useState("");
  const router = useRouter();
  const t = options.t.vault;

  // The key and the marker the server reads are written together, so by the
  // time this fires the journal will render rather than bounce back here.
  useEffect(() => {
    if (state.status === "unlocked") {
      router.replace(`/${options.locale}`);
    }
  }, [state.status, router, options.locale]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <Image alt="" height={MASCOT_SIZE} priority src="/mascot.png" width={MASCOT_SIZE} />

      <div className="text-center">
        <h1 className="text-xl font-semibold">{t.unlockTitle}</h1>
        <p className="mt-1 max-w-sm text-sm text-muted">{t.unlockPrompt}</p>
      </div>

      <div className="flex w-full max-w-xs flex-col gap-3">
        <VaultField
          autoComplete="current-password"
          id="vault-gate"
          label={t.password}
          onChange={setPassword}
          value={password}
        />

        <VaultError t={options.t} />

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
            className="flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-2 text-sm disabled:opacity-50"
            disabled={state.busy}
            onClick={() => void byPasskey()}
            type="button"
          >
            <FingerprintIcon size={ICON_SIZE} weight="fill" />
            {t.unlockWithPasskey}
          </button>
        )}
      </div>
    </main>
  );
}

/** The gate between signing in and reading anything. */
export default function UnlockScreen(options: UnlockScreenOptions) {
  return (
    <SimpleProvider
      dispatchContext={VaultDispatchContext}
      initialState={lockedVaultState(options.stored)}
      reducer={vaultReducer}
      stateContext={VaultStateContext}
    >
      <Body {...options} />
    </SimpleProvider>
  );
}
