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
├── agent/              # octo flows (one dir, many files) + dolphin suites + the image
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
ghcr.io/eetr-ai/journal-web          # the web image (amd64 + arm64)
ghcr.io/eetr-ai/journal-agent        # the octo runtime with our flows in it
oci://ghcr.io/eetr-ai/charts/journal # the Helm chart
```

## Deploying

The chart is deliberately thin: two Deployments, two Services, an HTTPRoute, and
a Postgres that lives **outside** the cluster. It grows as we need it to.

### Locally, on k3d

The whole loop, against a cluster on your machine:

```bash
k3d cluster create journal-dev -p "80:80@loadbalancer"   # 80 is what makes it reachable
task cluster:gateway                                     # Traefik's Gateway provider + a Gateway
task db:up                                               # the "external" Postgres, on your host
task deploy                                              # secrets, build, import, install
task cluster:proxy                                       # the Gateway on localhost:3000
```

Then <http://localhost:3000>, which is the origin the OIDC client is already
registered for, so sign-in needs nothing added at the issuer. The proxy goes
through Traefik rather than straight at the Service, so what the browser
exercises is the real `HTTPRoute`.

`task deploy` creates the Secrets from your `.env`, builds both images, imports
them into the cluster and installs the chart. The database is genuinely external:
the agent reaches your host's Postgres at `host.k3d.internal`, which is the same
shape as the real thing.

**The agent image is the flows.** `agent/Dockerfile` copies `agent/flows` onto a
pinned `juancavallotti/octo-runtime`, which already starts
`octo run --config /etc/octo/integrations`. So a release carries the integration
it is a release of, and installing the chart needs nothing applied beside it. The
dolphin suites are left out of the image — they test the flows, they are not part
of them.

### Secrets

**The chart never creates a Secret and never takes a credential as a value.** It
names two that must already exist, and refuses to render without the names:

| Secret | Keys |
| --- | --- |
| `postgres.existingSecret` | `username`, `password` |
| `auth.existingSecret` | `AUTH_SECRET`, `AUTH_OIDC_ID`, `AUTH_OIDC_SECRET` |

Only the credential is a secret. Where the server is — `postgres.host`, `port`,
`database`, `sslmode` — are values, and the kubelet assembles the DSN from both.
Nothing escapes the two on the way in, so **both the username and the password
must be percent-encoded in the Secret** if they contain anything with URI
meaning: `: / ? # @ [ ]`, and `%` itself.

`sslmode` defaults to `verify-full`, the only setting that authenticates the
server rather than merely encrypting to whoever answers. It needs the chain to
resolve in the image's trust store; the chart mounts no CA bundle yet, so a
private CA or a server with no TLS means `disable` and a deliberate decision
that the network is the boundary.

A credential passed as a value is readable afterwards through `helm get values`
and sits in the release object in the cluster, where it outlives the reason it
was there. So it is applied straight to the cluster instead:

```bash
kubectl create secret generic journal-db -n journal \
  --from-literal=username=journal \
  --from-literal=password='...'

kubectl create secret generic journal-auth -n journal \
  --from-literal=AUTH_SECRET=... \
  --from-literal=AUTH_OIDC_ID=... \
  --from-literal=AUTH_OIDC_SECRET=...
```

Locally `task cluster:secrets` does exactly that from your `.env`, and
`task deploy` runs it first.

### The Gateway

Routing is Gateway API, not Ingress. The chart brings an `HTTPRoute` and
**references** a Gateway — a Gateway belongs to whoever runs the cluster, not to
an app deployed onto it — so point `gateway.parentRef` at one that exists.
`deploy/local/traefik-gateway.yaml` is the other half for the local cluster, and
`task cluster:gateway` applies it. `deploy/homelab/values.yaml` is the real
deployment's knobs, and holds nothing secret.

The agent is never exposed: it holds the data and trusts its caller, so the route
only fronts the web app. Reach the agent with `kubectl port-forward` when you
need to.
