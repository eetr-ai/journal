"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { SimpleProvider } from "@eetr/react-reducer-utils";
import { FingerprintIcon } from "@phosphor-icons/react";
import OfferPasskey from "./offer_passkey";
import VaultError from "./vault_error";
import VaultField from "./vault_field";
import { passkeysAreAvailable } from "../passkey";
import { answerPasskeyOffer, passkeyOfferAnswered } from "../offered";
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
import type { Vault, VaultPasskey } from "../types";

const ICON_SIZE = 16;
const MASCOT_SIZE = 120;

export interface UnlockScreenOptions {
  t: Dictionary;
  locale: Locale;
  identity: VaultIdentity;
  vault: Vault;
  passkeys: VaultPasskey[];
  /** Rendered on the server and passed in, so this stays a client component. */
  signOut: React.ReactNode;
}

type Method = "password" | "passkey";

interface UnlockFormOptions {
  t: Dictionary;
  identity: VaultIdentity;
  password: string;
  onPassword: (password: string) => void;
  /** Which way this attempt is going in — a typed password is not proof one
   *  was used, and an offer built on that assumption hands over a stale one. */
  onAttempt: (method: Method) => void;
  signOut: React.ReactNode;
}

function UnlockForm(options: UnlockFormOptions) {
  const { state } = useVault();
  const { byPassword, byPasskey } = useVaultUnlock(options.identity);
  const t = options.t.vault;

  return (
    <div className="flex w-full max-w-sm flex-col gap-3">
      <VaultField
        autoComplete="current-password"
        id="vault-gate"
        label={t.password}
        onChange={options.onPassword}
        value={options.password}
      />

      <VaultError t={options.t} />

      <div className="flex items-center gap-5">
        <button
          className="flex-1 rounded-lg bg-brand px-5 py-2.5 text-sm font-medium text-on-brand disabled:opacity-50"
          disabled={state.busy}
          onClick={() => {
            options.onAttempt("password");
            void byPassword(options.password);
          }}
          type="button"
        >
          {state.busy ? t.unlocking : t.unlock}
        </button>
        {options.signOut}
      </div>

      {state.passkeys.length > 0 && (
        <button
          className="flex items-center justify-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-medium transition hover:border-muted disabled:opacity-50"
          disabled={state.busy}
          onClick={() => {
            options.onAttempt("passkey");
            void byPasskey();
          }}
          type="button"
        >
          <FingerprintIcon size={ICON_SIZE} weight="fill" />
          {t.unlockWithPasskey}
        </button>
      )}
    </div>
  );
}

function Body(options: UnlockScreenOptions) {
  const { state } = useVault();
  const [password, setPassword] = useState("");
  const [method, setMethod] = useState<Method | null>(null);
  const router = useRouter();
  const t = options.t.vault;
  const subject = options.identity.subject;

  // A password unlock is a device that did not reach for a passkey, and the
  // password is still in hand — the one moment worth asking that does not cost
  // a second re-authentication. Which button was pressed, not whether anything
  // was typed: a password left in the box before unlocking another way is not
  // a password anyone used.
  //
  // Derived rather than stored: nothing here is true until the vault is open,
  // and it cannot be open on the server, so the two browser questions are never
  // asked during a render that has to match one.
  const offering =
    state.status === "unlocked" &&
    method === "password" &&
    passkeysAreAvailable() &&
    !passkeyOfferAnswered(subject);

  // The key and the marker the server reads are written together, so by the
  // time this fires the journal will render rather than bounce back here.
  useEffect(() => {
    if (state.status === "unlocked" && !offering) {
      router.replace(`/${options.locale}`);
    }
  }, [state.status, offering, router, options.locale]);

  function go() {
    router.replace(`/${options.locale}`);
  }

  // Either answer settles it. Taking one changes nothing this browser can be
  // asked about later, so without this the next password unlock asks again.
  function answered() {
    answerPasskeyOffer(subject);
    go();
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <main className="flex flex-1 flex-col items-center justify-center gap-6 px-8 pb-16">
        <Image alt="" height={MASCOT_SIZE} priority src="/mascot.png" width={MASCOT_SIZE} />

        {offering ? (
          <OfferPasskey
            identity={options.identity}
            onEnrolled={answered}
            onSkipped={answered}
            password={password}
            t={options.t}
          />
        ) : (
          <>
            <div className="text-center">
              <h1 className="text-xl font-semibold">{t.unlockTitle}</h1>
              <p className="mt-1 max-w-sm text-sm text-muted">{t.unlockPrompt}</p>
            </div>

            <UnlockForm
              identity={options.identity}
              onAttempt={setMethod}
              onPassword={setPassword}
              password={password}
              signOut={options.signOut}
              t={options.t}
            />
          </>
        )}
      </main>
    </div>
  );
}

/** The gate between signing in and reading anything. */
export default function UnlockScreen(options: UnlockScreenOptions) {
  return (
    <SimpleProvider
      dispatchContext={VaultDispatchContext}
      initialState={lockedVaultState({ vault: options.vault, passkeys: options.passkeys })}
      reducer={vaultReducer}
      stateContext={VaultStateContext}
    >
      <Body {...options} />
    </SimpleProvider>
  );
}
