/**
 * Typed server environment — the one place every env variable is declared.
 *
 *   import { getServerEnv } from '@/lib/config/env'      // server code
 *   import { publicEnv } from '@/lib/config/public-env'  // anywhere, incl. client
 *
 * Validated once at boot from instrumentation.ts (validateEnvAtBoot). Reading
 * through getServerEnv() never throws; it gives the same fallbacks the old
 * inline `process.env[name] || 'default'` reads used.
 *
 * Server secrets are declared here and only here. The NEXT_PUBLIC_ half lives
 * in public-env.ts so a client import can never pull this file in. Next.js
 * replaces non-NEXT_PUBLIC `process.env` reads with undefined in browser
 * bundles anyway, so values could not leak — but importing this from client
 * code is always a bug, and the guard below makes it a loud one.
 *
 * Add or change a variable here, then `npm run env:docs` to regenerate
 * .env.example and ENVIRONMENT_VARIABLES.md (a unit test fails on drift).
 */
import { formatIssues, parseEnv, type EnvIssue, type EnvValues, type EnvVarSpec } from './env-core';
import { PUBLIC_ENV_SPECS } from './public-env';

if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'test') {
  throw new Error('lib/config/env.ts is server-only; use lib/config/public-env.ts in client code.');
}

export const SERVER_ENV_SPECS = [
  // ── Core ────────────────────────────────────────────────────────────────
  {
    name: 'DATABASE_URL',
    kind: 'string',
    scope: 'server',
    group: 'Core',
    required: 'always',
    secret: true,
    description: 'PostgreSQL connection string. Pool settings are appended by lib/config/database/connection.ts.',
    example: 'postgresql://user:password@localhost:5432/threadstead',
  },
  {
    name: 'PORT',
    kind: 'int',
    scope: 'server',
    group: 'Core',
    default: '3000',
    description: 'Port server.ts listens on; also used for SSR self-fetches (getInternalBaseUrl).',
  },
  {
    name: 'INTERNAL_BASE_URL',
    kind: 'url',
    scope: 'server',
    group: 'Core',
    description:
      'Override for SSR self-fetches. Default http://127.0.0.1:$PORT. Only needed when the app does not listen on loopback (e.g. MOBILE_TESTING HTTPS mode).',
  },
  {
    name: 'MOBILE_TESTING',
    kind: 'flag',
    scope: 'server',
    group: 'Core',
    default: 'false',
    description: 'server.ts: serve HTTPS on 0.0.0.0 for testing from a phone on the LAN.',
  },
  {
    name: 'SITE_HANDLE_DOMAIN',
    kind: 'string',
    scope: 'server',
    group: 'Site',
    description:
      'Shown after the @ in every handle (alice@YourSite), and the fallback domain for DIDs. Keep it short, and set NEXT_PUBLIC_SITE_HANDLE_DOMAIN to the same value. Unset, call sites fall back inconsistently (YourSiteHere / HomePageAgain / localhost:3000), so set it.',
    example: 'YourSiteHere',
  },

  // ── Auth & security ─────────────────────────────────────────────────────
  {
    name: 'TRUSTED_PROXY_HOPS',
    kind: 'int',
    scope: 'server',
    group: 'Auth & security',
    default: '1',
    description:
      'How many proxies in front of the app append a trusted entry to X-Forwarded-For. The client IP used for rate limits and signup checks is the entry this many from the right (lib/server/http/client-ip.ts). Production is 1: nginx resolves the real visitor from CF-Connecting-IP (real_ip, Cloudflare ranges only) and appends that, so Cloudflare\'s own entry is not counted. Too low and every caller shares the proxy\'s bucket; too high and callers can spoof their IP. 0 ignores the proxy headers and uses the socket address.',
  },
  {
    name: 'CAP_JWT_SECRET',
    kind: 'string',
    scope: 'server',
    group: 'Auth & security',
    required: 'production',
    secret: true,
    description:
      "HMAC secret for capability tokens. Production refuses to mint/verify with it unset or set to 'devsecret'. Generate with `openssl rand -base64 32`.",
  },
  {
    name: 'CAP_AUDIENCE',
    kind: 'string',
    scope: 'server',
    group: 'Auth & security',
    default: 'retro.local',
    description: 'JWT audience for capability tokens. Set to your production domain.',
  },
  {
    name: 'BETA_KEYS_ENABLED',
    kind: 'string',
    scope: 'server',
    group: 'Auth & security',
    default: 'false',
    description: 'Require a beta key to sign up. Accepts true/false/1/0/yes/no; anything else means disabled.',
  },
  {
    name: 'EMAIL_ENCRYPTION_KEY',
    kind: 'string',
    scope: 'server',
    group: 'Auth & security',
    secret: true,
    description:
      'AES-256-GCM key for stored email addresses: 64 hex characters (`openssl rand -hex 32`). Email features throw without it.',
  },
  {
    name: 'CRON_SECRET',
    kind: 'string',
    scope: 'server',
    group: 'Auth & security',
    secret: true,
    description: 'Bearer token for /api/cron/cleanup-rate-limits. Required in production for that job to run.',
  },
  {
    name: 'VERCEL_CRON_SECRET',
    kind: 'string',
    scope: 'server',
    group: 'Auth & security',
    secret: true,
    description: 'Fallback for CRON_SECRET (Vercel-style name).',
  },

  // ── Email ───────────────────────────────────────────────────────────────
  {
    name: 'RESEND_API_KEY',
    kind: 'string',
    scope: 'server',
    group: 'Email',
    secret: true,
    description: 'Resend API key for login and verification emails.',
  },
  {
    name: 'RESEND_FROM_EMAIL',
    kind: 'string',
    scope: 'server',
    group: 'Email',
    description: 'From address for outgoing email; must be a verified Resend sender.',
    example: 'hello@example.com',
  },

  // ── Storage (Cloudflare R2) ─────────────────────────────────────────────
  {
    name: 'R2_ACCESS_KEY_ID',
    kind: 'string',
    scope: 'server',
    group: 'Storage (Cloudflare R2)',
    secret: true,
    description: 'R2 access key ID.',
  },
  {
    name: 'R2_SECRET_ACCESS_KEY',
    kind: 'string',
    scope: 'server',
    group: 'Storage (Cloudflare R2)',
    secret: true,
    description: 'R2 secret access key.',
  },
  {
    name: 'R2_BUCKET_NAME',
    kind: 'string',
    scope: 'server',
    group: 'Storage (Cloudflare R2)',
    default: 'threadstead-media',
    description: 'Bucket for uploads. Some upload routes have no fallback, so set it explicitly.',
  },
  {
    name: 'R2_PUBLIC_URL',
    kind: 'url',
    scope: 'server',
    group: 'Storage (Cloudflare R2)',
    description:
      'Despite the name, this is the S3 API endpoint (https://<account>.r2.cloudflarestorage.com) used by lib/storage/r2.ts. Also the last-resort public URL when neither R2_CDN_URL nor NEXT_PUBLIC_R2_CDN_URL is set.',
  },
  {
    name: 'R2_CDN_URL',
    kind: 'url',
    scope: 'server',
    group: 'Storage (Cloudflare R2)',
    description: 'Public origin uploaded files are served from (custom domain or r2.dev). First choice for upload URLs (lib/storage/r2.ts publicUrl).',
  },
  {
    name: 'R2_LOCAL_DIR',
    kind: 'string',
    scope: 'server',
    group: 'Storage (Cloudflare R2)',
    description:
      'Development only, ignored in production. When set, uploads are written to this folder under public/ (e.g. "_local-r2") and served from /<folder>/<key> instead of going to the bucket, so local previews never touch real storage.',
    example: '_local-r2',
  },

  // ── Ring Hub & DID ──────────────────────────────────────────────────────
  {
    name: 'RING_HUB_URL',
    kind: 'url',
    scope: 'server',
    group: 'Ring Hub & DID',
    description: 'Ring Hub base URL. Ring Hub calls are skipped when unset.',
    example: 'http://localhost:3100',
  },
  {
    name: 'RING_HUB_API_KEY',
    kind: 'string',
    scope: 'server',
    group: 'Ring Hub & DID',
    secret: true,
    description: 'Only checked by the Ring Hub config validator (monitoring/test utils); requests are signed with the DID key.',
  },
  {
    name: 'RING_HUB_TIMEOUT_MS',
    kind: 'int',
    scope: 'server',
    group: 'Ring Hub & DID',
    default: '15000',
    description: 'Per-request timeout for RingHubClient.',
  },
  {
    name: 'RINGHUB_USER_AUTH_MODE',
    kind: 'enum',
    values: ['user', 'server-proxy'],
    scope: 'server',
    group: 'Ring Hub & DID',
    default: 'user',
    description:
      "How user actions authenticate to Ring Hub. 'user' signs with each user's DID; 'server-proxy' makes every user act as the server actor — only for local debugging.",
  },
  {
    name: 'RINGHUB_CONTRACT_MODE',
    kind: 'enum',
    values: ['enforce', 'warn', 'off'],
    scope: 'server',
    group: 'Ring Hub & DID',
    description:
      'What to do when a hub response breaks the wire contract. Unset: warn in production, enforce elsewhere.',
  },
  {
    name: 'THREADSTEAD_DID',
    kind: 'string',
    scope: 'server',
    group: 'Ring Hub & DID',
    description: 'This instance’s DID (did:web:…). Generate with scripts/setup-ring-hub-keys.ts.',
  },
  {
    name: 'THREADSTEAD_PRIVATE_KEY_B64URL',
    kind: 'string',
    scope: 'server',
    group: 'Ring Hub & DID',
    secret: true,
    description: 'Ed25519 private key for the instance DID, base64url.',
  },
  {
    name: 'THREADSTEAD_PUBLIC_KEY_MULTIBASE',
    kind: 'string',
    scope: 'server',
    group: 'Ring Hub & DID',
    description: 'Public key for the instance DID, multibase.',
  },
  {
    name: 'THREADSTEAD_KEY_ENCRYPTION_KEY',
    kind: 'string',
    scope: 'server',
    group: 'Ring Hub & DID',
    secret: true,
    description: 'Encrypts stored user DID keys at rest.',
  },
  {
    name: 'THREADSTEAD_DID_SALT',
    kind: 'string',
    scope: 'server',
    group: 'Ring Hub & DID',
    secret: true,
    description:
      "Salt for user DID hashes. NEVER change it once users exist — every user DID would change. Unset, the code hashes with the literal string 'undefined' (kept for compatibility).",
  },
  {
    name: 'THREADSTEAD_SERVER_KEY_ROTATION_DAYS',
    kind: 'int',
    scope: 'server',
    group: 'Ring Hub & DID',
    default: '365',
    description: 'Server key age (days) before rotation is reported as due.',
  },
  {
    name: 'THREADSTEAD_USER_KEY_ROTATION_DAYS',
    kind: 'int',
    scope: 'server',
    group: 'Ring Hub & DID',
    default: '730',
    description: 'User key age (days) before rotation is due.',
  },
  {
    name: 'THREADSTEAD_KEY_CHECK_INTERVAL_HOURS',
    kind: 'int',
    scope: 'server',
    group: 'Ring Hub & DID',
    default: '24',
    description: 'How often the key-rotation check runs.',
  },

  // ── ThreadRing reconciliation ───────────────────────────────────────────
  {
    name: 'DISABLE_THREADRING_RECONCILIATION',
    kind: 'flag',
    scope: 'server',
    group: 'ThreadRing reconciliation',
    default: 'false',
    description: 'Turn off the background counter reconciliation that runs in production.',
  },
  {
    name: 'FORCE_THREADRING_RECONCILIATION',
    kind: 'flag',
    scope: 'server',
    group: 'ThreadRing reconciliation',
    default: 'false',
    description: 'Run the background reconciliation outside production (for testing it).',
  },
  {
    name: 'THREADRING_RECONCILIATION_HOURS',
    kind: 'int',
    scope: 'server',
    group: 'ThreadRing reconciliation',
    default: '24',
    description: 'Hours between reconciliation runs (1–168).',
  },

  // ── Templates ───────────────────────────────────────────────────────────
  {
    name: 'ENABLE_TEMPLATE_ISLANDS',
    kind: 'flag',
    scope: 'server',
    group: 'Feature flags',
    default: 'false',
    description: 'featureFlags.templateIslands() — currently read by nothing else.',
  },
  {
    name: 'ENABLE_TEMPLATE_COMPILATION',
    kind: 'flag',
    scope: 'server',
    group: 'Feature flags',
    default: 'false',
    description: 'featureFlags.templateCompilation() — currently read by nothing else.',
  },
  {
    name: 'TEMPLATE_ISLAND_ROLLOUT_PERCENT',
    kind: 'int',
    scope: 'server',
    group: 'Feature flags',
    default: '0',
    description: 'Percentage of users in the template-islands rollout.',
  },
] as const satisfies readonly EnvVarSpec[];

