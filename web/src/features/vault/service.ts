import "server-only";
import { cache } from "react";
import { auth } from "@/auth";
import { vaultClient } from "./client";
import { passkeyIsStorable, vaultIsStorable } from "./rules";
import type { Vault, VaultPasskey, VaultState } from "./types";

/**
 * The rules the BFF owns between the session and the vault's storage.
 *
 * The subject always comes from the session, so no request can reach a vault
 * that is not its own. Nothing here can read a vault's contents, and it does not
 * try: the only judgement it makes is whether the derivation parameters a
 * browser submitted are strong enough to store.
 */

async function sessionSubject(): Promise<string | null> {
  return (await auth())?.user?.subject ?? null;
}

export const currentVault = cache(async (): Promise<VaultState> => {
  const subject = await sessionSubject();

  if (!subject) {
    return { vault: null, passkeys: [] };
  }

  return vaultClient.read(subject);
});

export type VaultOutcome = "saved" | "rejected" | "failed";

export async function saveVault(vault: Vault): Promise<VaultOutcome> {
  const subject = await sessionSubject();

  if (!subject) {
    return "failed";
  }

  if (!vaultIsStorable(vault)) {
    return "rejected";
  }

  try {
    await vaultClient.save(subject, vault);
    return "saved";
  } catch {
    return "failed";
  }
}

export async function addPasskey(passkey: Omit<VaultPasskey, "createdAt">): Promise<VaultOutcome> {
  const subject = await sessionSubject();

  if (!subject) {
    return "failed";
  }

  if (!passkeyIsStorable(passkey)) {
    return "rejected";
  }

  try {
    await vaultClient.addPasskey(subject, passkey);
    return "saved";
  } catch {
    return "failed";
  }
}

export async function removePasskey(credentialId: string): Promise<VaultOutcome> {
  const subject = await sessionSubject();

  if (!subject) {
    return "failed";
  }

  try {
    await vaultClient.removePasskey(subject, credentialId);
    return "saved";
  } catch {
    return "failed";
  }
}
