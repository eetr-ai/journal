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
