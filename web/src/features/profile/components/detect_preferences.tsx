"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { detectPreferencesAction } from "../actions";
import { detectedTimezone, locationFromTimezone } from "../timezones";

export interface DetectPreferencesOptions {
  /** False once everything detectable has been settled, so this does nothing. */
  needed: boolean;
}

/**
 * Fills in what only the browser knows, once, the first time a signed-in page
 * renders. Renders nothing.
 *
 * The server decides what to keep: this offers values, it does not impose them.
 */
export default function DetectPreferences(options: DetectPreferencesOptions) {
  const router = useRouter();

  useEffect(() => {
    if (!options.needed) {
      return;
    }

    const timezone = detectedTimezone();

    async function adopt() {
      await detectPreferencesAction({ timezone, location: locationFromTimezone(timezone) });
      // So the page showing an empty time zone picks up the detected one now,
      // rather than on whatever navigation happens next.
      router.refresh();
    }

    void adopt();
  }, [options.needed, router]);

  return null;
}
