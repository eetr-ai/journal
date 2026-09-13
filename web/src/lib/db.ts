import { Pool } from "pg";

// One pool per process, parked on globalThis. A module-level pool would be
// rebuilt on every dev reload and leak connections until Postgres refuses more.
declare global {
  var journalPool: Pool | undefined;
}

// Reads DATABASE_URL and returns the shared pool, building it on first call.
export function pool(): Pool {
  if (globalThis.journalPool) {
    return globalThis.journalPool;
  }

  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Copy .env.example to .env at the repo root.");
  }

  const ret = new Pool({ connectionString });

  globalThis.journalPool = ret;

  return ret;
}
