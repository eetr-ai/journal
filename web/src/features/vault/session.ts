"use client";

/**
 * Where an unlocked vault's keys live between page loads.
 *
 * IndexedDB rather than a cookie: a cookie is sent to the server on every
 * request, which is the one place the data key must never go. What is stored
 * for it is a non-extractable CryptoKey, so script on the page can use it to
 * decrypt and still cannot read its bytes back out to send anywhere. The agent
 * key beside it is readable on purpose — it is derived for sending, and it
 * opens conversations and nothing else.
 *
 * It is cleared on lock, on sign-out, and once it has gone unused for long
 * enough: a key that outlives the sitting it was wanted for is a journal left
 * open on a table. The deadline is stored beside the key and checked where it
 * is read, so there is one place that decides whether a key is still good.
 *
 * The stamp is only as honest as the browser holding it. What that buys is a
 * device walked away from, not one in someone else's hands.
 *
 * A cookie alongside it says only *that* the vault is open, never anything that
 * could open it. The server reads that to decide whether to show the journal or
 * the unlock screen, so the page does not render and then hide itself.
 */

import type { VaultKeys } from "./crypto";

const DB_NAME = "eetr-journal";
const DB_VERSION = 1;
const STORE = "vault-keys";

/** How long a vault stays open with nothing happening in it. */
export const IDLE_LOCK_MS = 900_000;

/** The key as it is stored: the domain value plus when it stops being usable. */
interface VaultKeysEntity extends VaultKeys {
  expiresAt: number;
}

function entityFor(keys: VaultKeys): VaultKeysEntity {
  return { dataKey: keys.dataKey, agentKey: keys.agentKey, expiresAt: Date.now() + IDLE_LOCK_MS };
}

function settled<T>(request: IDBRequest<T>): Promise<T | null> {
  return new Promise((resolve) => {
    request.addEventListener("success", () => resolve(request.result ?? null));
    request.addEventListener("error", () => resolve(null));
  });
}

function open(): Promise<IDBDatabase | null> {
  const request = indexedDB.open(DB_NAME, DB_VERSION);

  request.addEventListener("upgradeneeded", () => request.result.createObjectStore(STORE));

  return settled(request);
}

async function read<T>(work: (store: IDBObjectStore) => IDBRequest<T>): Promise<T | null> {
  try {
    const database = await open();

    if (!database) {
      return null;
    }

    return await settled(work(database.transaction(STORE, "readonly").objectStore(STORE)));
  } catch {
    // Private windows and storage-blocking settings both land here. Losing the
    // cached key means unlocking again, not losing anything.
    return null;
  }
}

/** Resolves on the transaction, not on the request: a request can succeed and
 *  the transaction still abort, which would leave nothing written down. */
function committed(transaction: IDBTransaction): Promise<boolean> {
  return new Promise((resolve) => {
    transaction.addEventListener("complete", () => resolve(true));
    transaction.addEventListener("abort", () => resolve(false));
    transaction.addEventListener("error", () => resolve(false));
  });
}

async function write(work: (store: IDBObjectStore) => IDBRequest): Promise<boolean> {
  try {
    const database = await open();

    if (!database) {
      return false;
    }

    const transaction = database.transaction(STORE, "readwrite");

    work(transaction.objectStore(STORE));

    return await committed(transaction);
  } catch {
    return false;
  }
}

/** Set and cleared only alongside the key, so the two cannot disagree. */
export const UNLOCKED_COOKIE = "vault-unlocked";

const MS_PER_SECOND = 1000;

// Given the same life as the key it stands for, so the server stops rendering a
// journal at about the moment the browser stops being able to open one. A tab
// that closes first takes it with it either way.
function setMarker(present: boolean) {
  const seconds = Math.floor(IDLE_LOCK_MS / MS_PER_SECOND);

  document.cookie = present
    ? `${UNLOCKED_COOKIE}=1; path=/; max-age=${seconds}; samesite=lax`
    : `${UNLOCKED_COOKIE}=; path=/; max-age=0; samesite=lax`;
}

/** False when this browser will not keep the keys — the marker is left unset so
 *  the server does not render a journal the next page load cannot open. */
export async function rememberKey(subject: string, keys: VaultKeys): Promise<boolean> {
  const stored = await write((store) => store.put(entityFor(keys), subject));

  setMarker(stored);

  return stored;
}

export async function recallKey(subject: string): Promise<VaultKeys | null> {
  const value = await read<VaultKeysEntity>((store) => store.get(subject));

  // A record written by an older version of this file holds a bare CryptoKey,
  // or no deadline. Unusable rather than half-usable: locking again is one
  // password, and a conversation sealed under nothing is forever.
  const usable =
    value?.dataKey instanceof CryptoKey &&
    typeof value.agentKey === "string" &&
    typeof value.expiresAt === "number";

  if (!usable) {
    return null;
  }

  // The one place a key is handed out, which is why it is the one place the
  // deadline is checked.
  if (Date.now() >= value.expiresAt) {
    await forgetKey(subject);

    return null;
  }

  return value;
}

/**
 * Pushes the deadline out, for something the person did. Returns false when
 * there was no key to push, which is the caller's cue that the vault is shut.
 */
export async function touchKey(subject: string): Promise<boolean> {
  const keys = await recallKey(subject);

  if (!keys) {
    return false;
  }

  const stored = await write((store) => store.put(entityFor(keys), subject));

  setMarker(stored);

  return stored;
}

// Locking clears the marker whether or not the delete went through: a browser
// that cannot store the key has none to hand back anyway.
export async function forgetKey(subject: string): Promise<void> {
  await write((store) => store.delete(subject));
  setMarker(false);
}

/** Everything, for sign-out: whoever signs in next is not this person. */
export async function forgetEveryKey(): Promise<void> {
  await write((store) => store.clear());
  setMarker(false);
}
