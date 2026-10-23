/**
 * @jest-environment node
 *
 * Every API route that a browser can post to with the visitor's cookies is
 * covered by the same-origin check: apiHandler always runs it, hand-written
 * routes get it from withCsrfProtection or call sameOriginProtection. And
 * the routes that skip the CSRF token are the known few, each because
 * signed-out visitors call it (they have no CSRF cookie yet).
 */
import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';

const ROOT = join(__dirname, '../../..');
const API = join(ROOT, 'pages/api');

function routes(dir = API): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === '__tests__' ? [] : routes(path);
    return /\.tsx?$/.test(name) ? [relative(ROOT, path)] : [];
  });
}

const source = (file: string) => readFileSync(join(ROOT, file), 'utf8');

/** Signed-out callers; the same-origin check still applies to each. */
const CSRF_OPT_OUTS = [
  'pages/api/auth/email-login.ts',
  'pages/api/auth/email-verify.ts',
  'pages/api/auth/logout.ts',
  'pages/api/auth/request-password-reset.ts',
  'pages/api/auth/reset-password.ts',
  'pages/api/auth/verify-email.ts',
  'pages/api/beta-landing-pages/[slug]/track.ts',
  'pages/api/home/[handle]/visitors.ts',
  'pages/api/posts/view/[postId].ts',
  // Outside sites' servers, which send no cookies; reads no session
  'pages/api/webmention.ts',
];

/** Hand-written routes that need neither: GET-only, a bearer-token cron, or no cookie use. */
const NOT_COOKIE_WRITES = [
  'pages/api/.well-known/did.json.ts',
  'pages/api/cron/cleanup-rate-limits.ts',
  'pages/api/did/[hash]/document.ts',
  // GET/HEAD only, reads no session: ring strips on residents' own sites
  'pages/api/ring/[slug]/[action].ts',
  // GET/HEAD only, reads no session: a ring's link-preview image
  'pages/api/share/ring/[file].ts',
  // GET/HEAD only, reads no session: the Bluesky check on residents' addresses (middleware.ts)
  'pages/api/atproto-did/[label].ts',
  'pages/api/ringhub/health-check.ts',
  'pages/api/threadrings/[slug].ts',
  'pages/api/threadrings/[slug]/lineage.ts',
  'pages/api/threadrings/[slug]/members.ts',
  'pages/api/threadrings/[slug]/ownership.ts',
  'pages/api/threadrings/[slug]/posts.ts',
  'pages/api/threadrings/[slug]/prompts/[promptId]/responses.ts',
  'pages/api/threadrings/[slug]/random-member.ts',
  'pages/api/threadrings/[slug]/stats.ts',
  'pages/api/threadrings/check-availability/[slug].ts',
  'pages/api/threadrings/genealogy.ts',
  'pages/api/threadrings/index.ts',
  'pages/api/threadrings/invites/index.ts',
  'pages/api/threadrings/my-memberships.ts',
  'pages/api/threadrings/stats.ts',
  'pages/api/users/resolve-dids.ts',
];

test('only signed-out routes skip the CSRF token', () => {
  const optedOut = routes().filter((file) => /csrf:\s*false/.test(source(file)));
  expect(optedOut.sort()).toEqual([...CSRF_OPT_OUTS].sort());
});

test('every hand-written route that takes cookie writes checks the origin', () => {
  const unchecked = routes().filter((file) => {
    const text = source(file);
    return !/apiHandler|withCsrfProtection|sameOriginProtection/.test(text);
  });
  expect(unchecked.sort()).toEqual([...NOT_COOKIE_WRITES].sort());
});
