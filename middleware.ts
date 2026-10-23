/**
 * Residents' addresses (alice.homepageagain.com), design/home-subdomains/SCOPE.md.
 * The main site passes straight through. A resident's host is deny by default
 * (lib/subdomains/host.ts):
 *   GET /                      → their page, signed out (pages/site/[label].tsx)
 *   /.well-known/atproto-did   → their Bluesky DID (pages/api/atproto-did/[label].ts)
 *   static files, public reads → served, signed out
 *   DID documents, other /api  → 404 (federation stays on the main site)
 *   any other GET              → 302 to the same path on the main site
 *   anything but GET or HEAD   → 405 (nothing on these hosts changes anything)
 *
 * Nothing on a resident's host sees a session: the Cookie header is taken
 * off every request there (browsers don't send the main site's host-only
 * __Host- cookies to it anyway). Check that against a production build:
 * `next dev` under server.ts doesn't apply middleware's request-header
 * changes to pages (and does fill in rewritten [label] params, which a
 * production build doesn't), so dev proves neither.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { RESIDENT_LABEL_HEADER, residentApex, routeSubdomainRequest } from '@/lib/subdomains/host';

function plain(status: number, body: string, headers: Record<string, string> = {}) {
  return new NextResponse(body, { status, headers: { 'Content-Type': 'text/plain; charset=utf-8', ...headers } });
}

/** The request's headers without its cookies, and with the label (or none) we say. */
function residentHeaders(request: NextRequest, label: string | null): Headers {
  const headers = new Headers(request.headers);
  headers.delete('cookie');
  headers.delete(RESIDENT_LABEL_HEADER);
  // In a production build a rewritten path's [label] doesn't reach
  // req.query (dev fills it in), so the routes read this header first.
  if (label) headers.set(RESIDENT_LABEL_HEADER, label);
  return headers;
}

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const route = routeSubdomainRequest(request.headers.get('host'), pathname, residentApex());

  if (route.kind === 'main') {
    // Only middleware says which address a request is for
    if (!request.headers.has(RESIDENT_LABEL_HEADER)) return NextResponse.next();
    const headers = new Headers(request.headers);
    headers.delete(RESIDENT_LABEL_HEADER);
    return NextResponse.next({ request: { headers } });
  }

  const method = request.method.toUpperCase();
  if (method !== 'GET' && method !== 'HEAD') return plain(405, 'Method not allowed', { Allow: 'GET, HEAD' });

  switch (route.kind) {
    case 'not-found':
      return pathname.startsWith('/api')
        ? NextResponse.json({ error: 'Not found' }, { status: 404 })
        : plain(404, 'Not found');

    case 'pass':
      return NextResponse.next({ request: { headers: residentHeaders(request, null) } });

    case 'main-site': {
      const base = (process.env.NEXT_PUBLIC_BASE_URL || `${request.nextUrl.protocol}//${residentApex()}`).replace(/\/+$/, '');
      return NextResponse.redirect(`${base}${pathname}${search}`, 302);
    }

    case 'atproto-did':
    case 'site': {
      const url = request.nextUrl.clone();
      if (route.kind === 'atproto-did') {
        url.pathname = `/api/atproto-did/${route.label}`;
        url.search = '';
      } else {
        // ?tab=guestbook and the like carry through to the page
        url.pathname = `/site/${route.label}`;
      }
      return NextResponse.rewrite(url, { request: { headers: residentHeaders(request, route.label) } });
    }
  }
}
