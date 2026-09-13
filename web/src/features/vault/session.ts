"use client";

/**
 * Where an unlocked data key lives between page loads.
 *
 * IndexedDB rather than a cookie: a cookie is sent to the server on every
 * request, which is the one place this key must never go. What is stored is a
 * non-extractable CryptoKey, so script on the page can use it to decrypt and
 * still cannot read its bytes back out to send anywhere.
 *
 * It is cleared on lock and on sign-out.
 *
 * A cookie alongside it says only *that* the vault is open, never anything that
 * could open it. The server reads that to decide whether to show the journal or
 * the unlock screen, so the page does not render and then hide itself.
 */

const DB_NAME = "eetr-journal";
const DB_VERSION = 1;
const STORE = "vault-keys";

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

// The session outlives a tab; the marker should not outlive the session.
function setMarker(present: boolean) {
  document.cookie = present
    ? `${UNLOCKED_COOKIE}=1; path=/; samesite=lax`
    : `${UNLOCKED_COOKIE}=; path=/; max-age=0; samesite=lax`;
}

/** False when this browser will not keep the key — the marker is left unset so
 *  the server does not render a journal the next page load cannot open. */
export async function rememberKey(subject: string, key: CryptoKey): Promise<boolean> {
  const stored = await write((store) => store.put(key, subject));

  setMarker(stored);

  return stored;
}

export async function recallKey(subject: string): Promise<CryptoKey | null> {
  const value = await read<CryptoKey>((store) => store.get(subject));

  return value instanceof CryptoKey ? value : null;
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
