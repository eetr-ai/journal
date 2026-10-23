"use client";

import { openSealed } from "@/features/chat/sealed";
import type { Readable } from "./birthdays";
import type { Person } from "./types";

/**
 * Opens, under the key in this browser, as much of each person as a birthday
 * needs. Someone whose name or birthday this key will not open is left out:
 * a reminder about nobody in particular is not one.
 */
export async function openForBirthdays(
  people: Person[],
  key: string,
): Promise<{ id: string; person: Readable }[]> {
  const opened = await Promise.all(
    people.map(async (person) => ({
      id: person.id,
      name: await openSealed(person.name, key),
      relation: await openSealed(person.relation, key),
      birthday: await openSealed(person.birthday, key),
    })),
  );

  return opened.flatMap(({ id, name, relation, birthday }) =>
    name && birthday ? [{ id, person: { name, relation: relation ?? "", birthday } }] : [],
  );
}
