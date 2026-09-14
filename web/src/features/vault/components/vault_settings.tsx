"use client";

import { useEffect } from "react";
import { SimpleProvider } from "@eetr/react-reducer-utils";
import VaultUnlocked from "./vault_unlocked";
import { recallKey } from "../session";
import {
  VaultActionType,
  VaultDispatchContext,
  VaultStateContext,
  initialVaultState,
  useVault,
  vaultReducer,
} from "../vault_state";
import type { Dictionary } from "@/i18n/en";
import type { VaultIdentity } from "../use_vault_operations";
import type { Vault, VaultPasskey } from "../types";

export interface VaultSettingsOptions {
  t: Dictionary;
  identity: VaultIdentity;
  /** Read on the server: opaque there, and opaque here. */
  vault: Vault;
  passkeys: VaultPasskey[];
}

/**
 * Managing the devices that can open the vault.
 *
 * Only reachable with the vault open — the page gate saw to that — so there is
 * no locked state to render and no vault to create.
 */
function Body(options: VaultSettingsOptions) {
  const { state, dispatch } = useVault();

  useEffect(() => {
    async function boot() {
      dispatch({
        type: VaultActionType.Loaded,
        data: {
          vault: options.vault,
          passkeys: options.passkeys,
          dataKey: (await recallKey(options.identity.subject))?.dataKey ?? null,
        },
      });
    }

    void boot();
  }, [dispatch, options.vault, options.passkeys, options.identity.subject]);

  if (state.status !== "unlocked") {
    return null;
  }

  return <VaultUnlocked identity={options.identity} t={options.t} />;
}

export default function VaultSettings(options: VaultSettingsOptions) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-5">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">
        {options.t.vault.title}
      </h2>
      <SimpleProvider
        dispatchContext={VaultDispatchContext}
        initialState={initialVaultState}
        reducer={vaultReducer}
        stateContext={VaultStateContext}
      >
        <Body {...options} />
      </SimpleProvider>
    </section>
  );
}