/** Read only by scripts/, prisma/seed.ts or the test harness — not validated at app boot. */
export const SCRIPT_ENV_SPECS = [
  {
    name: 'SEED_USER_HANDLE',
    kind: 'string',
    scope: 'script',
    group: 'Seed & setup scripts',
    default: 'alice',
    description: 'Handle of the user created by `npm run seed`.',
  },
  {
    name: 'SEED_USER_DISPLAY_NAME',
    kind: 'string',
    scope: 'script',
    group: 'Seed & setup scripts',
    default: 'Alice',
    description: 'Display name of the seed user.',
  },
  {
    name: 'SEED_USER_BIO',
    kind: 'string',
    scope: 'script',
    group: 'Seed & setup scripts',
    default: "Hi, I'm Alice! Welcome to my retro page.",
    description: 'Bio of the seed user.',
  },
  {
    name: 'ADMIN_HANDLE',
    kind: 'string',
    scope: 'script',
    group: 'Seed & setup scripts',
    default: 'admin',
    description: 'Handle of the admin created by `npm run setup:admin`.',
  },
  {
    name: 'ADMIN_DISPLAY_NAME',
    kind: 'string',
    scope: 'script',
    group: 'Seed & setup scripts',
    default: 'Site Administrator',
    description: 'Display name of that admin.',
  },
  {
    name: 'ADMIN_BIO',
    kind: 'string',
    scope: 'script',
    group: 'Seed & setup scripts',
    default: 'Site administrator and community manager.',
    description: 'Bio of that admin.',
  },
  {
    name: 'CHAT_RETENTION_DAYS',
    kind: 'int',
    scope: 'script',
    group: 'Seed & setup scripts',
    default: '90',
    description: 'scripts/cleanup-old-chat-messages.ts: delete chat messages older than this.',
  },
  {
    name: 'RELEASE_TYPE',
    kind: 'string',
    scope: 'script',
    group: 'Seed & setup scripts',
    default: 'BETA_USERS',
    description: 'scripts/migrate-beta-items.ts: which release to migrate (or pass it as the first argument).',
  },
  {
    name: 'TEST_DATABASE_URL',
    kind: 'string',
    scope: 'test',
    group: 'Tests',
    secret: true,
    description: 'Postgres URL for the federation test suite. Default postgresql://$USER@localhost:5432/<suite db>.',
  },
  {
    name: 'RINGHUB_REPO_PATH',
    kind: 'string',
    scope: 'test',
    group: 'Tests',
    description: 'ThreadRingHub checkout the federation suite boots. Default ../ThreadRingHub.',
  },
  {
    name: 'KEEP_FEDERATION_DB',
    kind: 'string',
    scope: 'test',
    group: 'Tests',
    description: "Set to '1' to keep the federation test database after the run.",
  },
] as const satisfies readonly EnvVarSpec[];

