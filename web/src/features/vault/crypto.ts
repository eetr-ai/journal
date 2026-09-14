"use client";

import { argon2id } from "hash-wasm";
import { equalBytes, fromBase64, randomBytes, toBase64, type Bytes } from "./encoding";
import type { KdfParams, Vault } from "./types";

/**
 * Everything here runs in the browser and nowhere else.
 *
 * The password is stretched with Argon2id, and that one output is split by HKDF
 * into two values that cannot be derived from each other: a verifier, which the
 * server stores and which is useless for decryption, and a wrapping key, which
 * never leaves this module. The data key is random, wrapped under the wrapping
 * key, and imported non-extractable so nothing downstream can read its bytes
 * back out.
 */

// The floor is lower (see rules.ts); this is what new vaults are built with.
const MEMORY_KIB = 65_536;
const ITERATIONS = 3;
const PARALLELISM = 1;

const SALT_BYTES = 16;
const KEY_BYTES = 32;
const IV_BYTES = 12;

// Domain separation. Two labels over one secret, so holding the verifier says
// nothing about the wrapping key.
const VERIFIER_LABEL = "eetr-journal/vault/verifier/v1";
const WRAP_LABEL = "eetr-journal/vault/wrap/v1";
// The one key here that is meant to leave the browser. Agent memory is written
// by the runtime rather than by anything holding a key, so sealing a
// conversation means sending the key with the run that writes it. Deriving it
// from the data key rather than sending the data key is what keeps that blast
// radius to conversations: what travels cannot open an entry.
const AGENT_LABEL = "eetr-journal/agent/v1";

const BITS_PER_BYTE = 8;

export const defaultKdfParams = (): KdfParams => ({
  salt: toBase64(randomBytes(SALT_BYTES)),
  memoryKib: MEMORY_KIB,
  iterations: ITERATIONS,
  parallelism: PARALLELISM,
});

async function stretch(password: string, params: KdfParams): Promise<Bytes> {
  // Copied into a plain buffer: hash-wasm's view may be backed by its own
  // memory, and WebCrypto will not take that.
  const derived = await argon2id({
    password,
    salt: fromBase64(params.salt),
    parallelism: params.parallelism,
    iterations: params.iterations,
    memorySize: params.memoryKib,
    hashLength: KEY_BYTES,
    outputType: "binary",
  });

  return new Uint8Array(derived);
}

async function expand(secret: Bytes, label: string): Promise<Bytes> {
  const material = await crypto.subtle.importKey("raw", secret, "HKDF", false, ["deriveBits"]);

  const bits = await crypto.subtle.deriveBits(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: new Uint8Array(),
      info: new TextEncoder().encode(label),
    },
    material,
    KEY_BYTES * BITS_PER_BYTE,
  );

  return new Uint8Array(bits);
}

async function wrappingKey(secret: Bytes): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", await expand(secret, WRAP_LABEL), "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
}

/**
 * What an unlocked vault holds.
 *
 * Two keys with deliberately different privileges. The data key is a
 * non-extractable CryptoKey because nothing should ever be able to send it; the
 * agent key is bytes because sending it is the whole point of having it.
 */
export interface VaultKeys {
  dataKey: CryptoKey;
  /** Base64, the form the sidecar takes it in. */
  agentKey: string;
}

async function keysFrom(raw: Bytes): Promise<VaultKeys> {
  return {
    dataKey: await asDataKey(raw),
    agentKey: toBase64(await expand(raw, AGENT_LABEL)),
  };
}

/** Imported non-extractable: from here on the raw bytes are unreachable. */
async function asDataKey(raw: Bytes): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function wrap(raw: Bytes, key: CryptoKey): Promise<string> {
  const iv = randomBytes(IV_BYTES);
  const sealed = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, raw);

  const packed = new Uint8Array(iv.length + sealed.byteLength);
  packed.set(iv);
  packed.set(new Uint8Array(sealed), iv.length);

  return toBase64(packed);
}

/** The wrapped bytes, or null when the key was wrong — the tag says so. */
export async function unwrap(wrapped: string, key: CryptoKey): Promise<Bytes | null> {
  const packed = fromBase64(wrapped);

  try {
    const opened = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: packed.slice(0, IV_BYTES) },
      key,
      packed.slice(IV_BYTES),
    );

    return new Uint8Array(opened);
  } catch {
    return null;
  }
}

/** A brand new vault, and the data key it protects. */
export async function createVault(password: string): Promise<{ vault: Vault; keys: VaultKeys }> {
  const params = defaultKdfParams();
  const secret = await stretch(password, params);
  const raw = randomBytes(KEY_BYTES);

  const vault: Vault = {
    kdf: "argon2id",
    params,
    verifier: toBase64(await expand(secret, VERIFIER_LABEL)),
    wrappedKey: await wrap(raw, await wrappingKey(secret)),
  };

  return { vault, keys: await keysFrom(raw) };
}

/**
 * The raw data key bytes, or null when the password was wrong.
 *
 * Bytes rather than a key, because enrolling a passkey has to re-wrap them.
 * Everything that only needs to decrypt takes the non-extractable key instead.
 */
export async function unwrapWithPassword(password: string, vault: Vault): Promise<Bytes | null> {
  const secret = await stretch(password, vault.params);

  if (!equalBytes(await expand(secret, VERIFIER_LABEL), fromBase64(vault.verifier))) {
    return null;
  }

  return unwrap(vault.wrappedKey, await wrappingKey(secret));
}

/**
 * The data key, or null when the password was wrong.
 *
 * The verifier is what separates "wrong password" from "corrupt vault", which
 * the AEAD tag alone cannot tell apart.
 */
export async function unlockWithPassword(
  password: string,
  vault: Vault,
): Promise<VaultKeys | null> {
  const secret = await stretch(password, vault.params);

  if (!equalBytes(await expand(secret, VERIFIER_LABEL), fromBase64(vault.verifier))) {
    return null;
  }

  const raw = await unwrap(vault.wrappedKey, await wrappingKey(secret));

  return raw ? keysFrom(raw) : null;
}

export { wrappingKey as wrappingKeyFrom, asDataKey, keysFrom };
