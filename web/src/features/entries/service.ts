import "server-only";
import { cache } from "react";
import { auth } from "@/auth";
import { entriesClient } from "./client";
import { momentFor } from "@/features/chat/now";
import { currentProfile } from "@/features/profile/service";
import type { Entry } from "./types";

/**
 * The rules the BFF owns between the session and the agent.
 *
 * The subject always comes from the session. Nothing here takes one from a
 * caller, so no request can reach entries that are not its own — the agent
 * scopes every statement by subject as well, which is belt and braces on
 * purpose.
 */

export const entries = cache(async (): Promise<Entry[]> => {
  const subject = (await auth())?.user?.subject;

  if (!subject) {
    return [];
  }

  try {
    return await entriesClient.list(subject);
  } catch {
    // An empty drawer is a better answer than a page that will not render. The
    // conversation is what the page is for, and it does not need this.
    return [];
  }
});

/**
 * What the page needs to render the journal: the entries, the day it is for
 * this reader, and which entry the URL asked for.
 *
 * An id the list does not hold is reached for by id rather than ignored, so a
 * link to something written years ago opens on what it names instead of
 * quietly showing today.
 */
export interface JournalView {
  entries: Entry[];
  showing: string | null;
  today: string;
}

async function reachFor(id: string): Promise<Entry | null> {
  const subject = (await auth())?.user?.subject;

  if (!subject) {
    return null;
  }

  try {
    return await entriesClient.read(subject, id);
  } catch {
    return null;
  }
}

export async function journalView(requested?: string): Promise<JournalView> {
  const held = await entries();
  const profile = await currentProfile();
  const today = momentFor(profile?.config.timezone ?? "").date;

  if (!requested || held.some((entry) => entry.id === requested)) {
    return { entries: held, showing: requested ?? null, today };
  }

  const older = await reachFor(requested);

  return {
    entries: older ? [older, ...held] : held,
    // An id that names nothing of this person's falls back to today rather than
    // leaving the panel pointed at an entry that will never arrive.
    showing: older ? requested : null,
    today,
  };
}
