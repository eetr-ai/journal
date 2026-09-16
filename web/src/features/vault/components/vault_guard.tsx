"use client";

import { useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { forgetKey, recallKey } from "../session";
import { useIdleLock } from "../use_idle_lock";

export interface VaultGuardOptions {
  subject: string;
  locale: string;
}

/**
 * Catches a marker that outlived the key it stands for.
 *
 * The server decides what to render from a cookie saying the vault is open. If
 * the key behind it is gone — storage cleared, another profile in this browser,
 * or a vault left alone long enough to shut — this clears the marker and sends
 * the person back to unlock. Renders nothing.
 */
export default function VaultGuard(options: VaultGuardOptions) {
  const router = useRouter();

  const lock = useCallback(
    async function lock() {
      await forgetKey(options.subject);
      router.replace(`/${options.locale}/unlock`);
    },
    [options.subject, options.locale, router],
  );

  const onLocked = useCallback(() => void lock(), [lock]);

  useIdleLock(options.subject, onLocked);

  useEffect(() => {
    async function check() {
      if (!(await recallKey(options.subject))) {
        await lock();
      }
    }

    void check();
  }, [options.subject, lock]);

  return null;
}
