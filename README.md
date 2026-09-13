# journal

A journal app: a Next.js web front end with Auth.js sign-in, an octo agent, and
Postgres underneath. Driven by [go-task](https://taskfile.dev) from the root.

```
journal/
├── Taskfile.yml        # the entry point — `task` lists everything
├── docker-compose.yml  # local Postgres, and nothing else
├── .env.example        # the shape of the .env every task reads
├── sql/                # the schema, idempotent, re-applied with `task db:migrate`
├── web/                # Next.js 16 + Auth.js 5, the BFF you sign in to
├── agent/              # octo flows, run by the octo binary with hot reload
├── helm/               # the chart that deploys web + agent to the home lab
└── .github/workflows/  # validate on PR, release-please and OCI publish on main
```

## Quick start

```bash
# .env at the repo root is the single source of truth: every task reads it.
cp .env.example .env
openssl rand -base64 32          # paste into AUTH_SECRET

# Auth.js also needs a GitHub OAuth app before it will sign anyone in; the
# model provider keys can stay empty until something uses them.

task install                     # root + web dependencies
task dev                         # Postgres, then web and agent together
```

- Web app: <http://localhost:3000>
- Agent: <http://localhost:8080/hello> — flows hot-reload on save
- Octo visual editor (optional): `task agent:editor`, then <http://localhost:3100>
- Postgres: `localhost:5432`, user/password/database all `journal`

One `Ctrl-C` stops both apps; Postgres keeps running (`task db:down` stops it).

This is boilerplate: sign in, sign out, switch language, and a hello-world flow.
There is no application logic yet, and `sql/` holds only the tables the Auth.js
Postgres adapter requires.

### What is wired up

- **Localized EN/ES from the first commit.** Hand-rolled dictionaries under
  `web/src/i18n`; `src/i18n/en.ts` is the source of truth and every other locale
  is type-checked against it, so a missing key fails the build. A bare path is
  redirected to a locale from the `locale` cookie, then `Accept-Language`.
- **oxlint and oxfmt**, not ESLint and Prettier — `task lint`, `task format`.
- **Our own libraries** in the BFF: `@eetr/ts-rest-utils`,
  `@eetr/react-reducer-utils`, `@eetr/ts-dnd-utils`.
- Phosphor icons and `react-markdown` for the UI.

See [CLAUDE.md](CLAUDE.md) for the coding standards this repo is built to.

**The schema only auto-applies to an empty database.** Postgres runs `sql/` on
first boot and never again, so after the volume exists a schema change reaches
the database only through `task db:migrate`. Every statement in `sql/` is
idempotent so that task is safe to run as often as you like.

### Prerequisites

- [go-task](https://taskfile.dev/installation/) — `brew install go-task`
- [Docker](https://docs.docker.com/get-docker/), for Postgres
- Go 1.27+, to install the octo binary
- Node 22+
- The octo binary on your `PATH` — `task agent:install` puts it there

## Releasing

Commits on `main` are [conventional
commits](https://www.conventionalcommits.org/); release-please turns them into a
release PR, and merging it cuts the tag.

We are pre-1.0 and versioning accordingly: **a breaking change bumps the minor,
everything else bumps the patch.** No commit moves 0.x to 1.0 on its own — that
is a deliberate call for when the shape stops moving.

The tag publishes two OCI artifacts to this repo's GitHub Container Registry:

```
ghcr.io/eetr-ai/journal-web         # the web image (amd64 + arm64)
oci://ghcr.io/eetr-ai/charts/journal # the Helm chart
```

## Deploying

The chart expects two secrets to exist already, because values end up in `helm
get values` and in shell history and neither is a place for credentials:

```bash
kubectl create secret generic journal-postgres \
  --from-literal=url='postgres://journal:...@postgres:5432/journal'

kubectl create secret generic journal-auth \
  --from-literal=AUTH_SECRET=... \
  --from-literal=AUTH_GITHUB_ID=... \
  --from-literal=AUTH_GITHUB_SECRET=...

helm install journal oci://ghcr.io/eetr-ai/charts/journal \
  --set ingress.enabled=true --set ingress.host=journal.home
```

The chart is deliberately thin — two Deployments, two Services, an optional
Ingress — and points at a Postgres that already exists in the cluster. It grows
as we need it to.
