import "server-only";
import { RestClient } from "@eetr/ts-rest-utils";
import { profileFromEntity, type Profile, type ProfileConfig, type ProfileEntity } from "./types";

/**
 * The only thing in the app that knows how profiles are stored.
 *
 * One method per operation, each owning its path, its payload and what a
 * non-2xx means, so no caller builds a URL or reads a status code. A missing
 * profile is `null` rather than an exception, because it is an ordinary state;
 * anything else the agent answers is a failure and throws.
 */

const DEFAULT_AGENT_URL = "http://localhost:8080";
const REQUEST_TIMEOUT_MS = 5_000;
const NOT_FOUND = 404;
const ATTEMPTS = 2;

/** What a write sends. The subject travels in the path, never in the body. */
export interface ProfileWrite {
  email: string;
  name: string;
  config: ProfileConfig;
}

let client: RestClient | undefined;

function agent(): RestClient {
  client ??= new RestClient({
    baseUrl: process.env.AGENT_URL ?? DEFAULT_AGENT_URL,
    timeoutMs: REQUEST_TIMEOUT_MS,
    // One extra attempt covers a rolling restart of the agent; more would just
    // hold a render open.
    retry: { attempts: ATTEMPTS },
    // A profile is per-request state, so nothing here may be cached across them.
    defaultInit: { cache: "no-store" },
  });

  return client;
}

function profilePath(subject: string): string {
  // Subjects are issuer-shaped and routinely carry `|` and `:`.
  return `/profiles/${encodeURIComponent(subject)}`;
}

export const profileClient = {
  /** The stored profile, or null when this subject has none yet. */
  async read(subject: string): Promise<Profile | null> {
    const response = await agent().get<ProfileEntity>(profilePath(subject));

    if (response.status === NOT_FOUND) {
      return null;
    }

    return profileFromEntity(response.getOrThrow());
  },

  /** Insert or replace the profile, and return it as it was stored. */
  async save(subject: string, write: ProfileWrite): Promise<Profile> {
    const response = await agent().put<ProfileEntity>(profilePath(subject), write);

    return profileFromEntity(response.getOrThrow());
  },
};
