import type { KdfParams, Vault, VaultPasskey } from "./types";

/**
 * What the server checks about a vault it is asked to store.
 *
 * It cannot verify the cryptography — it has no key and that is the point — but
 * it can refuse a vault whose parameters are weaker than we are willing to
 * stand behind, so a compromised or downgraded client cannot quietly re-wrap
 * someone's key under something cheap to brute-force.
 *
 * It also refuses anything the browser could not later decode: a vault that
 * stores and then throws on unlock is a person locked out of their own writing.
 */

// The floor, not the default. OWASP's minimum for Argon2id at p=1 is 19 MiB and
// two passes; the app derives at 64 MiB and three. The ceilings are there so a
// stored parameter cannot make every future unlock hang or run out of memory.
const MIN_MEMORY_KIB = 19_456;
const MAX_MEMORY_KIB = 262_144;
const MIN_ITERATIONS = 2;
const MAX_ITERATIONS = 10;
const MIN_PARALLELISM = 1;
const MAX_PARALLELISM = 4;

const MIN_SALT_BYTES = 16;
const MAX_SALT_BYTES = 64;

// Exactly what the browser writes: a 32-byte HKDF output, and iv ‖ ciphertext ‖
// tag over a 32-byte key — 12 + 32 + 16.
const VERIFIER_BYTES = 32;
const WRAPPED_KEY_BYTES = 60;

const MAX_FIELD_CHARS = 4096;
const MAX_LABEL_CHARS = 120;

// Four base64 characters encode three bytes.
const BASE64_GROUP = 4;
const BYTES_PER_GROUP = 3;

// Strict and padded: a length that is not a multiple of four, or padding in the
// middle, is what makes atob() throw rather than return something wrong.
const BASE64 = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
const BASE64URL = /^[A-Za-z0-9_-]+$/;

// The key the browser hands the agent, base64: AES-256 is 32 bytes, which is 43
// characters and one pad. Checked wherever one is accepted, because an unusable
// key is discovered mid-run having already half-written something.
const AGENT_KEY = /^[A-Za-z0-9+/]{43}=$/u;
const PADDING = /=+$/;

function base64Bytes(value: string): number {
  const padding = value.length - value.replace(PADDING, "").length;

  return (value.length / BASE64_GROUP) * BYTES_PER_GROUP - padding;
}

/** Decodable base64, decoding to a size between the two bounds inclusive. */
function isBase64Of(value: string, min: number, max: number): boolean {
  if (value.length === 0 || value.length > MAX_FIELD_CHARS || !BASE64.test(value)) {
    return false;
  }

  const bytes = base64Bytes(value);

  return bytes >= min && bytes <= max;
}

function withinRange(value: number, min: number, max: number): boolean {
  return Number.isInteger(value) && value >= min && value <= max;
}

function paramsAreSound(params: KdfParams): boolean {
  return (
    isBase64Of(params.salt, MIN_SALT_BYTES, MAX_SALT_BYTES) &&
    withinRange(params.memoryKib, MIN_MEMORY_KIB, MAX_MEMORY_KIB) &&
    withinRange(params.iterations, MIN_ITERATIONS, MAX_ITERATIONS) &&
    withinRange(params.parallelism, MIN_PARALLELISM, MAX_PARALLELISM)
  );
}

export function vaultIsStorable(vault: Vault): boolean {
  return (
    vault.kdf === "argon2id" &&
    paramsAreSound(vault.params) &&
    isBase64Of(vault.verifier, VERIFIER_BYTES, VERIFIER_BYTES) &&
    isBase64Of(vault.wrappedKey, WRAPPED_KEY_BYTES, WRAPPED_KEY_BYTES)
  );
}

export function passkeyIsStorable(passkey: Omit<VaultPasskey, "createdAt">): boolean {
  return (
    passkey.credentialId.length > 0 &&
    passkey.credentialId.length <= MAX_FIELD_CHARS &&
    BASE64URL.test(passkey.credentialId) &&
    isBase64Of(passkey.prfSalt, MIN_SALT_BYTES, MAX_SALT_BYTES) &&
    isBase64Of(passkey.wrappedKey, WRAPPED_KEY_BYTES, WRAPPED_KEY_BYTES) &&
    passkey.label.length <= MAX_LABEL_CHARS
  );
}

/** The shape of the key that travels on a request body. Never its value. */
export function isAgentKey(value: string): boolean {
  return AGENT_KEY.test(value);
}
