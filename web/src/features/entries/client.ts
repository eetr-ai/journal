import "server-only";
import { RestClient } from "@eetr/ts-rest-utils";
import type { SearchAsk } from "./rules";
import {
  entryFromEntity,
  hitFromEntity,
  type DaysEntity,
  type EntriesEntity,
  type Entry,
  type EntryEntity,
  type SearchEntity,
  type SearchHit,
} from "./types";

/**
 * The only thing in the app that knows how entries are stored.
 *
 * One method per operation, each owning its path and what a non-2xx means. An
 * entry that is not there is `null`, because asking for one that was deleted is
 * ordinary; anything else the agent answers is a failure and throws.
 *
 * Nothing here decrypts, and nothing here could: what comes back is sealed, and
 * the key never reaches this side.
 */

const DEFAULT_AGENT_URL = "http://localhost:8080";
const REQUEST_TIMEOUT_MS = 5_000;
const NOT_FOUND = 404;
const ATTEMPTS = 2;
// A search waits on a model reading the shortlist, which the five seconds every
// other call gets would cut off mid-thought.
const SEARCH_TIMEOUT_MS = 45_000;
// And it is not retried: a second attempt is a second model call, paid for, for
// a question the reader can simply ask again.
const SEARCH_ATTEMPTS = 1;

let client: RestClient | undefined;

function agent(): RestClient {
  client ??= new RestClient({
    baseUrl: process.env.AGENT_URL ?? DEFAULT_AGENT_URL,
    timeoutMs: REQUEST_TIMEOUT_MS,
    retry: { attempts: ATTEMPTS },
    defaultInit: { cache: "no-store" },
  });

  return client;
}

function entriesPath(subject: string): string {
  // Subjects are issuer-shaped and routinely carry `|` and `:`.
  return `/entries/${encodeURIComponent(subject)}`;
}

export const entriesClient = {
  /** This person's entries, newest first. Empty is an ordinary answer. */
  async list(subject: string): Promise<Entry[]> {
    const response = await agent().get<EntriesEntity>(entriesPath(subject));

    return response.getOrThrow().entries.map(entryFromEntity);
  },

  /** One day's entries, newest first. Empty is an ordinary answer. */
  async onDay(subject: string, date: string): Promise<Entry[]> {
    const response = await agent().get<EntriesEntity>(entriesPath(subject), {
      query: { date },
    });

    return response.getOrThrow().entries.map(entryFromEntity);
  },

  /** The days this person has written on, newest first. What the calendar marks. */
  async days(subject: string): Promise<string[]> {
    const response = await agent().get<DaysEntity>(`${entriesPath(subject)}/days`);

    return response.getOrThrow().days;
  },

  /**
   * Throw one away. An id that named nothing of this person's is not an error:
   * asking twice for the same entry to be gone is the same request.
   */
  async remove(subject: string, id: string): Promise<void> {
    const response = await agent().delete(`${entriesPath(subject)}/${encodeURIComponent(id)}`);

    response.getOrThrow();
  },

  /**
   * Entries that bear on a question, most useful first.
   *
   * What comes back is sealed like everything else here, with one line of
   * plaintext beside each saying why it is there — the ranking happened on the
   * other side of this boundary, where the key was.
   */
  async search(subject: string, ask: SearchAsk): Promise<SearchHit[]> {
    const response = await agent().post<SearchEntity>(`${entriesPath(subject)}/search`, ask, {
      timeoutMs: SEARCH_TIMEOUT_MS,
      retry: { attempts: SEARCH_ATTEMPTS },
    });

    return response.getOrThrow().results.map(hitFromEntity);
  },

  /** One entry, or null when this subject has none by that id. */
  async read(subject: string, id: string): Promise<Entry | null> {
    const response = await agent().get<EntryEntity>(
      `${entriesPath(subject)}/${encodeURIComponent(id)}`,
    );

    if (response.status === NOT_FOUND) {
      return null;
    }

    return entryFromEntity(response.getOrThrow());
  },
};
