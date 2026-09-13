"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { forgetKey, recallKey } from "../session";

export interface VaultGuardOptions {
  subject: string;
  locale: string;
}

/**
 * Catches a marker that outlived the key it stands for.
 *
 * The server decides what to render from a cookie saying the vault is open. If
 * the key behind it is gone — storage cleared, another profile in this browser —
 * this clears the marker and sends the person back to unlock. Renders nothing.
 */
export default function VaultGuard(options: VaultGuardOptions) {
  const router = useRouter();

  useEffect(() => {
    async function check() {
      if (await recallKey(options.subject)) {
        return;
      }

      await forgetKey(options.subject);
      router.replace(`/${options.locale}/unlock`);
    }

    void check();
  }, [options.subject, options.locale, router]);

  return null;
}
