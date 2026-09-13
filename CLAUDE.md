# Coding standards

Guidelines for how this repo gets built. They describe the target shape, not
work that is already done — the repo is currently a bootstrap with no business
logic in it.

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
  the server, never from the browser.

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

## Naming

- `ret` for a return accumulator being built up.
- Component files `snake_case.tsx`; props interface `<Component>Options`; props
  parameter named `params` or `options`, typed, not destructured.
- Domain type and persistence row are separate types (`Entry` / `EntryEntity`).

## Commits

Conventional commits, because release-please reads them to decide the version.
Pre-1.0: a breaking change bumps the minor, everything else the patch.
