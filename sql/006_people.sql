-- The people in a person's life: who someone is to them, their birthday, and
-- the things worth knowing about them.
--
-- Re-applied wholesale like the files before it; every statement here stays
-- idempotent.
--
-- Every text column is sealed in the same envelope as an entry, under the same
-- key: `enc1:` followed by base64 of nonce ‖ ciphertext, AES-256-GCM. That
-- includes the birthday, so nothing about a person is readable here — not even
-- which day to wish them well on.
--
-- A birthday, once opened, is `YYYY-MM-DD`, or `MM-DD` when the year is not
-- known, or empty when the day is not known either.
--
-- Proximity, once opened, is how close someone is to the person, "1" to "5":
-- 5 is the innermost circle, 1 someone distant. Empty is not known yet, which
-- is what every row written before there was a proximity reads as.
--
-- The trade we accepted: nothing can be looked up by value, so every lookup
-- opens all of a person's rows in the flow — a circle is tens to hundreds of
-- rows, not thousands. And there is no embedding of anyone, on purpose: a
-- person is found by name, not by meaning.

CREATE TABLE IF NOT EXISTS person (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  oidc_subject text        NOT NULL REFERENCES user_profile(oidc_subject) ON DELETE CASCADE,
  name         text        NOT NULL DEFAULT '',
  -- Who they are to the person, in the person's words: "my sister".
  relation     text        NOT NULL DEFAULT '',
  birthday     text        NOT NULL DEFAULT '',
  -- Free context, kept by hand or by the agent.
  notes        text        NOT NULL DEFAULT '',
  proximity    text        NOT NULL DEFAULT '',
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- Added rather than assumed: this file is re-applied over databases built
-- before the column existed, where CREATE TABLE IF NOT EXISTS is a no-op.
ALTER TABLE person ADD COLUMN IF NOT EXISTS proximity text NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS person_by_subject
  ON person (oidc_subject, created_at);

-- One thing worth knowing about someone, a row each so one can be forgotten
-- without rewriting the rest.
CREATE TABLE IF NOT EXISTS person_fact (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id    uuid        NOT NULL REFERENCES person(id) ON DELETE CASCADE,
  -- Repeated from the person so every read is scoped by subject without a join.
  oidc_subject text        NOT NULL REFERENCES user_profile(oidc_subject) ON DELETE CASCADE,
  fact         text        NOT NULL DEFAULT '',
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS person_fact_by_person
  ON person_fact (oidc_subject, person_id, created_at);
