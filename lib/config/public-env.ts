/**
 * Typed NEXT_PUBLIC_* environment — safe to import from client components.
 *
 * Next.js only inlines NEXT_PUBLIC_ values into the browser bundle when the
 * code spells out `process.env` plus the full variable name, so the raw
 * object below lists each one by hand. This file must never import lib/config/env.ts
 * (server secrets); the server module imports this one instead.
 *
 * Add a variable: add its spec here AND its literal read to `rawPublicEnv`,
 * then run `npm run env:docs`.
 */
import { parseEnv, type EnvVarSpec } from './env-core';

export const PUBLIC_ENV_SPECS = [
  {
    name: 'NEXT_PUBLIC_BASE_URL',
    kind: 'url',
    scope: 'public',
    group: 'Site',
    required: 'production',
    description:
      'Public origin of the site, no trailing slash. Used for canonical/OG URLs, email links, DID documents, and the post/ring URIs sent to Ring Hub — changing it in production orphans existing hub PostRefs. Read it through getSiteBaseUrl().',
    example: 'http://localhost:3000',
  },
  {
    name: 'NEXT_PUBLIC_SITE_TITLE',
    kind: 'string',
    scope: 'public',
    group: 'Site',
    default: 'YourSiteHere',
    description: 'Site title shown in the header of every page.',
  },
  {
    name: 'NEXT_PUBLIC_SITE_NAME',
    kind: 'string',
    scope: 'public',
    group: 'Site',
    default: 'Threadstead',
    description: 'Site name used in the subject and body of login/verification emails.',
  },
  {
    name: 'NEXT_PUBLIC_SITE_HANDLE_DOMAIN',
    kind: 'string',
    scope: 'public',
    group: 'Site',
    default: 'YourSiteHere',
    description:
      'Client-side copy of SITE_HANDLE_DOMAIN (shown after the @ in the signup form). Set it to the same value.',
  },
  {
    name: 'NEXT_PUBLIC_R2_CDN_URL',
    kind: 'url',
    scope: 'public',
    group: 'Storage (Cloudflare R2)',
    description:
      'Public CDN origin for R2 assets, readable in the browser (pixel-home decoration PNGs, image-proxy allowlist). Usually the same as R2_CDN_URL.',
  },
  {
    name: 'NEXT_PUBLIC_PNG_AUTO_LOAD',
    kind: 'flag',
    scope: 'public',
    group: 'Feature flags',
    default: 'false',
    description: 'Load pixel-home decoration PNGs from the CDN automatically instead of SVG fallbacks.',
  },
  {
    name: 'NEXT_PUBLIC_USE_RING_HUB',
    kind: 'flag',
    scope: 'public',
    group: 'Feature flags',
    default: 'false',
    description: 'Route ThreadRing operations through Ring Hub (featureFlags.ringhub()).',
  },
  {
    name: 'NEXT_PUBLIC_THREADRINGS_ENABLED',
    kind: 'flag',
    scope: 'public',
    group: 'Feature flags',
    default: 'false',
    description: 'Reported by the monitoring endpoints only; nothing else reads it.',
  },
  {
    name: 'NEXT_PUBLIC_ENABLE_EXTSEARCH',
    kind: 'flag',
    scope: 'public',
    group: 'Feature flags',
    default: 'false',
    description: 'Enable external web search (Brave/Mojeek/SearXNG) on the discover page and /api/extsearch.',
  },
] as const satisfies readonly EnvVarSpec[];

// Literal reads — see the header comment.
const rawPublicEnv: Record<string, string | undefined> = {
  NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
  NEXT_PUBLIC_SITE_TITLE: process.env.NEXT_PUBLIC_SITE_TITLE,
  NEXT_PUBLIC_SITE_NAME: process.env.NEXT_PUBLIC_SITE_NAME,
  NEXT_PUBLIC_SITE_HANDLE_DOMAIN: process.env.NEXT_PUBLIC_SITE_HANDLE_DOMAIN,
  NEXT_PUBLIC_R2_CDN_URL: process.env.NEXT_PUBLIC_R2_CDN_URL,
  NEXT_PUBLIC_PNG_AUTO_LOAD: process.env.NEXT_PUBLIC_PNG_AUTO_LOAD,
  NEXT_PUBLIC_USE_RING_HUB: process.env.NEXT_PUBLIC_USE_RING_HUB,
  NEXT_PUBLIC_THREADRINGS_ENABLED: process.env.NEXT_PUBLIC_THREADRINGS_ENABLED,
  NEXT_PUBLIC_ENABLE_EXTSEARCH: process.env.NEXT_PUBLIC_ENABLE_EXTSEARCH,
};

/**
 * Parsed once per bundle. Invalid values never throw here (the server reports
 * them at boot from instrumentation.ts); see parseEnv for the fallbacks.
 */
export const publicEnv = parseEnv(PUBLIC_ENV_SPECS, rawPublicEnv).values;
