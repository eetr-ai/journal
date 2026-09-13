# Eetr Journal

A journal app: a Next.js BFF with OIDC sign-in, an octo agent holding the data,
and Postgres underneath. Driven by [go-task](https://taskfile.dev) from the root.

```
journal/
├── Taskfile.yml        # the entry point — `task` lists everything
├── docker-compose.yml  # local Postgres, and nothing else
├── .env.example        # the shape of the .env every task reads
├── sql/                # the schema, idempotent, re-applied with `task db:migrate`
├── web/                # Next.js 16 + Auth.js 5, the BFF you sign in to
├── agent/              # octo flows (one dir, many files) + dolphin suites + fixtures
├── helm/               # the chart that deploys web + agent to the home lab
└── .github/workflows/  # validate on PR, release-please and OCI publish on main
```

## Quick start

```bash
# .env at the repo root is the single source of truth: every task reads it.
cp .env.example .env
openssl rand -base64 32          # paste into AUTH_SECRET

# AUTH_OIDC_ID and AUTH_OIDC_SECRET come from the client registered at
# auth.eetr.app, whose redirect URI must be
#   http://localhost:3000/api/auth/callback/eetr
# The last segment is the provider id in web/src/auth.ts. Model provider keys
# can stay empty until something uses them.

task install                     # root + web dependencies
task dev                         # Postgres, then web and agent together
```

- Web app: <http://localhost:3000>
- Agent: <http://localhost:8080/hello> and `/profiles/{subject}` — flows hot-reload on save
- Agent probes: <http://localhost:39999/healthz> and `/readyz`, served by the
  runtime itself on its own admin port
- Octo visual editor (optional): `task agent:editor`, then <http://localhost:3100>
- Postgres: `localhost:5432`, user/password/database all `journal`

One `Ctrl-C` stops both apps; Postgres keeps running (`task db:down` stops it).

Sign in with OIDC, and the app shell opens: a left drawer of recent chats and
journal entries, a chat panel, and today's entry. **Those three panels are
mocked.** The one thing that is real end to end is the profile: it is created on
first sign-in, edited on the settings page, validated by the BFF, and stored by
the agent in Postgres.

### What is wired up

- **Localized EN/ES from the first commit.** Hand-rolled dictionaries under
  `web/src/i18n`; `src/i18n/en.ts` is the source of truth and every other locale
  is type-checked against it, so a missing key fails the build. A bare path is
  redirected to a locale from the `locale` cookie, then `Accept-Language`.
- **oxlint and oxfmt**, not ESLint and Prettier — `task lint`, `task format`.
- **Our own libraries** in the BFF: `@eetr/ts-rest-utils`,
  `@eetr/react-reducer-utils`, `@eetr/ts-dnd-utils`.
- **Flow tests from day one.** `task test` runs [dolphin](https://juancavallotti.github.io/octo/),
  octo's test runner: a flow is tested by the `*_test.yaml` suite beside it, the
  way `orders.go` is tested by `orders_test.go`. It drives the real `octo`
  binary, so a case exercises the runtime that will actually serve the flow.
- **The whole `agent/flows` directory is the config**, not one integration file.
  `service.yaml` declares the identity and shared connectors — only one file may
  — and each flow gets its own file beside it. `task agent:dev` runs the
  directory with `--watch`, so editing a file, adding one, or deleting one all
  take effect without a restart.
- **A light and a dark theme**, built from the mascot's palette. Components name
  a role (`surface`, `muted`, `border`) and never a colour, so the two palettes
  in `web/src/app/globals.css` are the only place either scheme is described.
  The choice is a profile setting; a blocking script resolves "match my system"
  before the first paint so nothing flashes.
- **Sign-in failures say what happened.** Auth.js hands the browser one of a
  fixed set of coarse codes and keeps the cause to itself; `web/src/features/auth`
  turns each code into plain language in both locales, says whether trying again
  could help, and prints the reference. The real cause is logged server-side.
- **Private storage: keys derived in the browser, content encrypted by the BFF.**
  A password is stretched with Argon2id in the browser and split by HKDF into a
  verifier we store and a wrapping key we never see; the data key is random and
  wrapped under that. Content itself is encrypted server-side, because making an
  entry searchable means reading it — so the key and the plaintext pass through
  the BFF for the length of a request and are never stored or logged there. A
  passkey holds a second wrapping of the same key through the WebAuthn PRF
  extension, so quick unlock needs no password. What reaches the database cannot
  decrypt anything. See **Private data** in [CLAUDE.md](CLAUDE.md) for what that
  does and does not cover.
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
- The octo and dolphin binaries — `task agent:install` builds them into your Go
  bin directory (`go env GOBIN`, else `$(go env GOPATH)/bin`). The agent tasks
  call them by full path, so that directory need not be on your `PATH`.

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
  --from-literal=AUTH_OIDC_ID=... \
  --from-literal=AUTH_OIDC_SECRET=...

# The agent runs the stock octo runtime image and reads its flows from a
# ConfigMap, so push the flows before installing — and again whenever they change.
task helm:flows

helm install journal oci://ghcr.io/eetr-ai/charts/journal \
  --set ingress.enabled=true --set ingress.host=journal.home
```

The chart is deliberately thin — two Deployments, two Services, an optional
Ingress — and points at a Postgres that already exists in the cluster. It grows
as we need it to.