/** Every declared variable, in doc order. */
export const ALL_ENV_SPECS: readonly EnvVarSpec[] = [
  ...PUBLIC_ENV_SPECS,
  ...SERVER_ENV_SPECS,
  ...SCRIPT_ENV_SPECS,
];

/** Set by the runtime, not by you — ignored by the drift check. */
export const RUNTIME_ENV_VARS = ['NODE_ENV', 'NEXT_RUNTIME', 'npm_package_version'] as const;

/** Names that appear in old docs/.env files but that no code reads. */
export const OBSOLETE_ENV_VARS: ReadonlyArray<{ name: string; note: string }> = [
  { name: 'SITE_TITLE', note: 'The code reads NEXT_PUBLIC_SITE_TITLE.' },
  { name: 'R2_ACCOUNT_ID', note: 'Not read; the account is part of the R2_PUBLIC_URL endpoint.' },
  { name: 'NEXT_PUBLIC_ENABLE_ISLANDS', note: 'Not read; see ENABLE_TEMPLATE_ISLANDS.' },
  { name: 'RING_HUB_TIMEOUT', note: 'Never read (the monitoring page used to echo it). Use RING_HUB_TIMEOUT_MS.' },
  { name: 'RING_HUB_RETRIES', note: 'Never read; RingHubClient does not retry.' },
  { name: 'RING_HUB_RETRY_DELAY', note: 'Never read; RingHubClient does not retry.' },
  { name: 'BRAVE_API_KEY', note: 'Brave web search was removed 2026-10 (SEARCH_PLAN.md §3.4). Delete it and revoke the key.' },
  { name: 'MOJEEK_API_KEY', note: 'The external search engines were removed 2026-10 (SEARCH_PLAN.md §3.4).' },
  { name: 'SEARXNG_INSTANCE_URL', note: 'The external search engines were removed 2026-10 (SEARCH_PLAN.md §3.4).' },
  { name: 'NEXT_PUBLIC_ENABLE_EXTSEARCH', note: 'The wider web is plain links to other engines now (SEARCH_PLAN.md §3.4).' },
  { name: 'CRAWLER_API_KEY', note: 'The crawler was removed 2026-10; the Indie Index refresher runs under pm2 (SEARCH_PLAN.md §3.5).' },
];

