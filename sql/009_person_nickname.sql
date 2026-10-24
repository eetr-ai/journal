-- What a person is commonly called, beside the full name in `name`: "Cami" for
-- Camila Pérez. It is what tells two people with the same name apart.
--
-- Re-applied wholesale like the files before it; every statement here stays
-- idempotent.
--
-- Sealed like every other field of a person, under the same key. Empty is not
-- known, which is what every row written before there was one reads as.

ALTER TABLE person ADD COLUMN IF NOT EXISTS nickname text NOT NULL DEFAULT '';
