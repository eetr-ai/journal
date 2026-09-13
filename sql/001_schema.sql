-- No schema yet. This file exists so `task db:migrate` has something to apply
-- and the connection is proven end to end; tables get added as we build them.
--
-- Every statement here must stay idempotent: the file is re-applied wholesale
-- rather than kept as a ledger of migrations.

-- One-time cleanup. An earlier version of this file created the Auth.js adapter
-- tables; sessions are JWTs now and nothing reads them. A volume created back
-- then still has them, and migrate is the only thing that reaches it.
--
-- Drop this block once the file holds real tables, or it will fight them.
-- CASCADE because accounts and sessions carry a foreign key onto users.
DROP TABLE IF EXISTS verification_token CASCADE;
DROP TABLE IF EXISTS accounts CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS users CASCADE;

SELECT true AS database_reachable;