const BOOT_SPECS = [...PUBLIC_ENV_SPECS, ...SERVER_ENV_SPECS] as const;
export type ServerEnv = EnvValues<typeof BOOT_SPECS>;

let cached: ServerEnv | null = null;

/** Typed server env (public vars included). Parsed once; never throws. */
export function getServerEnv(): ServerEnv {
  if (!cached) cached = parseEnv(BOOT_SPECS, process.env).values;
  return cached;
}

/** For tests that change process.env between cases. */
export function resetServerEnvCache(): void {
  cached = null;
}

/** Check the app's env (not script/test vars). Pure; returns every issue. */
export function checkEnv(
  source: Record<string, string | undefined> = process.env,
  opts: { production?: boolean } = { production: process.env.NODE_ENV === 'production' }
): EnvIssue[] {
  return parseEnv(BOOT_SPECS, source, opts).issues;
}

/**
 * Called from instrumentation.ts on server start. Values are never logged.
 *
 * Errors (a required variable missing, or a URL/integer that cannot parse)
 * throw in production, so a broken deploy fails at boot instead of on the
 * first request that needs the value. In development they are logged loudly
 * but the server still starts — a half-configured local .env (no R2, no Ring
 * Hub) is normal. `npm run env:check` runs the production rules on demand.
 */
export function validateEnvAtBoot(source: Record<string, string | undefined> = process.env): void {
  const production = source.NODE_ENV === 'production';
  const issues = checkEnv(source, { production });
  const errors = issues.filter((i) => i.level === 'error');
  const warnings = issues.filter((i) => i.level === 'warning');

  if (warnings.length) {
    console.warn(`[env] ${warnings.length} warning(s):\n${formatIssues(warnings)}`);
  }
  if (!errors.length) return;

  const report = `[env] Invalid environment (see ENVIRONMENT_VARIABLES.md):\n${formatIssues(errors)}`;
  if (production) throw new Error(report);
  console.error(`${report}\n[env] Continuing because NODE_ENV is not production.`);
}
