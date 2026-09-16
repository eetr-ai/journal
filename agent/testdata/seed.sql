-- Fixture rows for the flow suites. Applied by `task test` before dolphin runs,
-- against the same database sql/ built.
--
-- Idempotent, and confined to subjects prefixed `dolphin-`, so it never collides
-- with a real profile in a developer's local database.

INSERT INTO user_profile (oidc_subject, email, name, config)
VALUES
  ('dolphin-seeded',       'seeded@example.com',  'Seeded Profile', '{"theme": "dark", "language": "es"}'::jsonb),
  ('dolphin-vault-read',   'vault-r@example.com', 'Vault Read',     '{}'::jsonb),
  ('dolphin-vault-write',  'vault-w@example.com', 'Vault Write',    '{}'::jsonb),
  ('dolphin-vault-keys',   'vault-k@example.com', 'Vault Keys',     '{}'::jsonb),
  ('dolphin-vault-absent', 'vault-a@example.com', 'Vault Absent',   '{}'::jsonb)
ON CONFLICT (oidc_subject) DO UPDATE SET
  email = EXCLUDED.email,
  name = EXCLUDED.name,
  config = EXCLUDED.config;

-- Vaults to read back. The values are not real key material; nothing in this
-- table ever is anything but opaque bytes to the server.
--
-- `dolphin-vault-read` is only ever read, and `dolphin-vault-keys` is only ever
-- written: the suites run concurrently, so one suite's writes must never be in
-- another's reads.
INSERT INTO user_vault (
  oidc_subject, kdf, kdf_salt, kdf_memory_kib, kdf_iterations, kdf_parallelism,
  verifier, wrapped_key
)
VALUES
  ('dolphin-vault-read', 'argon2id', 'c2VlZGVkLXNhbHQ=', 65536, 3, 1, 'c2VlZGVkLXZlcmlmaWVy', 'c2VlZGVkLXdyYXA='),
  ('dolphin-vault-keys', 'argon2id', 'a2V5cy1zYWx0', 65536, 3, 1, 'a2V5cy12ZXJpZmllcg==', 'a2V5cy13cmFw')
ON CONFLICT (oidc_subject) DO UPDATE SET
  kdf_salt = EXCLUDED.kdf_salt,
  verifier = EXCLUDED.verifier,
  wrapped_key = EXCLUDED.wrapped_key;

-- The fixture is the whole truth about these subjects, not an addition to it: a
-- case that enrols a passkey would otherwise leave it behind for the next run,
-- and a suite that counts them would fail on the second run and pass on the
-- first.
DELETE FROM user_vault_passkey
WHERE oidc_subject LIKE 'dolphin-%' AND credential_id <> 'dolphin-credential';

INSERT INTO user_vault_passkey (oidc_subject, credential_id, prf_salt, wrapped_key, label)
VALUES
  ('dolphin-vault-read', 'dolphin-credential', 'cHJmLXNhbHQ=', 'cGFzc2tleS13cmFw', 'Seeded Laptop'),
  ('dolphin-vault-keys', 'dolphin-credential', 'cHJmLXNhbHQ=', 'cGFzc2tleS13cmFw', 'Seeded Laptop')
ON CONFLICT (oidc_subject, credential_id) DO UPDATE SET
  prf_salt = EXCLUDED.prf_salt,
  wrapped_key = EXCLUDED.wrapped_key,
  label = EXCLUDED.label;

-- Conversations, for the read-side suites. The agent writes these through the
-- platform sidecar; the flows only read them back, so a fixture is enough.
--
-- Like the passkeys above, the fixture is the whole truth about these subjects:
-- a case that deletes a conversation would otherwise leave the next run with
-- nothing to delete.
DELETE FROM agent_thread WHERE oidc_subject LIKE 'dolphin-%';

INSERT INTO agent_thread (agent_id, thread_key, oidc_subject, title, turn_count, last_activity_at)
VALUES
  ('journal', 'dolphin-chat-read',   'dolphin-chats', 'The release slipped again', 2, now()),
  ('journal', 'dolphin-chat-older',  'dolphin-chats', 'Reading list for the winter', 0, now() - interval '1 day'),
  ('journal', 'dolphin-chat-delete', 'dolphin-chats-delete', 'One to forget', 1, now()),
  ('journal', 'dolphin-chat-other',  'dolphin-chats-other', 'Somebody else entirely', 1, now());

