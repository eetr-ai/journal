"use client";

import { openSealed } from "@/features/chat/sealed";
import { factsFromJson, noFacts, type ProfileFacts } from "./types";

/** The profile's facts, opened under the key in this browser. Null when it will not open. */
export async function openFacts(sealed: string, key: string): Promise<ProfileFacts | null> {
  if (sealed === "") {
    return noFacts;
  }

  const opened = await openSealed(sealed, key);

  return opened === null ? null : factsFromJson(opened);
}
