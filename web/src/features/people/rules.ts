import { isAgentKey } from "@/features/vault/rules";

/**
 * Every rule about what a person and a fact may be, in one place the form and
 * the server action both call, so the two can never disagree. The agent judges
 * none of it.
 */

export type PersonIssueCode = "required" | "tooLong" | "badBirthday";

/** A person as the form submits them, in the clear. */
export interface PersonDraft {
  name: string;
  relation: string;
  birthday: string;
  notes: string;
}

export type PersonIssues = Partial<Record<keyof PersonDraft, PersonIssueCode>>;

/** A person on their way to the agent, and the key they are sealed under. */
export interface PersonWrite {
  key: string;
  person: PersonDraft;
}

export interface FactWrite {
  key: string;
  fact: string;
}

export const EMPTY_DRAFT: PersonDraft = { name: "", relation: "", birthday: "", notes: "" };

const MAX_NAME = 120;
const MAX_RELATION = 120;
const MAX_NOTES = 4_000;
export const MAX_FACT = 1_000;

const MONTHS = 12;
// Where a birthday with no year is checked: a leap year, so 29 February is a
// day it can fall on.
const LEAP_YEAR = 2000;

// YYYY-MM-DD, or MM-DD when the year is not known.
const BIRTHDAY = /^(?:(\d{4})-)?(\d{2})-(\d{2})$/u;

// Ids are UUIDs, minted by Postgres.
const PERSON_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u;

export function isPersonId(value: unknown): value is string {
  return typeof value === "string" && PERSON_ID.test(value);
}

function isCalendarDay(year: number, month: number, day: number): boolean {
  if (month < 1 || month > MONTHS || day < 1) {
    return false;
  }

  // Date.UTC rolls a day that does not exist into the next month.
  return new Date(Date.UTC(year, month - 1, day)).getUTCDate() === day;
}

/** Month and day of a well-formed birthday, or null. Empty is not one. */
export function birthdayParts(value: string): { month: number; day: number } | null {
  const match = BIRTHDAY.exec(value);

  if (!match) {
    return null;
  }

  const year = match[1] === undefined ? LEAP_YEAR : Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  return isCalendarDay(year, month, day) ? { month, day } : null;
}

function birthday(value: string): PersonIssueCode | undefined {
  if (value.trim() === "") {
    return undefined;
  }

  return birthdayParts(value.trim()) ? undefined : "badBirthday";
}

function text(value: string, limit: number, required: boolean): PersonIssueCode | undefined {
  if (required && value.trim() === "") {
    return "required";
  }

  return value.length > limit ? "tooLong" : undefined;
}

/** Every problem with a draft, keyed by field. An empty object means it is good. */
export function validatePerson(draft: PersonDraft): PersonIssues {
  const ret: PersonIssues = {};
  const found: [keyof PersonDraft, PersonIssueCode | undefined][] = [
    ["name", text(draft.name, MAX_NAME, true)],
    ["relation", text(draft.relation, MAX_RELATION, false)],
    ["birthday", birthday(draft.birthday)],
    ["notes", text(draft.notes, MAX_NOTES, false)],
  ];

  for (const [field, code] of found) {
    if (code) {
      ret[field] = code;
    }
  }

  return ret;
}

/** A draft as it is stored: trimmed, so " 03-14" and "03-14" are one birthday. */
export function tidyDraft(draft: PersonDraft): PersonDraft {
  return {
    name: draft.name.trim(),
    relation: draft.relation.trim(),
    birthday: draft.birthday.trim(),
    notes: draft.notes.trim(),
  };
}

function draftFrom(value: unknown): PersonDraft | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  const fields = ["name", "relation", "birthday", "notes"] as const;

  if (!fields.every((field) => typeof candidate[field] === "string")) {
    return null;
  }

  return {
    name: candidate.name as string,
    relation: candidate.relation as string,
    birthday: candidate.birthday as string,
    notes: candidate.notes as string,
  };
}

/**
 * A posted person, tidied, or null when it is not a shape we would send
 * ourselves. Total: what reaches a server action is unknown.
 */
export function personWriteFrom(value: unknown, key: unknown): PersonWrite | null {
  const draft = draftFrom(value);

  if (!draft || typeof key !== "string" || !isAgentKey(key)) {
    return null;
  }

  return { key, person: tidyDraft(draft) };
}

/** Whether a fact could be kept: something to say, and not an essay. */
export function factProblem(fact: string): PersonIssueCode | null {
  return text(fact, MAX_FACT, true) ?? null;
}

export function factWriteFrom(fact: unknown, key: unknown): FactWrite | null {
  if (typeof fact !== "string" || typeof key !== "string" || !isAgentKey(key)) {
    return null;
  }

  return factProblem(fact) ? null : { key, fact: fact.trim() };
}