INSERT INTO agent_turn (agent_id, thread_key, seq, role, content)
VALUES
  ('journal', 'dolphin-chat-read',   1, 'user',      'It slipped again.'),
  ('journal', 'dolphin-chat-read',   2, 'assistant', 'That is the second time this month.'),
  ('journal', 'dolphin-chat-delete', 1, 'user',      'Forget this one.'),
  ('journal', 'dolphin-chat-other',  1, 'user',      'Not yours to read.');

-- Journal entries, for the entries suites. Written by the agent's tools in
-- life; a fixture is enough for everything that only reads them.
--
-- The titles and contents are really sealed, under the throwaway key the suites
-- pass as `dataKey` — so a case that reads one back is exercising the opening
-- and not a string that happens to look like ciphertext. That key is fixture
-- material and decrypts nothing else: ZG9scGhpbi1lbnRyaWVzLWZpeHR1cmUta2V5LTMyYiE=
--
-- Dates are absolute rather than relative to now(), and the suites pass the same
-- absolute day as `today`, so "a year ago" means the same thing on every run.
--
-- The fixture is the whole truth about these subjects: the write cases upsert,
-- and a row left behind would make the second run of a suite differ from the
-- first.
INSERT INTO user_profile (oidc_subject, email, name, config)
VALUES
  ('dolphin-entries',       'entries@example.com',   'Entries Read',  '{}'::jsonb),
  ('dolphin-entries-write', 'entries-w@example.com', 'Entries Write', '{}'::jsonb),
  ('dolphin-entries-other', 'entries-o@example.com', 'Entries Other', '{}'::jsonb),
  ('dolphin-entries-delete', 'entries-d@example.com', 'Entries Delete', '{}'::jsonb)
ON CONFLICT (oidc_subject) DO UPDATE SET
  email = EXCLUDED.email,
  name = EXCLUDED.name;

DELETE FROM journal_entry WHERE oidc_subject LIKE 'dolphin-%';

INSERT INTO journal_entry (id, oidc_subject, thread_key, entry_date, title, content)
VALUES
  (UUID 'aaaaaaaa-0000-4000-8000-000000000001', 'dolphin-entries', 'dolphin-entry-a', DATE '2026-09-15',
   'enc1:z5hBzLJnKYan2OdNqQisetEsG8NyiUyIVhlj0mVWKWGfNEU09jCUYfO5maXhp6Mt',
   'enc1:yBNj2Eq7hcwv69yW+Ftq/xrJGrOqYzq+5t9Njg+WJJs++amK6JQxFCORMCPbpHlhOpVzzXETuJfB8gvIiHc='),
  (UUID 'aaaaaaaa-0000-4000-8000-000000000002', 'dolphin-entries', 'dolphin-entry-b', DATE '2026-09-14',
   'enc1:vhpAVIEeWQNQq9kApZttZ6955aeK5npErRdCDTc2dlZTLAfTtEyuQDpeT1S0dw==',
   'enc1:gvO7DE5ihpEA2JSqHk/isNTzWQTQwwmsjbOi0h2mZDv9k1ioO1Yz5hyK8pfo8T6yZfU0yjarWDpmwKXCTCb5RNrEaKbLeFez'),
  (UUID 'aaaaaaaa-0000-4000-8000-000000000003', 'dolphin-entries', 'dolphin-entry-c', DATE '2026-09-10',
   'enc1:dWtTkFFX/gqp4Hr9zPWIwzssI+h9WeWMAYiDdla9kHCsVFVZ9sh40HEjH8JTJS0Tl5k=',
   'enc1:m3zfrRqu6iZimhP5ymutmG57boMfxXlSbMzn/iGjXlUx654GBYwy4O/7DopBE+1Lg8w9pg=='),
  (UUID 'aaaaaaaa-0000-4000-8000-000000000004', 'dolphin-entries', 'dolphin-entry-d', DATE '2025-09-12',
   'enc1:cjuSjEvmOzaADWLZYVS6dGR+7+LUVnaAm2HAVLnkId/TOi4j5zewEwrbAg==',
   'enc1:TsiNJBtDCkbkHL9ubcmz6haVAccjhHtNnLOx/qiM7CTYg2i5ExqHkSiJfkUw3VBE7bA2lTsw/G1cdw=='),
  (UUID 'aaaaaaaa-0000-4000-8000-000000000005', 'dolphin-entries', 'dolphin-entry-e', DATE '2026-03-20',
   'enc1:RzDGM+n8Z9lK6ycdq671+TN/dCD5svDo/NBFejo2osahdhCacdiQ0XJljw==',
   'enc1:1b3wGG7Y95sGRoagJjejXbw0Ka2ub5IvbVZMVFOguGlEmNqR97xoGWEzzskfNNXb5xaCmhMFT2DgU70CnSazaIs+cw=='),
  (UUID 'cccccccc-0000-4000-8000-000000000001', 'dolphin-entries-write', 'dolphin-write-once', DATE '2026-09-15',
   'enc1:AHFQqW1YtRXJVZr6z6Hv7WbxBcPPuje57RGd/82w1yYzcXPslF5FSFEE',
   'enc1:FG6N152Xxxow4lIe7AWooA0Akbvwr1zt79QH93E/8pBby7u+NsYrcNro/4rUpVflTg=='),
  -- Three chunks already, so the suite's one embedded write has a tail to trim.
  (UUID 'cccccccc-0000-4000-8000-000000000003', 'dolphin-entries-write', 'dolphin-write-embedded', DATE '2026-09-15',
   'enc1:O5/5ZaL3W736KRS0ZHGo9eHxjJtagXqu7V5wreWVfCYK+0oDN2I/z7uWNrFpB+5pycQ=',
   'enc1:xrX0xYIu8pYasJIIX9Lu2+jMljbC4QxUe6h7aN7xPdwd+ey7gS7cMVC/8AXQJA=='),
  -- Started by the reader rather than by a conversation, so thread_key is
  -- empty: the write suite addresses it the way the browser does, by id.
  (UUID 'cccccccc-0000-4000-8000-000000000002', 'dolphin-entries-write', '', DATE '2026-09-15',
   'enc1:6QATtVDq+9llXNOyUiumSSpGxYaPM+mmCV2gLtfPt1vYH3QLGJz0796NWFWZ8wogew==',
   'enc1:nttfj/CLX4oyoqtjj1b29iNa6b5Aqf2bDXu0h6kaNVY8bDM46XmWCHreH+LoBOQLrRfIBX12pedqTa70'),
  (UUID 'bbbbbbbb-0000-4000-8000-000000000001', 'dolphin-entries-other', 'dolphin-entry-x', DATE '2026-09-15',
   'enc1:t34nYLl8H7w3WVHbHcZcfldVPDUP8zVlXbEQC1CsNEWBFd3qVdzHdxkfI1jN',
   'enc1:3MNTiWhviwM9r193UiUAtDZ5eGVALs+hIasNC9leDv9lkYmd6diSCk4Fznvh5NJMxcwV'),
  -- Thrown away by its suite, and put back by the next run of this file. It
  -- carries a chunk so the delete has something to cascade to: a foreign key
  -- that stopped cascading would fail the statement rather than pass quietly.
  (UUID 'dddddddd-0000-4000-8000-000000000001', 'dolphin-entries-delete', '', DATE '2026-09-15',
   'enc1:pE/ePAhzHA/rFRGCykddcSgtm8kktxiqqSMme+l6vLFM9gSIoKEwFuDjkmKY',
   'enc1:ewCmPL+uIM1trx6uI80JuPcmosUMVBACFTl97PSLNNUld3cHAOh4g85e0egXXwA=');

