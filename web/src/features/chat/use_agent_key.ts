"use client";

import { useEffect, useState } from "react";
import { recallKey } from "@/features/vault/session";

/**
 * The key this browser seals conversations under, once it has been read back
 * out of the unlocked vault.
 *
 * Null while it is being read, and null for good if the vault is not open —
 * callers show nothing rather than showing ciphertext.
 */
export function useAgentKey(subject: string): string | null {
  const [ret, setRet] = useState<string | null>(null);

  useEffect(() => {
    let live = true;

    async function recall() {
      const keys = await recallKey(subject);

      if (live) {
        setRet(keys?.agentKey ?? null);
      }
    }

    void recall();

    return () => {
      live = false;
    };
  }, [subject]);

  return ret;
}
