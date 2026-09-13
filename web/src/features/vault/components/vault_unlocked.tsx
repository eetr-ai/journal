"use client";

import { useState } from "react";
import { FingerprintIcon, LockIcon } from "@phosphor-icons/react";
import PasskeyList from "./passkey_list";
import VaultError from "./vault_error";
import VaultField from "./vault_field";
import { useVaultDevices, type VaultIdentity } from "../use_vault_operations";
import { useVault } from "../vault_state";
import type { Dictionary } from "@/i18n/en";

const ICON_SIZE = 15;

export interface VaultUnlockedOptions {
  t: Dictionary;
  identity: VaultIdentity;
}

function deviceLabel(): string {
  return navigator.platform || "This device";
}

export default function VaultUnlocked(options: VaultUnlockedOptions) {
  const { state } = useVault();
  const { enroll, forget, lock } = useVaultDevices(options.identity);
  const [password, setPassword] = useState("");
  const [enrolling, setEnrolling] = useState(false);
  const t = options.t.vault;

  async function add() {
    if (!enrolling) {
      setEnrolling(true);
      return;
    }

    if (await enroll(password, deviceLabel())) {
      setPassword("");
      setEnrolling(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="flex items-center gap-2 text-sm text-brand">
        <LockIcon size={ICON_SIZE} weight="fill" />
        {t.unlockedState}
      </p>

      <PasskeyList onRemove={(credentialId) => void forget(credentialId)} t={options.t} />

      {enrolling && (
        <VaultField
          autoComplete="current-password"
          id="vault-enroll"
          label={t.password}
          onChange={setPassword}
          value={password}
        />
      )}

      <VaultError t={options.t} />

      <div className="flex flex-wrap items-center gap-3">
        <button
          className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm disabled:opacity-50"
          disabled={state.busy}
          onClick={() => void add()}
          type="button"
        >
          <FingerprintIcon size={ICON_SIZE} weight="fill" />
          {state.busy ? t.addingPasskey : t.addPasskey}
        </button>

        <button
          className="text-sm text-muted hover:text-foreground"
          onClick={() => void lock()}
          type="button"
        >
          {t.lock}
        </button>
      </div>
    </div>
  );
}
