-- What a server owner installs once, deliberately outside sql/ so no migration
-- ever tries it: creating an extension is superuser-only, and the role the
-- migration connects as is not one. Compose mounts this into initdb ahead of
-- the schema; a real server gets it from whoever owns the server.
CREATE EXTENSION IF NOT EXISTS vector;
