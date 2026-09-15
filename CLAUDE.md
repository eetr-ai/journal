# Coding standards

Guidelines for how this repo gets built. They describe the target shape, which
the profile slice under `web/src/features/profile` follows end to end and the
mocked panels do not yet.

## Comments

Comments document **algorithms and contracts**, in the file they live in.

- **Say what this code guarantees, or how it works.** A non-obvious algorithm,
  an invariant, a chosen trade-off, a limitation we accepted on purpose.
- **Do not cross-reference other components.** A comment explaining what some
  other file does goes stale when that file changes, and turns a one-line change
  into a ten-file comment sweep. Describe the contract at this boundary, not the
  behaviour on the other side of it.
- **To the point.** One or two lines. If it needs a paragraph, the code probably
  needs the work instead.
- **Never restate the code.**
- State a limitation out loud rather than hiding it: `for now this only handles X`.

```ts
// Good — a contract, local, terse.
// Dense 0..n-1 per user; rewritten wholesale on reorder.

// Bad — cross-references another file, ages badly.
// The API route puts new entries at position 0, so we do the same here.
```

## Architecture

- **The backend is octo.** Business logic lives in octo integration flows under
  `agent/`, talking to Postgres through a `database` connector, rather than in
  hand-written server code.
- **`web/` is a BFF over it**, and calls it through a **thick REST client** built
  on `@eetr/ts-rest-utils` — one method per operation, each owning its path,
  payload and failure policy, so no caller builds a URL or decides what a
  non-2xx means.
- **Vertically sliced.** A feature owns its types, its client, its actions and
  its UI in one folder, rather than being spread across layer-named directories.
- The session is the trust boundary: the tenant key comes from the session on
  the server, never from the browser. A client that takes a subject as an
  argument is a bug; the service layer reads it from `auth()` itself.
- **The agent validates nothing.** It writes what it is handed. Every rule about
  what a value may be lives in the BFF, in a pure module the form and the
  server action both call, so the two can never disagree.

## Private data

Writing is encrypted under a key derived from the person's password. The threat
model is specific, and the disclaimer in the app matches it exactly — change one
and change the other.

- **Encryption is not optional.** There is no vault-less path through the app and
  no code that accommodates one: a person without a vault makes one before
  anything renders. Do not add a way around it.
- **The password is stretched in the browser, with Argon2id.** A password that
  reaches the server is a key that reaches the server.
- **Content is encrypted in the integration flow**, because making an entry
  searchable means reading it. The key arrives on the body of the request that
  needs it and is lifted into the run's variables, where the entry flows seal
  with it inline; a `crypto` connector is no use here because it holds one key
  for everybody. What we hold is the ciphertext plus the embeddings taken from
  it; what we never hold is anything that can derive the key.
- **The key reaches the server only in the body of a request that needs it.** Not
  in a cookie — not because the session cookie is readable, it is a JWE, but
  because the server holds the key that decrypts it, so a key kept there would be
  in the server process on every request, including the ones with nothing to do
  with the vault.
- **What we store is deliberately useless.** Salt, KDF parameters, a verifier
  under its own HKDF label, and the data key wrapped under a key we never see.
  The server's only judgement is refusing parameters weaker than the floor in
  `features/vault/rules.ts`.
- **Content is encrypted under the data key, not under the password.** Changing
  the password re-wraps 32 bytes and touches no content, and every enrolled
  passkey keeps working. There is no UI for it yet.
- **What is tolerated, and must stay tolerated rather than grow:** plaintext and
  the key in server memory for the length of a request the person initiated.
  Never written down, never logged.
- **What no wording should imply we protect against:** a memory dump, and a
  deploy — we serve the client, so this is trust-on-deploy.

## Testing flows

A flow is tested by the suite beside it: `orders.yaml` is tested by
`orders_test.yaml`, run by dolphin under `task test`. A case supplies the input
a source would normally have put on the message, and asserts on the result.

Write the suite with the flow, not after. A case that would pass against a
broken flow is worse than no case — check a new one fails before you trust it.

## React

- **Reducers for complex, managed interactions** — anything that loads, fails,
  rolls back, or is dragged into a new order. Use `@eetr/react-reducer-utils`.
- **`useState` for small reusable components** that own nothing beyond themselves.

## Our own libraries

Prefer them, and report what we find:

- `@eetr/ts-rest-utils` — REST client; a non-2xx is a value, not an exception.
- `@eetr/react-reducer-utils` — `bootstrapProvider` reducer contexts.
- `@eetr/ts-dnd-utils` — headless drag & drop.

## Limits the linter enforces

Set in `web/.oxlintrc.json`, and they are there to stop spaghetti before review
has to catch it. `task lint` fails on all of these.

| Rule | Limit | What it is protecting |
| --- | --- | --- |
| `no-magic-numbers` | — | An unexplained number in an expression. Name it. |
| `complexity` | 10 | Branches in one function. |
| `max-depth` | 3 | Nested blocks. |
| `max-statements` | 15 | Statements in one function. |
| `max-params` | 4 | Arguments. Past four, pass an options object. |
| `max-lines-per-function` | 60 | Blank lines and comments excluded. |
| `max-lines` | 300 | Per file. A longer file is two files. |
| `max-nested-callbacks` | 3 | Callback pyramids. |
| `no-nested-ternary` | — | Use an early return or a switch. |

A number assigned straight to a named `const` is fine — `const
COOKIE_MAX_AGE_SECONDS = 31_536_000;` — so write the value as one literal rather
than as arithmetic the rule cannot read.

**These are floors, not targets.** Hitting the limit is a smell; the fix is
smaller functions, not a bigger number. Raise a limit only with a reason, and
never suppress a rule inline to land a change.

## User-facing text

- Every string a person reads comes from `web/src/i18n/en.ts`, and `es.ts` is
  typed against it so a missing key fails the build. Nothing is hard-coded in a
  component.
- **A failure says what happened and who can fix it.** An internal code is a
  reference to quote, never the explanation. Where a library hands us a coarse
  code, we map it and log the real cause on the server.
- Colours are named by role — `surface`, `muted`, `border`, `brand` — never by
  value. The two palettes in `globals.css` are the only place a scheme exists.

## Naming

- `ret` for a return accumulator being built up.
- Component files `snake_case.tsx`; props interface `<Component>Options`; props
  parameter named `params` or `options`, typed, not destructured.
- Domain type and persistence row are separate types (`Entry` / `EntryEntity`).

## Commits

Conventional commits, because release-please reads them to decide the version.
Pre-1.0: a breaking change bumps the minor, everything else the patch.
