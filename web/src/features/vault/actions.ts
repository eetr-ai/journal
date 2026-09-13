"use server";

import { addPasskey, removePasskey, saveVault, type VaultOutcome } from "./service";
import type { Vault, VaultPasskey } from "./types";

export async function saveVaultAction(vault: Vault): Promise<VaultOutcome> {
  return saveVault(vault);
}

export async function addPasskeyAction(
  passkey: Omit<VaultPasskey, "createdAt">,
): Promise<VaultOutcome> {
  return addPasskey(passkey);
}

export async function removePasskeyAction(credentialId: string): Promise<VaultOutcome> {
  return removePasskey(credentialId);
}
