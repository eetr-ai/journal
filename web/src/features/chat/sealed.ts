"use client";

import { fromBase64 } from "@/features/vault/encoding";

/**
 * Opening what the sidecar sealed.
 *
 * A conversation is written by the agent runtime, under a key the browser
 * derived and forwarded with the run. Reading one back therefore happens here
 * and nowhere else: the server holds ciphertext and has nothing to open it
 * with, which is the point.
 *
 * The format is the sidecar's: a marker, then base64 of nonce ‖ ciphertext,
 * AES-256-GCM with a 12-byte nonce. A value without the marker was written
 * before there was a key and is already words.
 */

const MARKER = "enc1:";
const NONCE_BYTES = 12;

export function isSealed(value: string): boolean {
  return value.startsWith(MARKER);
}

let imported: { raw: string; key: CryptoKey } | null = null;

// One import per key rather than one per value: a transcript is a few dozen
// values and importKey is not free.
async function keyFor(agentKey: string): Promise<CryptoKey> {
  if (imported?.raw !== agentKey) {
    imported = {
      raw: agentKey,
      key: await crypto.subtle.importKey("raw", fromBase64(agentKey), "AES-GCM", false, [
        "decrypt",
      ]),
    };
  }

  return imported.key;
}

/** The words, or null when this key does not open it. */
export async function openSealed(value: string, agentKey: string): Promise<string | null> {
  if (!isSealed(value)) {
    return value;
  }

  try {
    const packed = fromBase64(value.slice(MARKER.length));

    const opened = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: packed.slice(0, NONCE_BYTES) },
      await keyFor(agentKey),
      packed.slice(NONCE_BYTES),
    );

    return new TextDecoder().decode(opened);
  } catch {
    return null;
  }
}

/** Every value opened, in order, with a stand-in for the ones that would not. */
export async function openEach(
  values: string[],
  agentKey: string,
  unreadable: string,
): Promise<string[]> {
  return Promise.all(
    values.map(async (value) => (await openSealed(value, agentKey)) ?? unreadable),
  );
}