-- Chunks, for the suites that rank by meaning.
--
-- `dolphin-entries-chunks` owns this fixture and nothing else writes there, so
-- the ranking below is the same on every run.
--
-- The vectors are built rather than written out. A 1024-dimension literal is a
-- wall nobody reads, and what these cases turn on is the angle between two of
-- them: everything here is either exactly on an axis or at a stated angle to
-- one, so the distances are arithmetic instead of accident.
CREATE OR REPLACE FUNCTION dolphin_vector(weights jsonb) RETURNS vector
LANGUAGE sql IMMUTABLE AS $$
  SELECT ('[' || string_agg(COALESCE(weights ->> i::text, '0'), ',' ORDER BY i) || ']')::vector
  FROM generate_series(0, 1023) AS i;
$$;

INSERT INTO user_profile (oidc_subject, email, name, config)
VALUES ('dolphin-entries-chunks', 'entries-c@example.com', 'Entries Chunks', '{}'::jsonb)
ON CONFLICT (oidc_subject) DO UPDATE SET email = EXCLUDED.email, name = EXCLUDED.name;

-- Chunks cascade, so the entries going takes them with it.
DELETE FROM journal_entry WHERE oidc_subject = 'dolphin-entries-chunks';

INSERT INTO journal_entry (id, oidc_subject, thread_key, entry_date, title, content)
VALUES
  -- A day with three parts to it. Only the middle one is what the question is
  -- about, which is the whole point: averaged with the other two it would lose
  -- to the quiet day below.
  (UUID 'aaaaaaaa-0000-4000-8000-000000000011', 'dolphin-entries-chunks', '', DATE '2026-01-07',
   'enc1:Zk6HUOZzSqfGKgPBuDA/ROURG34P7O7/y1Go7OvEp7uha094EXPTcCbykFvtu3M=',
   'enc1:rIaXip7T+0Q3t5lwCPDjbJP5IU9ZYtKa0gD8/dPWvylw+ZL7pG2Q+0U3cDX56IPLowWvQOEZ9lSsf4aAjkRABwJmuiq9Y31ihrNcJREh2bGdR+gc25Prh/15NMZh2kSb0RUYBiOT4wwIuXxDEeupRBZfXpwSvUXL8wNdJ9Yjbary78PMsCGAFI/QpVrjS1xiPv5wQ+8='),
  -- One part, middling-close to the question. It beats the day above on any
  -- rule that reads all of an entry's chunks at once, and loses on the one that
  -- takes its best.
  (UUID 'aaaaaaaa-0000-4000-8000-000000000012', 'dolphin-entries-chunks', '', DATE '2026-01-06',
   'enc1:VsTmMrgQ/hm2XBEFXBwy3MEQGR58jEz42WJBtw63SiYTg5BBnLGjag==',
   'enc1:kIBo07ZT5GB+L+rrMYSk3VeKTYGpqe2FjV5/fYQOinExXvtAJR5aYtUs');

