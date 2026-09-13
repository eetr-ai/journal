/** Byte/text conversions shared by the crypto and passkey modules. */

/**
 * Bytes backed by a plain ArrayBuffer.
 *
 * Spelled out because WebCrypto's BufferSource excludes a SharedArrayBuffer
 * view, and a bare Uint8Array could be one.
 */
export type Bytes = Uint8Array<ArrayBuffer>;

export function toBase64(bytes: Bytes): string {
  return btoa(String.fromCharCode(...bytes));
}

export function fromBase64(value: string): Bytes {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}

// Base64 is written in groups of four characters.
const BASE64_GROUP = 4;

/** WebAuthn spells credential ids base64url, without padding. */
export function toBase64Url(bytes: Bytes): string {
  return toBase64(bytes).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

export function fromBase64Url(value: string): Bytes {
  const padding = (BASE64_GROUP - (value.length % BASE64_GROUP)) % BASE64_GROUP;

  return fromBase64(value.replaceAll("-", "+").replaceAll("_", "/") + "=".repeat(padding));
}

/** A plain, ArrayBuffer-backed copy of whatever a platform API handed back. */
export function toBytes(source: BufferSource): Bytes {
  return source instanceof ArrayBuffer
    ? new Uint8Array(source.slice(0))
    : new Uint8Array(source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength));
}

export function randomBytes(length: number): Bytes {
  return crypto.getRandomValues(new Uint8Array(length));
}

/**
 * Compares without an early exit, so how long it takes says nothing about how
 * much of the value matched.
 */
export function equalBytes(left: Bytes, right: Bytes): boolean {
  if (left.length !== right.length) {
    return false;
  }

  let difference = 0;

  for (const [index, byte] of left.entries()) {
    difference |= byte ^ right[index];
  }

  return difference === 0;
}
