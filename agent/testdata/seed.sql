-- Fixture rows for the flow suites. Applied by `task test` before dolphin runs,
-- against the same database sql/ built.
--
-- Idempotent, and confined to subjects prefixed `dolphin-`, so it never collides
-- with a real profile in a developer's local database.
INSERT INTO user_profile (oidc_subject, email, name, config)
VALUES (
  'dolphin-seeded',
  'seeded@example.com',
  'Seeded Profile',
  '{"theme": "dark", "language": "es"}'::jsonb
)
ON CONFLICT (oidc_subject) DO UPDATE SET
  email = EXCLUDED.email,
  name = EXCLUDED.name,
  config = EXCLUDED.config;