-- The question these are ranked against is the first axis. So: chunk 1 of the
-- three-part day sits exactly on it (distance 0), its neighbours sit at right
-- angles to it (distance 1), and the quiet day sits at sixty degrees — √3 is
-- what puts it there — for a distance of one half.
INSERT INTO journal_entry_chunk (entry_id, ordinal, content, embedding, embedded_at)
VALUES
  (UUID 'aaaaaaaa-0000-4000-8000-000000000011', 0,
   'enc1:yHKlCUhLkE1skb7nchmTlsZglE5E6DXgGod5rCo6DhpYHaSfvt7/XsBqARu2lP0WJveIFE8PVT5kprA=',
   dolphin_vector('{"5": 1}'), now()),
  (UUID 'aaaaaaaa-0000-4000-8000-000000000011', 1,
   'enc1:syMlA/iicjzTGFroKuBwDkLqtCxXgf678r3mjAvI2NR+rv1E3buAFi5Ygsto2dLEawUhpj4J6ebHrmVCsGMXhTmw00srsN4W',
   dolphin_vector('{"0": 1}'), now()),
  (UUID 'aaaaaaaa-0000-4000-8000-000000000011', 2,
   'enc1:UGtsLxa3JSY8CD//tFagDqmEy6xNgmzjT+BYKi2Mj3780w5ATCPPS9Spta07ev1ynHv2iAXMPWdWrPTroICpF2f0DYEIAQ==',
   dolphin_vector('{"6": 1}'), now()),
  (UUID 'aaaaaaaa-0000-4000-8000-000000000012', 0,
   'enc1:TWypegYrKhJglW3vNeC9VbhVrFaYsioHyCefkEe132mAeftBOjneTyi+',
   dolphin_vector('{"0": 1, "1": 1.7320508}'), now()),
  -- The tail the write suite trims back to one.
  (UUID 'cccccccc-0000-4000-8000-000000000003', 0,
   'enc1:tqg4ceI2l2tAsEzOJwcyWx7Br6+CpEa3ZduhaYZ1plo=', dolphin_vector('{"2": 1}'), now()),
  (UUID 'cccccccc-0000-4000-8000-000000000003', 1,
   'enc1:cfNwgcp0ly8m3SFy8UDbQnw+yXoVr3G1bSAw2z+393A=', dolphin_vector('{"3": 1}'), now()),
  (UUID 'cccccccc-0000-4000-8000-000000000003', 2,
   'enc1:Rke+goCimSRn+f0YcCuSJ+Xphkmk7UyxX7QXChlnYKyYZw==', dolphin_vector('{"4": 1}'), now()),
  (UUID 'dddddddd-0000-4000-8000-000000000001', 0,
   'enc1:bp041nJFeKIBMdm8Sw+u7SYBDdeiTp4m2nFq2L3BU4BbxL+s82O1LD+Gs6GW4ho=',
   dolphin_vector('{"9": 1}'), now()),
  -- Somebody else's, sitting exactly on the question the search suite asks, so
  -- a search that stopped scoping by subject would put it first rather than
  -- miss it quietly.
  (UUID 'bbbbbbbb-0000-4000-8000-000000000001', 0,
   'enc1:Qidwd777Viml7Hl+A5dhb6rODBpQpqWtcaURfXMp6nwhQbWCGH4C/hk5rGRiTOws7CEg',
   dolphin_vector('{"0": 1}'), now());
