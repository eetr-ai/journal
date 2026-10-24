-- An icon for an entry, one emoji the way a page in a notebook app has one.
--
-- Re-applied wholesale like the files before it; every statement here stays
-- idempotent.
--
-- Sealed like the title it stands beside, under the same key: which face a day
-- was given says something about the day. Empty is no icon, which is what every
-- row written before there was one reads as.

ALTER TABLE journal_entry ADD COLUMN IF NOT EXISTS icon text NOT NULL DEFAULT '';
