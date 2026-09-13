"use client";

import { createContext, type Dispatch } from "react";
import { useContextNullSafe, type ReducerAction } from "@eetr/react-reducer-utils";
import type { Vault, VaultPasskey } from "./types";

/**
 * The vault panel is a managed interaction: it loads, unlocks, fails, enrols a
 * device, and has to say which of those it is in. The reducer holds that; the
 * forms own nothing.
 */

// There is no "absent": a vault is made before the app renders at all.
export type VaultStatus = "checking" | "locked" | "unlocked";

export type VaultError =
  | "tooShort"
  | "mismatch"
  | "wrongPassword"
  | "passkeyUnsupported"
  | "passkeyFailed"
  | "rejected"
  | "failed";

export interface VaultUiState {
  status: VaultStatus;
  vault: Vault | null;
  passkeys: VaultPasskey[];
  /** Non-extractable, so holding it here cannot leak the bytes. */
  dataKey: CryptoKey | null;
  busy: boolean;
  error: VaultError | null;
}

export enum VaultActionType {
  Loaded = "loaded",
  Busy = "busy",
  Failed = "failed",
  Unlocked = "unlocked",
  Locked = "locked",
  Passkeys = "passkeys",
}

export type VaultAction = ReducerAction<VaultActionType>;

export interface LoadedData {
  vault: Vault;
  passkeys: VaultPasskey[];
  dataKey: CryptoKey | null;
}

export const initialVaultState: VaultUiState = {
  status: "checking",
  vault: null,
  passkeys: [],
  dataKey: null,
  busy: false,
  error: null,
};

/** A vault known to exist and known not to be open yet. */
export function lockedVaultState(stored: { vault: Vault; passkeys: VaultPasskey[] }): VaultUiState {
  return { ...initialVaultState, ...stored, status: "locked" };
}

function statusFor(dataKey: CryptoKey | null): VaultStatus {
  return dataKey ? "unlocked" : "locked";
}

export function vaultReducer(state: VaultUiState, action: VaultAction): VaultUiState {
  switch (action.type) {
    case VaultActionType.Loaded: {
      const data = action.data as LoadedData;

      return {
        ...state,
        ...data,
        status: statusFor(data.dataKey),
        busy: false,
        error: null,
      };
    }

    case VaultActionType.Busy:
      return { ...state, busy: true, error: null };

    case VaultActionType.Failed:
      return { ...state, busy: false, error: action.data as VaultError };

    case VaultActionType.Unlocked: {
      const data = action.data as { vault: Vault; dataKey: CryptoKey };

      return { ...state, ...data, status: "unlocked", busy: false, error: null };
    }

    case VaultActionType.Locked:
      return { ...state, dataKey: null, status: "locked", busy: false, error: null };

    case VaultActionType.Passkeys:
      return { ...state, passkeys: action.data as VaultPasskey[], busy: false, error: null };

    default:
      return state;
  }
}

export const VaultStateContext = createContext<VaultUiState | null>(null);
export const VaultDispatchContext = createContext<Dispatch<VaultAction> | null>(null);

export function useVault() {
  return {
    state: useContextNullSafe(VaultStateContext),
    dispatch: useContextNullSafe(VaultDispatchContext),
  };
}
