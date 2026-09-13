"use client";

import { useVault } from "../vault_state";
import type { Dictionary } from "@/i18n/en";

export interface VaultErrorOptions {
  t: Dictionary;
}

export default function VaultError(options: VaultErrorOptions) {
  const { state } = useVault();

  if (!state.error) {
    return null;
  }

  return <p className="text-xs text-accent">{options.t.vault.errors[state.error]}</p>;
}
