import "server-only";
import { cache } from "react";
import { auth } from "@/auth";
import { entriesClient, type SaveAnswer } from "./client";
import {
  isDay,
  isEntryId,
  namesPictures,
  saveFrom,
  saveProblem,
  searchFrom,
  type SaveProblem,
} from "./rules";
import { imagesClient } from "@/features/images/client";
import { memoryDays, pickOne } from "./memory";
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

/**
 * Keep an entry, or let it go. The answer is the row as it now stands, so the
 * browser holds what the agent holds rather than what it hoped for.
 */
export async function setBookmark(id: string, keep: boolean): Promise<Entry | null> {
  const subject = (await auth())?.user?.subject;

  if (!subject) {
    return null;
  }

  try {
    return await entriesClient.bookmark(subject, id, keep);
  } catch {
    return null;
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

export type SaveOutcome =
  | { status: "saved"; entry: Entry }
  | { status: "stale"; version: number }
  | { status: "invalid"; problem: SaveProblem | null }
  | { status: "failed" };

// Only an entry whose words name a picture costs this lookup. For now it brings
// the pictures themselves back too, because that is the only listing there is.
async function picturesOf(subject: string, id: string, content: string): Promise<Set<string>> {
  if (!namesPictures(content)) {
    return new Set();
  }

  return new Set((await imagesClient.forEntry(subject, id)).map((image) => image.id));
}

function outcomeOf(answer: SaveAnswer): SaveOutcome {
  switch (answer.kind) {
    case "saved":
      return { status: "saved", entry: answer.entry };
    case "stale":
      return { status: "stale", version: answer.version };
    default:
      return { status: "failed" };
  }
}

/**
 * Save an entry written by hand.
 *
 * The key is an argument for the same reason a search's is: the words are
 * sealed where the key is, which is not here. Never log the arguments.
 */
export async function saveEntry(input: unknown, key: string): Promise<SaveOutcome> {
  const subject = (await auth())?.user?.subject;
  const save = saveFrom(input, key);

  if (!subject || !save) {
    return { status: "invalid", problem: null };
  }

  try {
    const problem = saveProblem(save, await picturesOf(subject, save.id, save.content));

    if (problem) {
      return { status: "invalid", problem };
    }

    return outcomeOf(await entriesClient.save(subject, save, key));
  } catch (error) {
    console.error("[entries] could not save an entry", error);

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

/** One entry by id, for a widget naming one the drawer may not hold. */
export async function readEntry(id: string): Promise<Entry | null> {
  return isEntryId(id) ? await reachFor(id) : null;
}

/**
 * Something written around this time some months or years ago, or null when
 * the journal has nothing that old. `shown` is the one on screen, which another
 * ask skips while there is anything else to give.
 */
export async function memory(shown?: string): Promise<Entry | null> {
  const profile = await currentProfile();
  const today = momentFor(profile?.config.timezone ?? "").date;
  const showing = shown && isEntryId(shown) ? await reachFor(shown) : null;
  const day = pickOne(memoryDays(await writtenDays(), today), (d) => d === showing?.date);

  if (!day) {
    return null;
  }

  return pickOne(await entriesOnDay(day), (entry) => entry.id === shown);
}
