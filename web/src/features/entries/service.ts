import "server-only";
import { cache } from "react";
import { auth } from "@/auth";
import { entriesClient } from "./client";
import { isDay, searchFrom } from "./rules";
import { momentFor } from "@/features/chat/now";
import { currentProfile } from "@/features/profile/service";
import type { Entry, SearchHit } from "./types";

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

/** The days with something on them, for the calendar. Empty when unreachable. */
export const writtenDays = cache(async (): Promise<string[]> => {
  const subject = (await auth())?.user?.subject;

  if (!subject) {
    return [];
  }

  try {
    return await entriesClient.days(subject);
  } catch {
    return [];
  }
});

/**
 * One day's entries, for a day the calendar picked that the drawer may not be
 * holding — the list is capped, and a journal outlives its cap.
 */
export async function entriesOnDay(date: string): Promise<Entry[]> {
  const subject = (await auth())?.user?.subject;

  if (!subject || !isDay(date)) {
    return [];
  }

  try {
    return await entriesClient.onDay(subject, date);
  } catch {
    return [];
  }
}

export type RemoveOutcome = "removed" | "failed";

/**
 * Throw an entry away. The subject comes from the session, so an id is not
 * enough to reach one — the agent scopes the statement by subject as well.
 */
export async function deleteEntry(id: string): Promise<RemoveOutcome> {
  const subject = (await auth())?.user?.subject;

  if (!subject) {
    return "failed";
  }

  try {
    await entriesClient.remove(subject, id);

    return "removed";
  } catch {
    return "failed";
  }
}

export type SearchOutcome =
  | { status: "found"; hits: SearchHit[] }
  | { status: "invalid" }
  | { status: "failed" };

/**
 * Search the journal.
 *
 * The key is an argument because the entries have to be opened to be ranked and
 * this server cannot open them. It arrives in the body of a request the reader
 * started, is handed straight on, and is kept by nobody. Never log it.
 */
export async function searchEntries(
  query: string,
  key: string,
  locale: string,
): Promise<SearchOutcome> {
  const subject = (await auth())?.user?.subject;
  const ask = searchFrom(query, key, locale);

  if (!subject || !ask) {
    return { status: "invalid" };
  }

  try {
    return { status: "found", hits: await entriesClient.search(subject, ask) };
  } catch {
    return { status: "failed" };
  }
}

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
  /** Every day with something on it, which is more than the list above holds. */
  days: string[];
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
  const days = await writtenDays();

  if (!requested || held.some((entry) => entry.id === requested)) {
    return { entries: held, showing: requested ?? null, today, days };
  }

  const older = await reachFor(requested);

  return {
    entries: older ? [older, ...held] : held,
    days,
    // An id that names nothing of this person's falls back to today rather than
    // leaving the panel pointed at an entry that will never arrive.
    showing: older ? requested : null,
    today,
  };
}
