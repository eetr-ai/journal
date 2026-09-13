-- The whole schema, re-applied wholesale rather than kept as a ledger of
-- migrations. Every statement here must stay idempotent.

-- One-time cleanup of the Auth.js adapter tables an early version of this file
-- created. Sessions are JWTs, nothing reads them, and migrate is the only thing
-- that reaches a volume built back then.
DROP TABLE IF EXISTS verification_token CASCADE;
DROP TABLE IF EXISTS accounts CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- One row per person, keyed by the subject the identity provider issued.
--
-- Everything the user chooses about themselves lives in `config` rather than in
-- columns: the set is still moving, and the BFF is what decides a value is
-- valid. Postgres only guarantees it is an object.
CREATE TABLE IF NOT EXISTS user_profile (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  oidc_subject text        NOT NULL UNIQUE,
  email        text        NOT NULL,
  name         text        NOT NULL,
  config       jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT user_profile_config_is_object CHECK (jsonb_typeof(config) = 'object')
);

-- The vault: what makes a person's private data unreadable to us.
--
-- Everything here is derived or wrapped in the browser. The server stores the
-- KDF parameters so a returning browser can repeat the derivation, a verifier so
-- a wrong password is a clean message rather than a decryption failure, and the
-- data key wrapped under a key it never sees. Nothing in this table is enough to
-- decrypt anything without the password.
--
-- The KDF parameters are columns rather than assumptions so they can be raised
-- later without stranding vaults created under the old ones.
CREATE TABLE IF NOT EXISTS user_vault (
  oidc_subject    text        PRIMARY KEY REFERENCES user_profile(oidc_subject) ON DELETE CASCADE,
  kdf             text        NOT NULL DEFAULT 'argon2id',
  kdf_salt        text        NOT NULL,
  kdf_memory_kib  integer     NOT NULL,
  kdf_iterations  integer     NOT NULL,
  kdf_parallelism integer     NOT NULL,
  verifier        text        NOT NULL,
  wrapped_key     text        NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- One row per passkey a person has enrolled for quick unlock.
--
-- The passkey is not an authentication factor here — the identity provider
-- already settled who this is. It is a place to keep a secret the browser cannot
-- read: the authenticator's PRF output for `prf_salt` unwraps `wrapped_key`, and
-- that output never leaves the authenticator.
CREATE TABLE IF NOT EXISTS user_vault_passkey (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  oidc_subject  text        NOT NULL REFERENCES user_vault(oidc_subject) ON DELETE CASCADE,
  credential_id text        NOT NULL,
  prf_salt      text        NOT NULL,
  wrapped_key   text        NOT NULL,
  label         text        NOT NULL DEFAULT '',
  created_at    timestamptz NOT NULL DEFAULT now(),

  UNIQUE (oidc_subject, credential_id)
);
