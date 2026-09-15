-- The journal itself: what the agent writes down while a person talks.
--
-- Re-applied wholesale like 001 and 002; every statement here stays idempotent.
--
-- `title` and `content` hold what a person said and they hold it sealed, in the
-- same envelope as everything else: `enc1:` followed by base64 of nonce ‖
-- ciphertext under AES-256-GCM. The key is the one the run was handed and is
-- kept nowhere. They stay text rather than becoming a sealed type for the same
-- reason the agent's tables do: a value written before there was a key still has
-- to read, and the marker is what says which of the two it is.
--
-- Sealing stops at the text. `entry_date` is a plain date because every query in
-- this feature is by one — a day, a range, this day a year ago — and 002 already
-- concedes the same trade: when a person wrote is not hidden, only what.

CREATE TABLE IF NOT EXISTS journal_entry (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  oidc_subject text        NOT NULL REFERENCES user_profile(oidc_subject) ON DELETE CASCADE,
  -- The conversation it was written in, so an entry can lead back to the talk
  -- that produced it. Deliberately not a foreign key: agent_thread is the
  -- agent's to erase, and an entry outlives the conversation behind it.
  thread_key   text        NOT NULL DEFAULT '',
  entry_date   date        NOT NULL,
  title        text        NOT NULL DEFAULT '',
  content      text        NOT NULL DEFAULT '',
  -- Taken from the plaintext before it was sealed, and not sealed itself — the
  -- same concession agent_turn.embedding already makes. A vector is not the
  -- text, but it is derived from it; this is the cost of finding an entry by
  -- what it was about.
  embedding    vector(1024),
  embedded_at  timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- One running note per conversation, guaranteed here rather than hoped for in a
-- prompt: the agent rewrites the same row as the talk goes on, and the upsert
-- that does it needs something to conflict on. Partial, because rows with no
-- conversation behind them must not collide with each other.
CREATE UNIQUE INDEX IF NOT EXISTS journal_entry_per_conversation
  ON journal_entry (oidc_subject, thread_key) WHERE thread_key <> '';

-- The drawer's query, and every lookup by day or range.
CREATE INDEX IF NOT EXISTS journal_entry_by_day
  ON journal_entry (oidc_subject, entry_date DESC, created_at DESC);

-- Cosine, 1024 dimensions, matching the agent's tables: the embeddings are
-- normalised and the question is always "closest in meaning".
CREATE INDEX IF NOT EXISTS journal_entry_by_meaning
  ON journal_entry USING hnsw (embedding vector_cosine_ops);
