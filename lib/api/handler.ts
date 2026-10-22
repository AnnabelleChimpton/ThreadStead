/**
 * apiHandler — the one way to write an API route.
 *
 *   export default apiHandler(
 *     { methods: ['GET', 'POST'], auth: 'admin', rateLimit: 'admin' },
 *     async (req, res, { user }) => { ... }
 *   );
 *
 * In order, it:
 *   1. rejects other methods with 405 + an Allow header
 *   2. accepts `Authorization: Bearer <apiKey>` when the route allows a
 *      machine caller (skips session, CSRF and role checks)
 *   3. resolves the session ONCE (the old stacked withRateLimit/withCsrf/
 *      getSessionUser wrappers queried Session up to 3× per request)
 *   4. rate-limits (per user when signed in, else per IP)
 *   5. refuses a cross-origin POST/PUT/PATCH/DELETE (always; see
 *      lib/server/http/same-origin.ts), then checks the CSRF token (on by
 *      default)
 *   6. enforces auth: 401 when signed out, 403 when not an admin
 *   7. validates req.body against `schema` on POST/PUT/PATCH → 400
 *   8. runs the handler; a thrown ApiError becomes `{ error }` with its
 *      status, a ZodError a 400, anything else a logged 500
 *
 * Every error body is `{ error: string }` (see lib/api/errors.ts).
 * Routes with different bodies per method can call `schema.parse(req.body)`
 * inside the handler — a ZodError thrown there still becomes the same 400.
 */
import { timingSafeEqual } from 'crypto';
import type { NextApiRequest, NextApiResponse } from 'next';
import { ZodError, type ZodType, type z } from 'zod';
import { UserRole } from '@prisma/client';
import { getSessionUser, type SessionUser } from '@/lib/auth/server';
import { csrfProtection } from '@/lib/server/http/csrf';
import { sameOriginProtection } from '@/lib/server/http/same-origin';
import { rateLimitCheck, type RateLimitCategory } from '@/lib/server/http/rate-limit';
import {
  API_ERRORS,
  ApiError,
  sendError,
  sendForbiddenAdmin,
  sendMethodNotAllowed,
  sendUnauthenticated,
} from './errors';

export { ApiError } from './errors';
export type { SessionUser } from '@/lib/auth/server';

export type HttpMethod = 'GET' | 'HEAD' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS';

/**
 * none     — no session lookup (unless rateLimit needs the user id)
 * optional — ctx.user is the session user or null
 * user     — 401 unless signed in
 * admin    — 401 unless signed in, 403 unless role is admin
 */
export type AuthMode = 'none' | 'optional' | 'user' | 'admin';

export interface ApiHandlerOptions {
  methods: readonly HttpMethod[];
  auth: AuthMode;
  /**
   * Double-submit CSRF check on POST/PUT/PATCH/DELETE. Default true. Turning
   * it off keeps the same-origin check; do that only for routes signed-out
   * visitors call (they have no CSRF cookie yet).
   */
  csrf?: boolean;
  rateLimit?: RateLimitCategory;
  /** Validates req.body on POST/PUT/PATCH; the result is ctx.body. */
  schema?: ZodType;
  /**
   * Lets a machine caller in with `Authorization: Bearer <key>` instead of a
   * session (a key for a scripted caller). A getter, so env is read per request; an
   * unset key disables this path. Such requests skip CSRF (it only defends
   * cookie auth) and the auth check, and get ctx.user = null.
   */
  apiKey?: () => string | undefined;
}

type UserFor<O extends ApiHandlerOptions> = O extends { apiKey: () => string | undefined }
  ? SessionUser | null
  : O['auth'] extends 'user' | 'admin'
    ? SessionUser
    : SessionUser | null;

export interface ApiContext<O extends ApiHandlerOptions = ApiHandlerOptions> {
  user: UserFor<O>;
  body: O extends { schema: infer S extends ZodType } ? z.infer<S> : unknown;
  /** True when the request came in through options.apiKey. */
  viaApiKey: boolean;
}

export type ApiRouteHandler<O extends ApiHandlerOptions> = (
  req: NextApiRequest,
  res: NextApiResponse,
  ctx: ApiContext<O>
) => unknown | Promise<unknown>;

const BODY_METHODS = new Set(['POST', 'PUT', 'PATCH']);

function bearerMatches(req: NextApiRequest, expected: string | undefined): boolean {
  if (!expected) return false;
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return false;
  const given = Buffer.from(header.slice('Bearer '.length));
  const want = Buffer.from(expected);
  return given.length === want.length && timingSafeEqual(given, want);
}

function sendValidationError(res: NextApiResponse, error: ZodError): void {
  sendError(res, 400, API_ERRORS.validation, { details: error.issues });
}

export function apiHandler<const O extends ApiHandlerOptions>(
  options: O,
  handler: ApiRouteHandler<O>
) {
  const { methods, auth, csrf = true, rateLimit, schema, apiKey } = options;

  return async function route(req: NextApiRequest, res: NextApiResponse): Promise<void> {
    const method = (req.method ?? 'GET').toUpperCase();
    if (!methods.includes(method as HttpMethod)) {
      return sendMethodNotAllowed(res, methods);
    }

    try {
      const viaApiKey = apiKey ? bearerMatches(req, apiKey()) : false;

      const needsSession = !viaApiKey && (auth !== 'none' || rateLimit !== undefined);
      const user = needsSession ? await getSessionUser(req) : null;

      if (rateLimit && !(await rateLimitCheck(req, res, rateLimit, user?.id))) return;

      if (!viaApiKey) {
        if (!sameOriginProtection(req, res)) return;
        if (csrf && !(await csrfProtection(req, res))) return;

        if ((auth === 'user' || auth === 'admin') && !user) return sendUnauthenticated(res);
        if (auth === 'admin' && user?.role !== UserRole.admin) return sendForbiddenAdmin(res);
      }

      let body: unknown = req.body;
      if (schema && BODY_METHODS.has(method)) {
        const parsed = schema.safeParse(req.body);
        if (!parsed.success) return sendValidationError(res, parsed.error);
        body = parsed.data;
      }

      await handler(req, res, { user, body, viaApiKey } as ApiContext<O>);
    } catch (error) {
      if (res.headersSent) {
        console.error(`[api] ${method} ${req.url} failed after responding:`, error);
        return;
      }
      if (error instanceof ApiError) return sendError(res, error.status, error.message, error.extra);
      if (error instanceof ZodError) return sendValidationError(res, error);
      console.error(`[api] ${method} ${req.url} failed:`, error);
      return sendError(res, 500, API_ERRORS.internal);
    }
  };
}
