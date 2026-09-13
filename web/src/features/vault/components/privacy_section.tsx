"use client";

import { useEffect } from "react";
import { SimpleProvider } from "@eetr/react-reducer-utils";
import VaultLocked from "./vault_locked";
import VaultSetup from "./vault_setup";
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
import type { VaultState } from "../types";

export interface PrivacySectionOptions {
  t: Dictionary;
  identity: VaultIdentity;
  /** Read on the server: the vault and its passkeys, never anything readable. */
  stored: VaultState;
}

function Body(options: PrivacySectionOptions) {
  const { state, dispatch } = useVault();

  // The key may already be in this browser from an earlier visit. Nothing is
  // fetched here: the vault itself came from the server with the page.
  useEffect(() => {
    async function boot() {
      dispatch({
        type: VaultActionType.Loaded,
        data: {
          vault: options.stored.vault,
          passkeys: options.stored.passkeys,
          dataKey: options.stored.vault ? await recallKey(options.identity.subject) : null,
        },
      });
    }

    void boot();
  }, [dispatch, options.stored, options.identity.subject]);

  if (state.status === "checking") {
    return null;
  }

  if (state.status === "absent") {
    return <VaultSetup identity={options.identity} t={options.t} />;
  }

  if (state.status === "locked") {
    return <VaultLocked identity={options.identity} t={options.t} />;
  }

  return <VaultUnlocked identity={options.identity} t={options.t} />;
}

export default function PrivacySection(options: PrivacySectionOptions) {
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
