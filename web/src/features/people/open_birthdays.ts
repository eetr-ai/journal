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
      nickname: await openSealed(person.nickname, key),
      relation: await openSealed(person.relation, key),
      birthday: await openSealed(person.birthday, key),
    })),
  );

  // Named the way the reader calls them, which is what a reminder should say.
  return opened.flatMap(({ id, name, nickname, relation, birthday }) =>
    name && birthday
      ? [{ id, person: { name: nickname || name, relation: relation ?? "", birthday } }]
      : [],
  );
}
