"use client";

import { keysFrom, unwrap, wrap, wrappingKeyFrom, type VaultKeys } from "./crypto";
import {
  fromBase64,
  fromBase64Url,
  randomBytes,
  toBase64,
  toBase64Url,
  toBytes,
  type Bytes,
} from "./encoding";
import type { VaultPasskey } from "./types";

/**
 * Quick unlock, built on the WebAuthn PRF extension.
 *
 * The passkey is not an authentication factor here — the identity provider
 * already settled who this is. It is somewhere to keep a secret the browser
 * cannot read: the authenticator returns 32 bytes for our salt, and those bytes
 * wrap a second copy of the same data key. So the challenges below are random
 * and nobody verifies them; there is no signature here worth checking.
 *
 * Support is not universal. Everything returns a clear "cannot" rather than
 * throwing, and the password stays the way in.
 */

const CHALLENGE_BYTES = 32;
const PRF_SALT_BYTES = 32;

// ES256 and RS256: what platform authenticators actually implement.
const ES256 = -7;
const RS256 = -257;

const RELYING_PARTY = "Eetr Journal";

export function passkeysAreAvailable(): boolean {
  return typeof window !== "undefined" && typeof window.PublicKeyCredential === "function";
}

function prfSecret(credential: PublicKeyCredential): Bytes | null {
  const results = credential.getClientExtensionResults().prf?.results;

  return results ? toBytes(results.first) : null;
}

/**
 * Enrol one passkey against an unlocked vault.
 *
 * Two round trips on purpose: fewer authenticators return a PRF result while
 * creating a credential than while asserting one, so the credential is made
 * first and the secret asked for second.
 */
export async function enrollPasskey(options: {
  subject: string;
  name: string;
  email: string;
  dataKey: Bytes;
  label: string;
}): Promise<Omit<VaultPasskey, "createdAt"> | null> {
  if (!passkeysAreAvailable()) {
    return null;
  }

  const created = (await navigator.credentials.create({
    publicKey: {
      challenge: randomBytes(CHALLENGE_BYTES),
      rp: { name: RELYING_PARTY, id: window.location.hostname },
      user: {
        id: new TextEncoder().encode(options.subject),
        name: options.email,
        displayName: options.name,
      },
      pubKeyCredParams: [
        { type: "public-key", alg: ES256 },
        { type: "public-key", alg: RS256 },
      ],
      authenticatorSelection: { residentKey: "required", userVerification: "required" },
      extensions: { prf: {} },
    },
  })) as PublicKeyCredential | null;

  if (!created?.getClientExtensionResults().prf?.enabled) {
    return null;
  }

  const prfSalt = randomBytes(PRF_SALT_BYTES);
  const secret = await evaluate([{ id: created.rawId, salt: prfSalt }]);

  if (!secret) {
    return null;
  }

  return {
    credentialId: toBase64Url(toBytes(created.rawId)),
    prfSalt: toBase64(prfSalt),
    wrappedKey: await wrap(options.dataKey, await wrappingKeyFrom(secret.output)),
    label: options.label,
  };
}

interface Candidate {
  id: ArrayBuffer;
  salt: Bytes;
}

/** Asks the authenticator for its PRF output, for whichever credential is used. */
async function evaluate(
  candidates: Candidate[],
): Promise<{ credentialId: string; output: Bytes } | null> {
  const byCredential: Record<string, { first: BufferSource }> = {};

  for (const candidate of candidates) {
    byCredential[toBase64Url(toBytes(candidate.id))] = { first: candidate.salt };
  }

  const assertion = (await navigator.credentials.get({
    publicKey: {
      challenge: randomBytes(CHALLENGE_BYTES),
      allowCredentials: candidates.map((candidate) => ({
        type: "public-key" as const,
        id: candidate.id,
      })),
      userVerification: "required",
      extensions: { prf: { evalByCredential: byCredential } },
    },
  })) as PublicKeyCredential | null;

  if (!assertion) {
    return null;
  }

  const output = prfSecret(assertion);

  return output ? { credentialId: toBase64Url(toBytes(assertion.rawId)), output } : null;
}

/** The data key, or null when no enrolled passkey could produce it. */
export async function unlockWithPasskey(passkeys: VaultPasskey[]): Promise<VaultKeys | null> {
  if (!passkeysAreAvailable() || passkeys.length === 0) {
    return null;
  }

  const result = await evaluate(
    passkeys.map((passkey) => ({
      id: fromBase64Url(passkey.credentialId).buffer as ArrayBuffer,
      salt: fromBase64(passkey.prfSalt),
    })),
  );

  if (!result) {
    return null;
  }

  const used = passkeys.find((passkey) => passkey.credentialId === result.credentialId);

  if (!used) {
    return null;
  }

  const raw = await unwrap(used.wrappedKey, await wrappingKeyFrom(result.output));

  return raw ? keysFrom(raw) : null;
}
