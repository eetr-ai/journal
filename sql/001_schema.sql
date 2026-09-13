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
