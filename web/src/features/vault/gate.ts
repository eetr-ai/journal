import "server-only";
import { cookies } from "next/headers";
import { currentVault } from "./service";

// Mirrors UNLOCKED_COOKIE in session.ts, which is the only thing that writes it.
const UNLOCKED_COOKIE = "vault-unlocked";

/**
 * Whether this request may see the journal, or has to unlock first.
 *
 * The marker says only that a key is in this browser; it is not a credential and
 * nothing trusts it beyond choosing which page to render. If it is stale the
 * unlocked page finds no key and sends the person back here.
 */
export async function vaultIsOpen(): Promise<boolean> {
  const { vault } = await currentVault();

  if (!vault) {
    return true;
  }

  return (await cookies()).get(UNLOCKED_COOKIE)?.value === "1";
}
