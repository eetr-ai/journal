"use client";

import { useEffect } from "react";
import { recallKey, touchKey } from "./session";

// Activity is cheap to notice and expensive to write down, so the deadline is
// pushed at most this often rather than on every event.
const TOUCH_EVERY_MS = 60_000;

/** How late the lock can be when nothing at all is happening in the tab. */
const CHECK_EVERY_MS = 30_000;

const ACTIVITY = ["pointerdown", "keydown"] as const;

/**
 * Keeps the vault open while it is being used, and notices when it is not.
 *
 * Only what a person does pushes the deadline out. Coming back to the tab asks
 * whether the key survived and never extends it, which is what makes this a
 * lock on idleness rather than on being closed: the clock is not shortened
 * while the app is in the background either, because a phone backgrounds one
 * every time it is put down and anything stricter is a password per glance.
 *
 * Reports that the key has gone rather than acting on it, so what happens next
 * stays with whoever already handles a vault that is not there. `onLocked` has
 * to keep its identity between renders, or the listeners are torn down and put
 * back on every one of them.
 */
export function useIdleLock(subject: string, onLocked: () => void) {
  useEffect(() => {
    const touchedAt = { at: 0 };
    let live = true;

    function report(held: boolean) {
      if (!held && live) {
        onLocked();
      }
    }

    // Reads without extending: recallKey is where an expired record is noticed
    // and thrown away.
    async function check() {
      if (document.visibilityState === "visible" && live) {
        report(Boolean(await recallKey(subject)));
      }
    }

    async function touch() {
      touchedAt.at = Date.now();
      report(await touchKey(subject));
    }

    function onActivity() {
      if (Date.now() - touchedAt.at >= TOUCH_EVERY_MS) {
        void touch();
      }
    }

    function onReturn() {
      void check();
    }

    const timer = setInterval(onReturn, CHECK_EVERY_MS);

    document.addEventListener("visibilitychange", onReturn);

    for (const name of ACTIVITY) {
      document.addEventListener(name, onActivity);
    }

    return () => {
      live = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onReturn);

      for (const name of ACTIVITY) {
        document.removeEventListener(name, onActivity);
      }
    };
  }, [subject, onLocked]);
}
