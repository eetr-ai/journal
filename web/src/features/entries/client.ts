import "server-only";
import { RestClient } from "@eetr/ts-rest-utils";
import { entryFromEntity, type EntriesEntity, type Entry, type EntryEntity } from "./types";

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
