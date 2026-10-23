import "server-only";
import { RestClient } from "@eetr/ts-rest-utils";
import type { FactWrite, PersonWrite } from "./rules";
import {
  factFromEntity,
  personFromEntity,
  type FactAddedEntity,
  type PeopleEntity,
  type Person,
  type PersonDetailEntity,
  type PersonEntity,
  type PersonFact,
} from "./types";

/**
 * The only thing in the app that knows how people are stored.
 *
 * One method per operation, each owning its path and what a non-2xx means. A
 * person who is not there is `null`, because asking for one just forgotten is
 * ordinary; anything else the agent answers is a failure and throws.
 *
 * Nothing here decrypts, and nothing here could: what comes back is sealed, and
 * the key only passes through on the writes that seal with it.
 */

const DEFAULT_AGENT_URL = "http://localhost:8080";
const REQUEST_TIMEOUT_MS = 5_000;
const NOT_FOUND = 404;
const ATTEMPTS = 2;
// A write is not retried: one that landed and lost its answer would add the
// same person or fact twice.
const WRITE_ATTEMPTS = 1;

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

function peoplePath(subject: string): string {
  // Subjects are issuer-shaped and routinely carry `|` and `:`.
  return `/people/${encodeURIComponent(subject)}`;
}

function personPath(subject: string, id: string): string {
  return `${peoplePath(subject)}/${encodeURIComponent(id)}`;
}

export interface PersonDetail {
  person: Person;
  facts: PersonFact[];
}

export const peopleClient = {
  /** Everyone, sealed, without their facts. Nobody is an ordinary answer. */
  async list(subject: string): Promise<Person[]> {
    const response = await agent().get<PeopleEntity>(peoplePath(subject));

    return response.getOrThrow().people.map(personFromEntity);
  },

  /** One person and their facts, sealed; null when they are not this person's. */
  async read(subject: string, id: string): Promise<PersonDetail | null> {
    const response = await agent().get<PersonDetailEntity>(personPath(subject, id));

    if (response.status === NOT_FOUND) {
      return null;
    }

    const detail = response.getOrThrow();

    return { person: personFromEntity(detail.person), facts: detail.facts.map(factFromEntity) };
  },

  /** Add someone, sealed by the agent under the key; returns them as stored. */
  async create(subject: string, write: PersonWrite): Promise<Person> {
    const response = await agent().post<PersonEntity>(
      peoplePath(subject),
      { key: write.key, ...write.person },
      { retry: { attempts: WRITE_ATTEMPTS } },
    );

    return personFromEntity(response.getOrThrow());
  },

  /** Replace who someone is. Null when they are not this person's. */
  async replace(subject: string, id: string, write: PersonWrite): Promise<Person | null> {
    const response = await agent().put<PersonEntity>(
      personPath(subject, id),
      { key: write.key, ...write.person },
      { retry: { attempts: WRITE_ATTEMPTS } },
    );

    if (response.status === NOT_FOUND) {
      return null;
    }

    return personFromEntity(response.getOrThrow());
  },

  /** Forget someone and everything known about them. False when it named nobody. */
  async remove(subject: string, id: string): Promise<boolean> {
    const response = await agent().delete<{ deleted: boolean }>(personPath(subject, id));

    return response.getOrThrow().deleted;
  },

  /** Keep a fact with someone. Null when they are not this person's. */
  async addFact(subject: string, id: string, write: FactWrite): Promise<PersonFact | null> {
    const response = await agent().post<FactAddedEntity>(
      `${personPath(subject, id)}/facts`,
      { key: write.key, fact: write.fact },
      { retry: { attempts: WRITE_ATTEMPTS } },
    );

    if (response.status === NOT_FOUND) {
      return null;
    }

    const added = response.getOrThrow();

    return added.fact ? factFromEntity(added.fact) : null;
  },

  /** Forget one fact. False when it named nothing of this person's. */
  async removeFact(subject: string, id: string, factId: string): Promise<boolean> {
    const response = await agent().delete<{ deleted: boolean }>(
      `${personPath(subject, id)}/facts/${encodeURIComponent(factId)}`,
    );

    return response.getOrThrow().deleted;
  },
};
