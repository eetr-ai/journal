-- Pictures kept with an entry.
--
-- Re-applied wholesale like the files before it; every statement here stays
-- idempotent.
--
-- `data` and `caption` are sealed in the same envelope as the entry, under the
-- same key. The image is sealed as its base64 text rather than its bytes, so it
-- opens the same way a title does; that costs roughly 1.8x the raw size, which
-- for now we accept. `mime_type` is in the clear: it is what a reader needs to
-- show the picture, and it says nothing about what is in it.

CREATE TABLE IF NOT EXISTS journal_entry_image (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id     uuid        NOT NULL REFERENCES journal_entry(id) ON DELETE CASCADE,
  -- Repeated from the entry so every read is scoped by subject without a join.
  oidc_subject text        NOT NULL REFERENCES user_profile(oidc_subject) ON DELETE CASCADE,
  -- Its place in the entry, from zero, in the order it was kept.
  ordinal      int         NOT NULL,
  mime_type    text        NOT NULL,
  caption      text        NOT NULL DEFAULT '',
  data         text        NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (entry_id, ordinal)
);

CREATE INDEX IF NOT EXISTS journal_entry_image_by_entry
  ON journal_entry_image (oidc_subject, entry_id, ordinal);
