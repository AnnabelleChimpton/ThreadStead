/**
 * Residents' addresses (alice.homepageagain.com), Phase 1 of
 * design/home-subdomains/SCOPE.md. The main site passes straight through.
 * On a resident's host:
 *   /.well-known/atproto-did  → their Bluesky DID (pages/api/atproto-did/[label].ts)
 *   DID documents, /api/*      → 404 (federation stays on the main site)
 *   any other GET              → 302 to their profile (pages/api/subdomain/[label].ts)
 *   anything else              → 405 (nothing on these hosts changes anything)
 */
import { NextResponse, type NextRequest } from 'next/server';
import { residentApex, routeSubdomainRequest } from '@/lib/subdomains/host';

function plain(status: number, body: string, headers: Record<string, string> = {}) {
  return new NextResponse(body, { status, headers: { 'Content-Type': 'text/plain; charset=utf-8', ...headers } });
}

export function middleware(request: NextRequest) {
  const route = routeSubdomainRequest(request.headers.get('host'), request.nextUrl.pathname, residentApex());
  if (route.kind === 'main') return NextResponse.next();
  if (route.kind === 'not-found') return plain(404, 'Not found');

  const method = request.method.toUpperCase();
  if (method !== 'GET' && method !== 'HEAD') return plain(405, 'Method not allowed', { Allow: 'GET, HEAD' });

  const url = request.nextUrl.clone();
  url.search = '';
  url.pathname =
    route.kind === 'atproto-did'
      ? `/api/atproto-did/${route.label}`
      : `/api/subdomain/${route.label}`;
  return NextResponse.rewrite(url);
}
