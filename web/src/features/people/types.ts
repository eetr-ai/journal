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
  relation: string;
  birthday: string;
  notes: string;
  proximity: string;
}

export interface PersonEntity {
  id: string;
  name: string;
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

/** A person opened under the key, as the page shows and edits them. */
export interface OpenedPerson {
  name: string;
  relation: string;
  birthday: string;
  notes: string;
  /** "1".."5", 5 the innermost circle; empty when not known. */
  proximity: string;
}

export interface OpenedFact {
  id: string;
  fact: string;
}

export function personFromEntity(entity: PersonEntity): Person {
  return {
    id: entity.id,
    name: entity.name,
    relation: entity.relation,
    birthday: entity.birthday,
    notes: entity.notes,
    proximity: entity.proximity,
  };
}

export function factFromEntity(entity: PersonFactEntity): PersonFact {
  return { id: entity.id, personId: entity.person_id, fact: entity.fact };
}
