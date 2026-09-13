-- The schema. Every statement is idempotent: this file is re-applied wholesale
-- rather than kept as a ledger of migrations, which holds while the schema is
-- small enough to read in one sitting.
--
-- Everything below is the Auth.js Postgres adapter's required schema. Nothing
-- here is application data; the journal's own tables get added as we build them.

-- The table names and the quoted camelCase columns are fixed by the adapter.
-- Renaming anything here breaks sign-in silently.

CREATE TABLE IF NOT EXISTS users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name          TEXT,
    email         TEXT UNIQUE,
    "emailVerified" TIMESTAMPTZ,
    image         TEXT
);

CREATE TABLE IF NOT EXISTS accounts (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId"            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type                TEXT NOT NULL,
    provider            TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    refresh_token       TEXT,
    access_token        TEXT,
    expires_at          BIGINT,
    id_token            TEXT,
    scope               TEXT,
    session_state       TEXT,
    token_type          TEXT
);

-- (provider, providerAccountId) must be unique: it is the key sign-in resolves
-- an existing account by.
CREATE UNIQUE INDEX IF NOT EXISTS accounts_provider_account_idx
    ON accounts (provider, "providerAccountId");

CREATE TABLE IF NOT EXISTS sessions (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId"       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires        TIMESTAMPTZ NOT NULL,
    "sessionToken" TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS verification_token (
    identifier TEXT NOT NULL,
    token      TEXT NOT NULL,
    expires    TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (identifier, token)
);
