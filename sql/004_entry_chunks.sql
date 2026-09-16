-- What an entry was about, a paragraph at a time.
--
-- Re-applied wholesale like the files before it; every statement here stays
-- idempotent, including the backfill.
--
-- One vector per entry was one vector for a whole day, and a day is usually
-- several things: the climb, the argument, the thing they are dreading on
-- Tuesday. Averaged together they match every question weakly and none of them
-- well. A chunk is small enough to be about one thing, so the search can rank
-- the paragraph and hand back the day it belongs to.
--
-- `content` is sealed in the same envelope as the entry it came from, under the
-- same key: a chunk is the person's words, and holding them in the clear here
-- would undo the table next door. The vector beside it is derived from those
-- words and is not sealed, which is the same concession journal_entry made when
-- it held one.

CREATE TABLE IF NOT EXISTS journal_entry_chunk (
  entry_id    uuid        NOT NULL REFERENCES journal_entry(id) ON DELETE CASCADE,
  -- Its place in the entry, from zero. The pair is the key because chunks are
  -- rewritten wholesale with the note they came from, never addressed on their
  -- own.
  ordinal     int         NOT NULL,
  content     text        NOT NULL,
  embedding   vector(1024),
  embedded_at timestamptz,
  PRIMARY KEY (entry_id, ordinal)
);

-- Cosine, 1024 dimensions, matching every other vector in this database.
CREATE INDEX IF NOT EXISTS journal_entry_chunk_by_meaning
  ON journal_entry_chunk USING hnsw (embedding vector_cosine_ops);

-- Everything written before there were chunks becomes one chunk, which is what
-- it always was. Guarded on the old column rather than on the table being empty:
-- this file is re-applied, and the second run must find nothing to do rather
-- than fail on a column that is gone.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'journal_entry' AND column_name = 'embedding'
  ) THEN
    EXECUTE $backfill$
      INSERT INTO journal_entry_chunk (entry_id, ordinal, content, embedding, embedded_at)
      SELECT id, 0, content, embedding, embedded_at
      FROM journal_entry
      WHERE embedding IS NOT NULL
      ON CONFLICT (entry_id, ordinal) DO NOTHING
    $backfill$;
  END IF;
END
$$;

DROP INDEX IF EXISTS journal_entry_by_meaning;
ALTER TABLE journal_entry DROP COLUMN IF EXISTS embedding;
ALTER TABLE journal_entry DROP COLUMN IF EXISTS embedded_at;
