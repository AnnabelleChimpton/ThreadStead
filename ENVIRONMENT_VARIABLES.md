# Environment Variables

> Generated from lib/config/env.ts + public-env.ts by `npm run env:docs`. Edit the specs, not this file.

Every variable the app reads, with the default the code falls back to. Start from `.env.example` (`cp .env.example .env`).

- **Validation.** `instrumentation.ts` checks the environment on server start. In production a missing required variable, or a URL/integer that does not parse, stops the server with a list of what to fix; in development the same list is printed and the server keeps going. Run `npm run env:check` to apply the production rules to your current environment. Values are never printed.
- **Reading them in code.** Server code: `getServerEnv()` from `lib/config/env.ts`. Client or shared code: `publicEnv` from `lib/config/public-env.ts`. The site URL: `getSiteBaseUrl()` from `lib/config/site-url.ts`.
- **`NEXT_PUBLIC_*`** values are baked into the browser bundle at build time — rebuild after changing them, and never put a secret in one. 🔒 marks secrets.

## Where the branding shows up

```
┌─────────────────────────────────────────┐
│  [NEXT_PUBLIC_SITE_TITLE]               │  ← Header (top of every page)
├─────────────────────────────────────────┤
│  Welcome alice@[SITE_HANDLE_DOMAIN]!    │  ← User handles throughout site
│                                         │
│  Profile: [SEED_USER_DISPLAY_NAME]      │  ← Seed user (npm run seed)
│  Bio: [SEED_USER_BIO]                   │
│                                         │
│  Username signup:                       │
│  yourname@[NEXT_PUBLIC_SITE_HANDLE_DOMAIN] ← Signup form (client-side copy)
└─────────────────────────────────────────┘
```

Unset, the branding falls back to "YourSiteHere". Set `SITE_HANDLE_DOMAIN` and `NEXT_PUBLIC_SITE_HANDLE_DOMAIN` to the same short value, and change the seed values before seeding — they are copied into the database, not read live.

