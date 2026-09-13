-- No schema yet. This file exists so `task db:migrate` has something to apply
-- and the connection is proven end to end; tables get added as we build them.
--
-- Every statement here must stay idempotent: the file is re-applied wholesale
-- rather than kept as a ledger of migrations.
SELECT true AS database_reachable;
