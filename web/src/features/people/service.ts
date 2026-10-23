import "server-only";
import { auth } from "@/auth";
import { peopleClient, type PersonDetail } from "./client";
import {
  factWriteFrom,
  isPersonId,
  personWriteFrom,
  validatePerson,
  type PersonIssues,
} from "./rules";
import type { Person, PersonFact } from "./types";

/**
 * The rules the BFF owns between the session and the agent.
 *
 * The subject always comes from the session; nothing here takes one from a
 * caller. Where a key is an argument it is handed straight on to be sealed
 * with, and kept by nobody. Never log the arguments to these functions.
 */

async function subject(): Promise<string | null> {
  return (await auth())?.user?.subject ?? null;
}

/** Everyone, sealed. Null when they could not be fetched, so the page can say so. */
export async function people(): Promise<Person[] | null> {
  const owner = await subject();

  if (!owner) {
    return null;
  }

  try {
    return await peopleClient.list(owner);
  } catch (error) {
    console.error("[people] could not list people", error);

    return null;
  }
}

export type ReadOutcome =
  | { kind: "found"; detail: PersonDetail }
  | { kind: "missing" }
  | { kind: "failed" };

export async function readPerson(id: string): Promise<ReadOutcome> {
  const owner = await subject();

  if (!owner || !isPersonId(id)) {
    return { kind: "missing" };
  }

  try {
    const detail = await peopleClient.read(owner, id);

    return detail ? { kind: "found", detail } : { kind: "missing" };
  } catch (error) {
    console.error("[people] could not read a person", error);

    return { kind: "failed" };
  }
}

export type SaveOutcome =
  | { kind: "saved"; person: Person }
  | { kind: "invalid"; issues: PersonIssues }
  | { kind: "missing" }
  | { kind: "failed" };

/**
 * Add someone, or replace who they are when `id` names one of theirs. The
 * draft is checked against the same rules the form used.
 */
export async function savePerson(
  id: string | null,
  draft: unknown,
  key: string,
): Promise<SaveOutcome> {
  const owner = await subject();
  const write = personWriteFrom(draft, key);

  if (!owner || !write || (id !== null && !isPersonId(id))) {
    return { kind: "invalid", issues: {} };
  }

  const issues = validatePerson(write.person);

  if (Object.keys(issues).length > 0) {
    return { kind: "invalid", issues };
  }

  try {
    const person = id
      ? await peopleClient.replace(owner, id, write)
      : await peopleClient.create(owner, write);

    return person ? { kind: "saved", person } : { kind: "missing" };
  } catch (error) {
    console.error("[people] could not save a person", error);

    return { kind: "failed" };
  }
}

export async function deletePerson(id: string): Promise<boolean> {
  const owner = await subject();

  if (!owner || !isPersonId(id)) {
    return false;
  }

  try {
    return await peopleClient.remove(owner, id);
  } catch (error) {
    console.error("[people] could not forget a person", error);

    return false;
  }
}

export type FactOutcome =
  | { kind: "added"; fact: PersonFact }
  | { kind: "invalid" }
  | { kind: "missing" }
  | { kind: "failed" };

export async function addFact(personId: string, fact: unknown, key: string): Promise<FactOutcome> {
  const owner = await subject();
  const write = factWriteFrom(fact, key);

  if (!owner || !write || !isPersonId(personId)) {
    return { kind: "invalid" };
  }

  try {
    const added = await peopleClient.addFact(owner, personId, write);

    return added ? { kind: "added", fact: added } : { kind: "missing" };
  } catch (error) {
    console.error("[people] could not keep a fact", error);

    return { kind: "failed" };
  }
}

export async function deleteFact(personId: string, factId: string): Promise<boolean> {
  const owner = await subject();

  if (!owner || !isPersonId(personId) || !isPersonId(factId)) {
    return false;
  }

  try {
    return await peopleClient.removeFact(owner, personId, factId);
  } catch (error) {
    console.error("[people] could not forget a fact", error);

    return false;
  }
}
