-- What the agent remembers, and the platform state octo keeps behind its
-- platform API. Re-applied wholesale like 001; every statement is idempotent.
--
-- THESE COLUMNS ARE PLAINTEXT ON PURPOSE, AND TEMPORARILY.
-- A conversation says as much about a person as an entry does, so it belongs
-- under the same encryption everything else is under. It is not, because octo
-- writes agent memory on its own behalf and no block in a flow ever sees it:
-- https://github.com/juancavallotti/octo/issues/504. When that closes, `title`,
-- `text` and `value` below become sealed bytes and this notice goes away.

CREATE EXTENSION IF NOT EXISTS vector;

-- octo's key/value store, and its secrets, which share the namespace.
--
-- Opaque bytes with an optimistic-concurrency version: a write states the
-- version it believes is current, 0 meaning "create", and loses if it is wrong.
CREATE TABLE IF NOT EXISTS platform_kv (
  namespace  text        NOT NULL,
  key        text        NOT NULL,
  value      bytea       NOT NULL,
  version    bigint      NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (namespace, key)
);

-- One conversation with the agent.
--
-- `working` is the engine's serialized context and stays bytes: its shape is
-- octo's, it changes when octo changes, and nothing here has any business
-- reading it. It is versioned like a kv entry; the turn record below is not,
-- because appends commute.
CREATE TABLE IF NOT EXISTS agent_thread (
  agent_id         text        NOT NULL,
  thread_key       text        NOT NULL,
  oidc_subject     text        NOT NULL DEFAULT '',
  title            text        NOT NULL DEFAULT '',
  version          bigint      NOT NULL DEFAULT 0,
  turn_count       integer     NOT NULL DEFAULT 0,
  working          bytea,
  working_version  bigint      NOT NULL DEFAULT 0,
  iteration        integer     NOT NULL DEFAULT 0,
  tokens           integer     NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now(),
  last_activity_at timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (agent_id, thread_key)
);

-- The drawer's query: this person's conversations, most recent first.
CREATE INDEX IF NOT EXISTS agent_thread_by_person
  ON agent_thread (oidc_subject, last_activity_at DESC);

-- The durable record a person reads when they open a past conversation.
--
-- Append-only and never compacted, which is the whole reason it is not the same
-- object as `working`: making room for the model must not destroy the record.
-- `seq` is assigned here, on append, because the append is the event.
CREATE TABLE IF NOT EXISTS agent_turn (
  agent_id   text        NOT NULL,
  thread_key text        NOT NULL,
  seq        bigint      NOT NULL,
  role       text        NOT NULL,
  content    text        NOT NULL DEFAULT '',
  tokens     integer     NOT NULL DEFAULT 0,
  attrs      bytea,
  embedding  vector(1024),
  -- When the backfill last considered this row, whether or not it came back
  -- with a vector. Without it a row the provider declines to embed is selected
  -- forever and starves everything behind it.
  embedded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (agent_id, thread_key, seq),
  FOREIGN KEY (agent_id, thread_key) REFERENCES agent_thread (agent_id, thread_key) ON DELETE CASCADE
);

-- One fact the agent chose to keep about a person, past the conversation it was
-- learned in. Curated through a tool, not a transcript dump.
CREATE TABLE IF NOT EXISTS agent_user_memory (
  agent_id     text        NOT NULL,
  oidc_subject text        NOT NULL,
  name         text        NOT NULL,
  value        text        NOT NULL,
  embedding    vector(1024),
  embedded_at  timestamptz,
  version      bigint      NOT NULL DEFAULT 1,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (agent_id, oidc_subject, name)
);

-- For databases created before the column existed. Re-applying this file has to
-- reach them too, which is the whole point of it being idempotent.
ALTER TABLE agent_turn        ADD COLUMN IF NOT EXISTS embedded_at timestamptz;
ALTER TABLE agent_user_memory ADD COLUMN IF NOT EXISTS embedded_at timestamptz;

-- The backfill's queue: what has text and has not been looked at yet.
CREATE INDEX IF NOT EXISTS agent_turn_pending_vectors
  ON agent_turn (created_at) WHERE embedded_at IS NULL;

CREATE INDEX IF NOT EXISTS agent_user_memory_pending_vectors
  ON agent_user_memory (updated_at) WHERE embedded_at IS NULL;

-- Cosine, because the embeddings are normalised and the question is always
-- "closest in meaning". 1024 dimensions is a deliberate truncation of a
-- 4096-wide model: pgvector indexes nothing past 2000.
CREATE INDEX IF NOT EXISTS agent_turn_by_meaning
  ON agent_turn USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS agent_user_memory_by_meaning
  ON agent_user_memory USING hnsw (embedding vector_cosine_ops);
