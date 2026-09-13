import type { KdfParams, Vault, VaultPasskey } from "./types";

/**
 * What the server checks about a vault it is asked to store.
 *
 * It cannot verify the cryptography — it has no key and that is the point — but
 * it can refuse a vault whose parameters are weaker than we are willing to
 * stand behind, so a compromised or downgraded client cannot quietly re-wrap
 * someone's key under something cheap to brute-force.
 */

// The floor, not the default. OWASP's minimum for Argon2id at p=1 is 19 MiB and
// two passes; the app derives at 64 MiB and three.
const MIN_MEMORY_KIB = 19_456;
const MIN_ITERATIONS = 2;
const MIN_PARALLELISM = 1;
const MAX_PARALLELISM = 4;

const MIN_SALT_BYTES = 16;
const MAX_FIELD_CHARS = 4096;
const MAX_LABEL_CHARS = 120;

// Four base64 characters encode three bytes.
const BASE64_GROUP = 4;
const BYTES_PER_GROUP = 3;

const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;
const BASE64URL = /^[A-Za-z0-9_-]+$/;

function base64Bytes(value: string): number {
  return Math.floor((value.length * BYTES_PER_GROUP) / BASE64_GROUP);
}

function isBase64(value: string): boolean {
  return value.length > 0 && value.length <= MAX_FIELD_CHARS && BASE64.test(value);
}

function paramsAreSound(params: KdfParams): boolean {
  return (
    isBase64(params.salt) &&
    base64Bytes(params.salt) >= MIN_SALT_BYTES &&
    Number.isInteger(params.memoryKib) &&
    params.memoryKib >= MIN_MEMORY_KIB &&
    Number.isInteger(params.iterations) &&
    params.iterations >= MIN_ITERATIONS &&
    Number.isInteger(params.parallelism) &&
    params.parallelism >= MIN_PARALLELISM &&
    params.parallelism <= MAX_PARALLELISM
  );
}

export function vaultIsStorable(vault: Vault): boolean {
  return (
    vault.kdf === "argon2id" &&
    paramsAreSound(vault.params) &&
    isBase64(vault.verifier) &&
    isBase64(vault.wrappedKey)
  );
}

export function passkeyIsStorable(passkey: Omit<VaultPasskey, "createdAt">): boolean {
  return (
    passkey.credentialId.length > 0 &&
    passkey.credentialId.length <= MAX_FIELD_CHARS &&
    BASE64URL.test(passkey.credentialId) &&
    isBase64(passkey.prfSalt) &&
    isBase64(passkey.wrappedKey) &&
    passkey.label.length <= MAX_LABEL_CHARS
  );
}