## Core

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` 🔒 | required | — | PostgreSQL connection string. Pool settings are appended by lib/config/database/connection.ts. |
| `PORT` | — | `3000` | Port server.ts listens on; also used for SSR self-fetches (getInternalBaseUrl). Integer. |
| `INTERNAL_BASE_URL` | — | — | Override for SSR self-fetches. Default http://127.0.0.1:$PORT. Only needed when the app does not listen on loopback (e.g. MOBILE_TESTING HTTPS mode). |
| `MOBILE_TESTING` | — | `false` | server.ts: serve HTTPS on 0.0.0.0 for testing from a phone on the LAN. `true`/`false`. |

## Site

| Variable | Required | Default | Description |
|---|---|---|---|
| `NEXT_PUBLIC_BASE_URL` | required in production | — | Public origin of the site, no trailing slash. Used for canonical/OG URLs, email links, DID documents, and the post/ring URIs sent to Ring Hub — changing it in production orphans existing hub PostRefs. Read it through getSiteBaseUrl(). |
| `NEXT_PUBLIC_SITE_TITLE` | — | `YourSiteHere` | Site title shown in the header of every page. |
| `NEXT_PUBLIC_SITE_NAME` | — | `Threadstead` | Site name used in the subject and body of login/verification emails. |
| `NEXT_PUBLIC_SITE_HANDLE_DOMAIN` | — | `YourSiteHere` | Client-side copy of SITE_HANDLE_DOMAIN (shown after the @ in the signup form). Set it to the same value. |
| `SITE_HANDLE_DOMAIN` | — | — | Shown after the @ in every handle (alice@YourSite), and the fallback domain for DIDs. Keep it short, and set NEXT_PUBLIC_SITE_HANDLE_DOMAIN to the same value. Unset, call sites fall back inconsistently (YourSiteHere / HomePageAgain / localhost:3000), so set it. |

## Auth & security

| Variable | Required | Default | Description |
|---|---|---|---|
| `TRUSTED_PROXY_HOPS` | — | `1` | How many proxies in front of the app append a trusted entry to X-Forwarded-For. The client IP used for rate limits and signup checks is the entry this many from the right (lib/server/http/client-ip.ts). Production is 1: nginx resolves the real visitor from CF-Connecting-IP (real_ip, Cloudflare ranges only) and appends that, so Cloudflare's own entry is not counted. Too low and every caller shares the proxy's bucket; too high and callers can spoof their IP. 0 ignores the proxy headers and uses the socket address. Integer. |
| `CAP_JWT_SECRET` 🔒 | required in production | — | HMAC secret for capability tokens. Production refuses to mint/verify with it unset or set to 'devsecret'. Generate with `openssl rand -base64 32`. |
| `CAP_AUDIENCE` | — | `retro.local` | JWT audience for capability tokens. Set to your production domain. |
| `BETA_KEYS_ENABLED` | — | `false` | Require a beta key to sign up. Accepts true/false/1/0/yes/no; anything else means disabled. |
| `EMAIL_ENCRYPTION_KEY` 🔒 | — | — | AES-256-GCM key for stored email addresses: 64 hex characters (`openssl rand -hex 32`). Email features throw without it. |
| `CRON_SECRET` 🔒 | — | — | Bearer token for /api/cron/cleanup-rate-limits. Required in production for that job to run. |
| `VERCEL_CRON_SECRET` 🔒 | — | — | Fallback for CRON_SECRET (Vercel-style name). |

## Email

| Variable | Required | Default | Description |
|---|---|---|---|
| `RESEND_API_KEY` 🔒 | — | — | Resend API key for login and verification emails. |
| `RESEND_FROM_EMAIL` | — | — | From address for outgoing email; must be a verified Resend sender. |

## Storage (Cloudflare R2)

| Variable | Required | Default | Description |
|---|---|---|---|
| `NEXT_PUBLIC_R2_CDN_URL` | — | — | Public CDN origin for R2 assets, readable in the browser (pixel-home decoration PNGs, image-proxy allowlist). Usually the same as R2_CDN_URL. |
| `R2_ACCESS_KEY_ID` 🔒 | — | — | R2 access key ID. |
| `R2_SECRET_ACCESS_KEY` 🔒 | — | — | R2 secret access key. |
| `R2_BUCKET_NAME` | — | `threadstead-media` | Bucket for uploads. Some upload routes have no fallback, so set it explicitly. |
| `R2_PUBLIC_URL` | — | — | Despite the name, this is the S3 API endpoint (https://<account>.r2.cloudflarestorage.com) used by lib/storage/r2.ts. Also the last-resort public URL when neither R2_CDN_URL nor NEXT_PUBLIC_R2_CDN_URL is set. |
| `R2_CDN_URL` | — | — | Public origin uploaded files are served from (custom domain or r2.dev). First choice for upload URLs (lib/storage/r2.ts publicUrl). |
| `R2_LOCAL_DIR` | — | — | Development only, ignored in production. When set, uploads are written to this folder under public/ (e.g. "_local-r2") and served from /<folder>/<key> instead of going to the bucket, so local previews never touch real storage. |

## Ring Hub & DID

| Variable | Required | Default | Description |
|---|---|---|---|
| `RING_HUB_URL` | — | — | Ring Hub base URL. Ring Hub calls are skipped when unset. |
| `RING_HUB_API_KEY` 🔒 | — | — | Only checked by the Ring Hub config validator (monitoring/test utils); requests are signed with the DID key. |
| `RING_HUB_TIMEOUT_MS` | — | `15000` | Per-request timeout for RingHubClient. Integer. |
| `RINGHUB_USER_AUTH_MODE` | — | `user` | How user actions authenticate to Ring Hub. 'user' signs with each user's DID; 'server-proxy' makes every user act as the server actor — only for local debugging. One of: `user`, `server-proxy`. |
| `RINGHUB_CONTRACT_MODE` | — | — | What to do when a hub response breaks the wire contract. Unset: warn in production, enforce elsewhere. One of: `enforce`, `warn`, `off`. |
| `THREADSTEAD_DID` | — | — | This instance’s DID (did:web:…). Generate with scripts/setup-ring-hub-keys.ts. |
| `THREADSTEAD_PRIVATE_KEY_B64URL` 🔒 | — | — | Ed25519 private key for the instance DID, base64url. |
| `THREADSTEAD_PUBLIC_KEY_MULTIBASE` | — | — | Public key for the instance DID, multibase. |
| `THREADSTEAD_KEY_ENCRYPTION_KEY` 🔒 | — | — | Encrypts stored user DID keys at rest. |
| `THREADSTEAD_DID_SALT` 🔒 | — | — | Salt for user DID hashes. NEVER change it once users exist — every user DID would change. Unset, the code hashes with the literal string 'undefined' (kept for compatibility). |
| `THREADSTEAD_SERVER_KEY_ROTATION_DAYS` | — | `365` | Server key age (days) before rotation is reported as due. Integer. |
| `THREADSTEAD_USER_KEY_ROTATION_DAYS` | — | `730` | User key age (days) before rotation is due. Integer. |
| `THREADSTEAD_KEY_CHECK_INTERVAL_HOURS` | — | `24` | How often the key-rotation check runs. Integer. |

## ThreadRing reconciliation

| Variable | Required | Default | Description |
|---|---|---|---|
| `DISABLE_THREADRING_RECONCILIATION` | — | `false` | Turn off the background counter reconciliation that runs in production. `true`/`false`. |
| `FORCE_THREADRING_RECONCILIATION` | — | `false` | Run the background reconciliation outside production (for testing it). `true`/`false`. |
| `THREADRING_RECONCILIATION_HOURS` | — | `24` | Hours between reconciliation runs (1–168). Integer. |

## Feature flags

| Variable | Required | Default | Description |
|---|---|---|---|
| `NEXT_PUBLIC_PNG_AUTO_LOAD` | — | `false` | Load pixel-home decoration PNGs from the CDN automatically instead of SVG fallbacks. `true`/`false`. |
| `NEXT_PUBLIC_HOUSE_SPRITES` | — | — | House templates drawn from PNG layers instead of the code-drawn SVG, comma-separated (e.g. "cabin_v1"). Off when unset; a template only switches once its layer art exists (lib/pixel-homes/house-layers.ts). |
| `NEXT_PUBLIC_USE_RING_HUB` | — | `false` | Route ThreadRing operations through Ring Hub (featureFlags.ringhub()). `true`/`false`. |
| `NEXT_PUBLIC_THREADRINGS_ENABLED` | — | `false` | Reported by the monitoring endpoints only; nothing else reads it. `true`/`false`. |
| `ENABLE_TEMPLATE_ISLANDS` | — | `false` | featureFlags.templateIslands() — currently read by nothing else. `true`/`false`. |
| `ENABLE_TEMPLATE_COMPILATION` | — | `false` | featureFlags.templateCompilation() — currently read by nothing else. `true`/`false`. |
| `TEMPLATE_ISLAND_ROLLOUT_PERCENT` | — | `0` | Percentage of users in the template-islands rollout. Integer. |

## Scripts and tests

Read only by `scripts/`, `prisma/seed.ts` or the federation test harness — not checked at app start.

### Seed & setup scripts

| Variable | Required | Default | Description |
|---|---|---|---|
| `SEED_USER_HANDLE` | — | `alice` | Handle of the user created by `npm run seed`. |
| `SEED_USER_DISPLAY_NAME` | — | `Alice` | Display name of the seed user. |
| `SEED_USER_BIO` | — | `Hi, I'm Alice! Welcome to my retro page.` | Bio of the seed user. |
| `ADMIN_HANDLE` | — | `admin` | Handle of the admin created by `npm run setup:admin`. |
| `ADMIN_DISPLAY_NAME` | — | `Site Administrator` | Display name of that admin. |
| `ADMIN_BIO` | — | `Site administrator and community manager.` | Bio of that admin. |
| `CHAT_RETENTION_DAYS` | — | `90` | scripts/cleanup-old-chat-messages.ts: delete chat messages older than this. Integer. |
| `RELEASE_TYPE` | — | `BETA_USERS` | scripts/migrate-beta-items.ts: which release to migrate (or pass it as the first argument). |

