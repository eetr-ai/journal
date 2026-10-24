/**
 * A person in somebody's life, on both sides of the agent boundary.
 *
 * Everything but the ids and timestamps is sealed as stored: `enc1:` and the
 * ciphertext. Only the browser holds the key that opens it.
 */

/** A person as stored, every text field still sealed. */
export interface Person {
  id: string;
  name: string;
  nickname: string;
  relation: string;
  birthday: string;
  notes: string;
  proximity: string;
}

export interface PersonEntity {
  id: string;
  name: string;
  /** Absent from an agent that predates nicknames. */
  nickname?: string;
  relation: string;
  birthday: string;
  notes: string;
  proximity: string;
  created_at: string;
  updated_at: string;
}

export interface PeopleEntity {
  people: PersonEntity[];
}

/** One thing worth knowing about someone, `fact` sealed as stored. */
export interface PersonFact {
  id: string;
  personId: string;
  fact: string;
}

export interface PersonFactEntity {
  id: string;
  person_id: string;
  fact: string;
  created_at: string;
}

export interface PersonDetailEntity {
  person: PersonEntity;
  facts: PersonFactEntity[];
}

export interface FactAddedEntity {
  added: boolean;
  fact?: PersonFactEntity;
}

export type PersonField = "name" | "nickname" | "relation" | "birthday" | "notes" | "proximity";

/** A person opened under the key, as the page shows and edits them. */
export interface OpenedPerson {
  /** Their full name, as far as it is known. */
  name: string;
  /** What they are called day to day; empty when it is just their name. */
  nickname: string;
  relation: string;
  birthday: string;
  notes: string;
  /** "1".."5", 5 the innermost circle; empty when not known. */
  proximity: string;
  /** The fields the key would not open. Their text above is only a stand-in. */
  unreadable: PersonField[];
}

export interface OpenedFact {
  id: string;
  fact: string;
}

export function personFromEntity(entity: PersonEntity): Person {
  return {
    id: entity.id,
    name: entity.name,
    nickname: entity.nickname ?? "",
    relation: entity.relation,
    birthday: entity.birthday,
    notes: entity.notes,
    proximity: entity.proximity,
  };
}

/** What the reader calls someone: their nickname, else their name. */
export function calledBy(person: { name: string; nickname: string }): string {
  return person.nickname || person.name;
}

export function factFromEntity(entity: PersonFactEntity): PersonFact {
  return { id: entity.id, personId: entity.person_id, fact: entity.fact };
}
