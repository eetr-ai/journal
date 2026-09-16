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

  const toUnlock = useCallback(
    () => router.replace(`/${options.locale}/unlock`),
    [options.locale, router],
  );

  const onLocked = useCallback(
    function onLocked() {
      void forgetKey(options.subject).then(toUnlock);
    },
    [options.subject, toUnlock],
  );

  useIdleLock(options.subject, onLocked);

  // A failed recall has already thrown the record away and cleared the marker,
  // so this only has somewhere to send the person. Forgetting again would be a
  // second delete deciding the fate of whatever is there by then, which on a
  // browser with two tabs open may be a key the other one has just stored.
  useEffect(() => {
    async function check() {
      if (!(await recallKey(options.subject))) {
        toUnlock();
      }
    }

    void check();
  }, [options.subject, toUnlock]);

  return null;
}