### Tests

| Variable | Required | Default | Description |
|---|---|---|---|
| `TEST_DATABASE_URL` 🔒 | — | — | Postgres URL for the federation test suite. Default postgresql://$USER@localhost:5432/<suite db>. |
| `RINGHUB_REPO_PATH` | — | — | ThreadRingHub checkout the federation suite boots. Default ../ThreadRingHub. |
| `KEEP_FEDERATION_DB` | — | — | Set to '1' to keep the federation test database after the run. |

## Names nothing reads

These appear in older docs or `.env` files. Setting them does nothing.

| Variable | Note |
|---|---|
| `SITE_TITLE` | The code reads NEXT_PUBLIC_SITE_TITLE. |
| `R2_ACCOUNT_ID` | Not read; the account is part of the R2_PUBLIC_URL endpoint. |
| `NEXT_PUBLIC_ENABLE_ISLANDS` | Not read; see ENABLE_TEMPLATE_ISLANDS. |
| `RING_HUB_TIMEOUT` | Never read (the monitoring page used to echo it). Use RING_HUB_TIMEOUT_MS. |
| `RING_HUB_RETRIES` | Never read; RingHubClient does not retry. |
| `RING_HUB_RETRY_DELAY` | Never read; RingHubClient does not retry. |
| `BRAVE_API_KEY` | Brave web search was removed 2026-10 (SEARCH_PLAN.md §3.4). Delete it and revoke the key. |
| `MOJEEK_API_KEY` | The external search engines were removed 2026-10 (SEARCH_PLAN.md §3.4). |
| `SEARXNG_INSTANCE_URL` | The external search engines were removed 2026-10 (SEARCH_PLAN.md §3.4). |
| `NEXT_PUBLIC_ENABLE_EXTSEARCH` | The wider web is plain links to other engines now (SEARCH_PLAN.md §3.4). |
| `CRAWLER_API_KEY` | The crawler was removed 2026-10; the Indie Index refresher runs under pm2 (SEARCH_PLAN.md §3.5). |

## Example: a small community

```bash
NEXT_PUBLIC_BASE_URL=https://retrospace.example
NEXT_PUBLIC_SITE_TITLE="RetroSpace Community"
SITE_HANDLE_DOMAIN=RetroSpace
NEXT_PUBLIC_SITE_HANDLE_DOMAIN=RetroSpace
SEED_USER_HANDLE=admin
SEED_USER_DISPLAY_NAME="Community Manager"
```

Users get handles like `alice@RetroSpace` and the header reads "RetroSpace Community".
