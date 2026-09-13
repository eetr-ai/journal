"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { SimpleProvider } from "@eetr/react-reducer-utils";
import ChoosePassword from "./choose_password";
import OfferPasskey from "./offer_passkey";
import { passkeysAreAvailable } from "../passkey";
import {
  VaultDispatchContext,
  VaultStateContext,
  initialVaultState,
  useVault,
  vaultReducer,
} from "../vault_state";
import type { Dictionary } from "@/i18n/en";
import type { Locale } from "@/i18n/config";
import type { VaultIdentity } from "../use_vault_operations";

const MASCOT_SIZE = 120;

export interface ProtectScreenOptions {
  t: Dictionary;
  locale: Locale;
  identity: VaultIdentity;
  /** Rendered on the server and passed in, so this stays a client component.
   *  This screen is the only way forward, so leaving has to be reachable. */
  signOut: React.ReactNode;
}

function Body(options: ProtectScreenOptions) {
  const { state } = useVault();
  const [password, setPassword] = useState("");
  const router = useRouter();

  function toJournal() {
    router.replace(`/${options.locale}`);
  }

  // The password is only handed over once the vault is actually stored, so an
  // unlocked state here means step one is genuinely behind us.
  function chosen(chosenPassword: string) {
    if (!passkeysAreAvailable()) {
      toJournal();
      return;
    }

    setPassword(chosenPassword);
  }

  const offering = state.status === "unlocked" && password !== "";

  return (
    <div className="flex min-h-screen flex-col">
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-6 px-8 pb-16">
        <Image alt="" height={MASCOT_SIZE} priority src="/mascot.png" width={MASCOT_SIZE} />

        {offering ? (
          <OfferPasskey
            identity={options.identity}
            onDone={toJournal}
            password={password}
            t={options.t}
          />
        ) : (
          <ChoosePassword
            identity={options.identity}
            onChosen={chosen}
            signOut={options.signOut}
            t={options.t}
          />
        )}
      </main>
    </div>
  );
}

/**
 * Choosing the password, then being offered a faster way back in.
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
