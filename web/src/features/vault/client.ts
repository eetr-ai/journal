import "server-only";
import { RestClient } from "@eetr/ts-rest-utils";
import {
  stateFromEntity,
  vaultToEntity,
  type Vault,
  type VaultPasskey,
  type VaultState,
  type VaultStateEntity,
} from "./types";

/**
 * The only thing in the app that knows how vaults are stored.
 *
 * A person with no vault is `{ vault: null, passkeys: [] }` rather than an
 * error: asking whether there is one is the first thing the unlock screen does.
 */

const DEFAULT_AGENT_URL = "http://localhost:8080";
const REQUEST_TIMEOUT_MS = 5_000;
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

function vaultPath(subject: string): string {
  return `/vaults/${encodeURIComponent(subject)}`;
}

export const vaultClient = {
  async read(subject: string): Promise<VaultState> {
    const response = await agent().get<VaultStateEntity>(vaultPath(subject));

    return stateFromEntity(response.getOrThrow());
  },

  async save(subject: string, vault: Vault): Promise<void> {
    const response = await agent().put(vaultPath(subject), vaultToEntity(vault));

    response.getOrThrow();
  },

  async addPasskey(subject: string, passkey: Omit<VaultPasskey, "createdAt">): Promise<void> {
    const response = await agent().post(`${vaultPath(subject)}/passkeys`, {
      credential_id: passkey.credentialId,
      prf_salt: passkey.prfSalt,
      wrapped_key: passkey.wrappedKey,
      label: passkey.label,
    });

    response.getOrThrow();
  },

  async removePasskey(subject: string, credentialId: string): Promise<void> {
    const response = await agent().delete(
      `${vaultPath(subject)}/passkeys/${encodeURIComponent(credentialId)}`,
    );

    response.getOrThrow();
  },
};
