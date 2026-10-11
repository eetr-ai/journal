#!/usr/bin/env bash
# Runs once, on first boot against an empty data directory. The extension goes
# first because the schema depends on it; the schema then runs in filename order.
set -euo pipefail

run() {
	psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -f "$1"
}

run /journal/postgres-extensions.sql
for f in /journal/sql/*.sql; do
	run "$f"
done
