/**
 * What an entry is, on both sides of the agent boundary.
 *
 * `title` and `content` arrive sealed and stay that way here: the server has
 * nothing to open them with, so a value in an `Entry` is ciphertext until a
 * browser with the key has been through it. What is in the clear is the day, and
 * only because every lookup is by one.
 */

/** How many characters of a timestamp are the day. */
const DAY_CHARS = 10;

export interface Entry {
  id: string;
  /** The conversation it was written in, empty when it outlived one. */
  threadId: string;
  /** YYYY-MM-DD, in the zone the person wrote it in. */
  date: string;
  /** Sealed. */
  title: string;
  /** Sealed. */
  content: string;
  /** Kept by hand. In the clear, like the day it was written on. */
  bookmarked: boolean;
  createdAt: string;
  updatedAt: string;
}

/** An entry with the key already through it. */
export interface OpenedEntry {
  title: string;
  content: string;
}

export interface EntryEntity {
  id: string;
  thread_key: string;
  entry_date: string;
  title: string;
  content: string;
  bookmarked: boolean;
  created_at: string;
  updated_at: string;
}

export interface EntriesEntity {
  entries: EntryEntity[];
}

// The column is a date and Postgres hands it back as midnight UTC. Only the day
// is meaningful, and keeping the rest would invite somebody to render it in a
// zone and land on the day before.
export function entryFromEntity(entity: EntryEntity): Entry {
  return {
    id: entity.id,
    threadId: entity.thread_key,
    date: entity.entry_date.slice(0, DAY_CHARS),
    title: entity.title,
    content: entity.content,
    bookmarked: entity.bookmarked,
    createdAt: entity.created_at,
    updatedAt: entity.updated_at,
  };
}

/**
 * A search result: the entry exactly as stored, and the one line of plaintext
 * that came back with it.
 *
 * The entry stays sealed so the browser opens it the way it opens any other.
 * `why` is the exception, and a deliberate one — it is written by the model
 * that read the shortlist, so it is the only part of a search that reaches the
 * server in the clear and comes back that way.
 */
export interface SearchHit {
  entry: Entry;
  why: string;
}

export interface SearchHitEntity {
  entry: EntryEntity;
  why: string;
}

export interface SearchEntity {
  results: SearchHitEntity[];
}

export interface DaysEntity {
  days: string[];
}

export function hitFromEntity(entity: SearchHitEntity): SearchHit {
  return { entry: entryFromEntity(entity.entry), why: entity.why };
}

/**
 * An entry the reader started, before anything has been written into it.
 *
 * The id is minted here rather than by the agent so the panel and the address
 * bar have something to point at straight away, and so the first thing written
 * lands in this entry rather than in a second one. Nothing is stored until the
 * agent writes: a draft nobody says anything to leaves no row behind.
 *
 * `title` and `content` are empty rather than sealed, which is what the opening
 * side reads as "nothing here yet".
 */
export function draftEntry(date: string): Entry {
  const at = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    threadId: "",
    date,
    title: "",
    content: "",
    bookmarked: false,
    createdAt: at,
    updatedAt: at,
  };
}
