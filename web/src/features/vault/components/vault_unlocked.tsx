"use client";

import { useState } from "react";
import { ArrowsClockwiseIcon, FingerprintIcon, LockIcon } from "@phosphor-icons/react";
import PasskeyList from "./passkey_list";
import VaultError from "./vault_error";
import VaultField from "./vault_field";
import { deviceLabel } from "../device";
import { useVaultDevices, type VaultIdentity } from "../use_vault_operations";
import { useVault } from "../vault_state";
import type { Dictionary } from "@/i18n/en";

const ICON_SIZE = 15;

const BUTTON =
  "flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm disabled:opacity-50";

export interface VaultUnlockedOptions {
  t: Dictionary;
  identity: VaultIdentity;
}

/** Which passkey change is asking for the password, if any. */
type Enrolling = "add" | "reset" | null;

export default function VaultUnlocked(options: VaultUnlockedOptions) {
  const { enroll, reset, forget, lock } = useVaultDevices(options.identity);
  const [password, setPassword] = useState("");
  const [enrolling, setEnrolling] = useState<Enrolling>(null);
  const t = options.t.vault;

  // The first press asks for the password; the second, with it typed, acts.
  async function run(change: "add" | "reset") {
    if (enrolling !== change) {
      setEnrolling(change);
      return;
    }

    const act = change === "add" ? enroll : reset;

    if (await act(password, deviceLabel())) {
      setPassword("");
      setEnrolling(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="flex items-center gap-2 text-sm text-brand">
        <LockIcon size={ICON_SIZE} weight="fill" />
        {t.unlockedState}
      </p>

      <PasskeyList
        onRemove={(credentialId) => void forget(credentialId)}
        onReset={() => setEnrolling("reset")}
        t={options.t}
      />

      {enrolling && (
        <VaultField
          autoComplete="current-password"
          id="vault-enroll"
          label={t.password}
          onChange={setPassword}
          value={password}
        />
      )}

      {enrolling === "reset" && <p className="text-xs text-muted">{t.resetHint}</p>}

      <VaultError t={options.t} />

      <div className="flex flex-wrap items-center gap-3">
        <EnrolButtons
          enrolling={enrolling}
          onCancel={() => setEnrolling(null)}
          onRun={(change) => void run(change)}
          t={options.t}
        />

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

interface EnrolButtonsOptions {
  t: Dictionary;
  enrolling: Enrolling;
  onRun: (change: "add" | "reset") => void;
  onCancel: () => void;
}

function EnrolButtons(options: EnrolButtonsOptions) {
  const { state } = useVault();
  const t = options.t.vault;
  const resetting = options.enrolling === "reset";

  return (
    <>
      <button
        className={BUTTON}
        disabled={state.busy}
        onClick={() => options.onRun(resetting ? "reset" : "add")}
        type="button"
      >
        {resetting ? (
          <ArrowsClockwiseIcon size={ICON_SIZE} />
        ) : (
          <FingerprintIcon size={ICON_SIZE} weight="fill" />
        )}
        {state.busy ? t.addingPasskey : resettingLabel(t, resetting)}
      </button>

      {options.enrolling && (
        <button
          className="text-sm text-muted hover:text-foreground"
          onClick={options.onCancel}
          type="button"
        >
          {t.notNow}
        </button>
      )}
    </>
  );
}

function resettingLabel(t: Dictionary["vault"], resetting: boolean): string {
  return resetting ? t.confirmReset : t.addPasskey;
}
