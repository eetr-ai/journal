"use server";

import {
  addFact,
  deleteFact,
  deletePerson,
  readPerson,
  savePerson,
  type FactOutcome,
  type ReadOutcome,
  type SaveOutcome,
} from "./service";

/**
 * The people page's reads and writes, as the browser reaches them. Thin on
 * purpose: every rule lives in the service and in rules.ts.
 *
 * Where a key is an argument it is in the body of this request and nowhere
 * else. Never log the arguments to these functions.
 */

/** One person and their facts, sealed. No key travels: the browser opens them. */
export async function readPersonAction(id: string): Promise<ReadOutcome> {
  return await readPerson(id);
}

/** Add someone (no id), or replace who they are. */
export async function savePersonAction(
  id: string | null,
  draft: unknown,
  key: string,
): Promise<SaveOutcome> {
  return await savePerson(id, draft, key);
}

/** Forget someone. The confirmation happened in the browser. */
export async function deletePersonAction(id: string): Promise<boolean> {
  return await deletePerson(id);
}

export async function addFactAction(
  personId: string,
  fact: string,
  key: string,
): Promise<FactOutcome> {
  return await addFact(personId, fact, key);
}

export async function deleteFactAction(personId: string, factId: string): Promise<boolean> {
  return await deleteFact(personId, factId);
}
