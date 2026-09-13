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

async function run<T>(
  mode: IDBTransactionMode,
  work: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T | null> {
  try {
    const database = await open();

    if (!database) {
      return null;
    }

    return await settled(work(database.transaction(STORE, mode).objectStore(STORE)));
  } catch {
    // Private windows and storage-blocking settings both land here. Losing the
    // cached key means unlocking again, not losing anything.
    return null;
  }
}

export async function rememberKey(subject: string, key: CryptoKey): Promise<void> {
  await run("readwrite", (store) => store.put(key, subject));
}

export async function recallKey(subject: string): Promise<CryptoKey | null> {
  const value = await run<CryptoKey>("readonly", (store) => store.get(subject));

  return value instanceof CryptoKey ? value : null;
}

export async function forgetKey(subject: string): Promise<void> {
  await run("readwrite", (store) => store.delete(subject));
}

/** Everything, for sign-out: whoever signs in next is not this person. */
export async function forgetEveryKey(): Promise<void> {
  await run("readwrite", (store) => store.clear());
}
