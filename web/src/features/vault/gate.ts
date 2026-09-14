import "server-only";
import { cookies } from "next/headers";
import { currentVault } from "./service";

// Mirrors UNLOCKED_COOKIE in session.ts, which is the only thing that writes it.
const UNLOCKED_COOKIE = "vault-unlocked";

/**
 * Which of the three states a signed-in request is in.
 *
 * Encryption is not optional, so there is no fourth: a person without a vault
 * makes one before anything else, and there is nowhere in the app that renders
 * without one.
 */
export type VaultGate = "protect" | "unlock" | "open";

export async function vaultGate(): Promise<VaultGate> {
  const { vault } = await currentVault();

  if (!vault) {
    return "protect";
  }

  // Says only that a key is present in this browser. Not a credential: the page
  // behind it re-checks and clears it when the key is gone.
  return (await cookies()).get(UNLOCKED_COOKIE)?.value === "1" ? "open" : "unlock";
}

/**
 * The same marker `vaultGate` reads, without the round trip that tells a page
 * which of the three screens to show.
 *
 * For a request that only has to refuse a locked app, not route it. The marker
 * was never a credential — the subject on the session is the access control —
 * so the worst a stale one costs is a request that gets refused downstream
 * instead of here.
 */
export async function vaultIsMarkedOpen(): Promise<boolean> {
  return (await cookies()).get(UNLOCKED_COOKIE)?.value === "1";
}
