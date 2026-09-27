"use client";

import { createVault, unlockWithPassword, unwrapWithPassword, type VaultKeys } from "./crypto";
import { enrollPasskey, passkeysAreAvailable, unlockWithPasskey } from "./passkey";
import { addPasskeyAction, removePasskeyAction, saveVaultAction } from "./actions";
import { forgetKey, rememberKey } from "./session";
import { forgetThisDevice, rememberThisDevice } from "./this_device";
import { VaultActionType, useVault, type VaultError } from "./vault_state";
import type { VaultPasskey } from "./types";

/**
 * Everything the vault panel can do, kept out of the components so each of them
 * is only a form. Split in two along the line the UI already draws: getting in,
 * and managing what can get you in.
 *
 * Every operation ends in exactly one dispatch, so a failure never leaves the
 * panel spinning.
 */

export interface VaultIdentity {
  subject: string;
  name: string;
  email: string;
}

// The only thing standing between this data and whoever holds the ciphertext.
export const MIN_PASSWORD = 12;

/** What is wrong with the pair a person typed, or null when nothing is. */
function passwordProblem(password: string, confirm: string): VaultError | null {
  if (password.length < MIN_PASSWORD) {
    return "tooShort";
  }

  return password === confirm ? null : "mismatch";
}

/** Getting in: creating the vault, and opening it with either credential. */
export function useVaultUnlock(identity: VaultIdentity) {
  const { state, dispatch } = useVault();

  async function accept(keys: VaultKeys | null, failure: "wrongPassword" | "passkeyFailed") {
    if (!keys || !state.vault) {
      dispatch({ type: VaultActionType.Failed, data: failure });
      return;
    }

    if (!(await rememberKey(identity.subject, keys))) {
      dispatch({ type: VaultActionType.Failed, data: "noStorage" });
      return;
    }

    dispatch({
      type: VaultActionType.Unlocked,
      data: { vault: state.vault, dataKey: keys.dataKey },
    });
  }

  /** True only when the vault is stored and open; the caller moves the person
   *  on from that, never from the attempt. */
  async function create(password: string, confirm: string): Promise<boolean> {
    const problem = passwordProblem(password, confirm);

    if (problem) {
      dispatch({ type: VaultActionType.Failed, data: problem });
      return false;
    }

    dispatch({ type: VaultActionType.Busy });

    const { vault, keys } = await createVault(password);
    const outcome = await saveVaultAction(vault);

    if (outcome !== "saved") {
      dispatch({
        type: VaultActionType.Failed,
        data: outcome === "rejected" ? "rejected" : "failed",
      });
      return false;
    }

    if (!(await rememberKey(identity.subject, keys))) {
      dispatch({ type: VaultActionType.Failed, data: "noStorage" });
      return false;
    }

    dispatch({ type: VaultActionType.Unlocked, data: { vault, dataKey: keys.dataKey } });

    return true;
  }

  async function byPassword(password: string) {
    dispatch({ type: VaultActionType.Busy });

    const vault = state.vault;

    await accept(vault ? await unlockWithPassword(password, vault) : null, "wrongPassword");
  }

  async function byPasskey() {
    dispatch({ type: VaultActionType.Busy });

    try {
      const opened = await unlockWithPasskey(state.passkeys);

      if (opened) {
        rememberThisDevice(identity.subject, opened.credentialId);
      }

      await accept(opened?.keys ?? null, "passkeyFailed");
    } catch {
      // A cancelled prompt and a device that cannot do PRF both land here, and
      // neither is worth telling apart to the person in front of it.
      dispatch({ type: VaultActionType.Failed, data: "passkeyFailed" });
    }
  }

  return { create, byPassword, byPasskey };
}

function useEnrolled(identity: VaultIdentity) {
  const { state, dispatch } = useVault();

  /**
   * A new passkey, stored and noted as this browser's; every failure has already
   * been dispatched when this returns null.
   *
   * Enrolling re-wraps the data key, which needs its bytes — and the key held in
   * memory is deliberately not readable. Asking for the password again is also
   * the right thing: adding a credential should cost a re-authentication.
   */
  async function enrolled(password: string, label: string): Promise<VaultPasskey | null> {
    if (!passkeysAreAvailable()) {
      dispatch({ type: VaultActionType.Failed, data: "passkeyUnsupported" });
      return null;
    }

    dispatch({ type: VaultActionType.Busy });

    const raw = state.vault ? await unwrapWithPassword(password, state.vault) : null;

    if (!raw) {
      dispatch({ type: VaultActionType.Failed, data: "wrongPassword" });
      return null;
    }

    const made = await enrollPasskey({ ...identity, dataKey: raw, label }).catch(() => null);

    if (!made || (await addPasskeyAction(made)) !== "saved") {
      dispatch({ type: VaultActionType.Failed, data: "passkeyFailed" });
      return null;
    }

    rememberThisDevice(identity.subject, made.credentialId);

    return { ...made, createdAt: new Date().toISOString() };
  }

  return enrolled;
}

/** Managing the devices that can open it, once it is open. */
export function useVaultDevices(identity: VaultIdentity) {
  const { state, dispatch } = useVault();
  const enrolled = useEnrolled(identity);

  async function enroll(password: string, label: string): Promise<boolean> {
    const made = await enrolled(password, label);

    if (made) {
      dispatch({
        type: VaultActionType.Passkeys,
        data: { passkeys: [...state.passkeys, made], thisDevice: made.credentialId },
      });
    }

    return made !== null;
  }

  /**
   * Replaces the passkey this browser opens with. The new one is stored before
   * the old one goes, so a failure part-way leaves two ways in, never none; an
   * old one that would not go stays listed, and the panel says so.
   */
  async function reset(password: string, label: string): Promise<boolean> {
    const old = state.thisDevice;
    const made = await enrolled(password, label);

    if (!made) {
      return false;
    }

    const gone = old !== null && (await removePasskeyAction(old)) === "saved";
    const kept = state.passkeys.filter((passkey) => !gone || passkey.credentialId !== old);

    dispatch({
      type: VaultActionType.Passkeys,
      data: {
        passkeys: [...kept, made],
        thisDevice: made.credentialId,
        ...(old !== null && !gone ? { error: "oldPasskeyKept" } : {}),
      },
    });

    return true;
  }

  async function forget(credentialId: string) {
    dispatch({ type: VaultActionType.Busy });

    if ((await removePasskeyAction(credentialId)) !== "saved") {
      dispatch({ type: VaultActionType.Failed, data: "failed" });
      return;
    }

    const wasThisDevice = credentialId === state.thisDevice;

    if (wasThisDevice) {
      forgetThisDevice(identity.subject);
    }

    dispatch({
      type: VaultActionType.Passkeys,
      data: {
        passkeys: state.passkeys.filter((passkey) => passkey.credentialId !== credentialId),
        thisDevice: wasThisDevice ? null : state.thisDevice,
      },
    });
  }

  async function lock() {
    await forgetKey(identity.subject);
    dispatch({ type: VaultActionType.Locked });
  }

  return { enroll, reset, forget, lock };
}
