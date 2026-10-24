-- What a person has told us about themselves that is theirs rather than a
-- setting: their birthday, for now.
--
-- Re-applied wholesale like the files before it; every statement here stays
-- idempotent.
--
-- One sealed JSON object rather than a column per fact, in the same envelope as
-- everything else: `enc1:` followed by base64 of nonce ‖ ciphertext under
-- AES-256-GCM, over the object's JSON text. A new fact is a new key inside it,
-- not a migration, and the row does not say which facts are known. Empty is
-- nothing told yet.
--
-- Kept apart from `config` on purpose: config is written whole by requests that
-- carry no key, and a fact must survive them.

ALTER TABLE user_profile ADD COLUMN IF NOT EXISTS facts text NOT NULL DEFAULT '';
