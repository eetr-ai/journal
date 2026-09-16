"use server";

import {
  deleteEntry,
  entriesOnDay,
  searchEntries,
  type RemoveOutcome,
  type SearchOutcome,
} from "./service";
import type { Entry } from "./types";

/**
 * The journal's write and ask side, as the browser reaches it.
 *
 * Thin on purpose: every rule lives in the service and in rules.ts, so nothing
 * here decides anything. The subject is never an argument — it comes from the
 * session, on the other side of this boundary.
 */

/**
 * Find entries that bear on a question.
 *
 * The key is an argument, which means it is in the body of this request and
 * nowhere else: not in the URL, not in a cookie, not kept once the answer is
 * back. Never log the arguments to this function.
 */
export async function searchEntriesAction(
  query: string,
  key: string,
  locale: string,
): Promise<SearchOutcome> {
  return await searchEntries(query, key, locale);
}

/** Throw an entry away. The confirmation happened in the browser. */
export async function deleteEntryAction(id: string): Promise<RemoveOutcome> {
  return await deleteEntry(id);
}

/** A day the calendar picked, which the drawer's capped list may not hold. */
export async function entriesOnDayAction(date: string): Promise<Entry[]> {
  return await entriesOnDay(date);
}
