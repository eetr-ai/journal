"use client";

import { createVault, unlockWithPassword, unwrapWithPassword, type VaultKeys } from "./crypto";
import { enrollPasskey, passkeysAreAvailable, unlockWithPasskey } from "./passkey";
import { addPasskeyAction, removePasskeyAction, saveVaultAction } from "./actions";
import { forgetKey, rememberKey } from "./session";
import { VaultActionType, useVault, type VaultError } from "./vault_state";

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
      await accept(await unlockWithPasskey(state.passkeys), "passkeyFailed");
    } catch {
      // A cancelled prompt and a device that cannot do PRF both land here, and
      // neither is worth telling apart to the person in front of it.
      dispatch({ type: VaultActionType.Failed, data: "passkeyFailed" });
    }
  }

  return { create, byPassword, byPasskey };
}

/** Managing the devices that can open it, once it is open. */
export function useVaultDevices(identity: VaultIdentity) {
  const { state, dispatch } = useVault();

  /**
   * Enrolling re-wraps the data key, which needs its bytes — and the key held in
   * memory is deliberately not readable. Asking for the password again is also
   * the right thing: adding a credential should cost a re-authentication.
   */
  async function enroll(password: string, label: string): Promise<boolean> {
    if (!passkeysAreAvailable()) {
      dispatch({ type: VaultActionType.Failed, data: "passkeyUnsupported" });
      return false;
    }

    dispatch({ type: VaultActionType.Busy });

    const raw = state.vault ? await unwrapWithPassword(password, state.vault) : null;

    if (!raw) {
      dispatch({ type: VaultActionType.Failed, data: "wrongPassword" });
      return false;
    }

    const enrolled = await enrollPasskey({ ...identity, dataKey: raw, label }).catch(() => null);

    if (!enrolled || (await addPasskeyAction(enrolled)) !== "saved") {
      dispatch({ type: VaultActionType.Failed, data: "passkeyFailed" });
      return false;
    }

    dispatch({
      type: VaultActionType.Passkeys,
      data: [...state.passkeys, { ...enrolled, createdAt: new Date().toISOString() }],
    });

    return true;
  }

  async function forget(credentialId: string) {
    dispatch({ type: VaultActionType.Busy });

    if ((await removePasskeyAction(credentialId)) !== "saved") {
      dispatch({ type: VaultActionType.Failed, data: "failed" });
      return;
    }

    dispatch({
      type: VaultActionType.Passkeys,
      data: state.passkeys.filter((passkey) => passkey.credentialId !== credentialId),
    });
  }

  async function lock() {
    await forgetKey(identity.subject);
    dispatch({ type: VaultActionType.Locked });
  }

  return { enroll, forget, lock };
}
