# Federation integration suite (A2 + E2)

Runs the **real `RingHubClient`** against a **real RingHub** booted from the
sibling `ThreadRingHub` checkout. Nothing is mocked: these tests exercise the
exact client code production uses against the exact hub code production runs.
The 2026-07 `{}`-response incident was invisible to all 1977 unit tests and
fails here explicitly.

```bash
npm run test:federation
```

## Requirements

- **Local Postgres** with `psql` on PATH (Homebrew default works). The harness
  creates and drops an ephemeral `ringhub_itest` database.
- **ThreadRingHub checked out next to ThreadStead** (or set `RINGHUB_REPO_PATH`
  to the repo root) with its `node_modules` installed.
- No Docker, no Redis needed (the hub degrades gracefully without Redis).

## How it works (harness/global-setup.ts)

1. Fresh `ringhub_itest` database; hub schema applied via `prisma db push`.
2. Generates an Ed25519 keypair and serves a real `did:web` DID document from
   a local HTTP server — the hub resolves it during `/trp/join`, exactly like
   it resolves ThreadStead user DIDs in production.
3. Seeds a test ring (open join, members-only posting) and pre-caches the
   signing key hub-side (`scripts/seed-integration.ts` in the hub repo).
4. Boots the hub with `tsx` on a free port and waits for `/health`.

Contract validation (`lib/api/ringhub/ringhub-contract.ts`) runs in **enforce**
mode under jest, so any hub↔client response-shape drift fails these tests even
where no explicit assertion covers it.

## Debugging

- `KEEP_FEDERATION_DB=1 npm run test:federation` keeps the database and prints
  the hub log path after the run.
- Hub stdout/stderr goes to `threadstead-federation-hub.log` in the OS temp dir.
