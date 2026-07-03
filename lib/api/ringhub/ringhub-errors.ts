/**
 * Typed errors for Ring Hub user operations.
 *
 * These distinguish real failure modes that MUST surface to callers (auth/key
 * breakage, hub unavailability) from a legitimately-empty success (a user with no
 * memberships). Downstream API routes catch these to render the right UX instead
 * of silently showing "no rings" when the user's key is actually stale.
 */

/**
 * The hub rejected the request due to authentication/authorization failure
 * (e.g. a stale or unregistered user key, HTTP 401/403, or a silent
 * X-RingHub-Auth-Error header on a 200 response). This is NOT the same as
 * "user has no memberships".
 */
export class RingHubAuthError extends Error {
  readonly status?: number;
  readonly code?: string;
  constructor(message: string, options?: { status?: number; code?: string; cause?: unknown }) {
    super(message);
    this.name = 'RingHubAuthError';
    this.status = options?.status;
    this.code = options?.code;
    if (options?.cause !== undefined) {
      (this as { cause?: unknown }).cause = options.cause;
    }
  }
}

/**
 * The hub was unreachable or returned a non-auth server/network error. Callers
 * should treat this as "temporarily unavailable", not "user has no memberships".
 */
export class RingHubUnavailableError extends Error {
  readonly status?: number;
  readonly code?: string;
  constructor(message: string, options?: { status?: number; code?: string; cause?: unknown }) {
    super(message);
    this.name = 'RingHubUnavailableError';
    this.status = options?.status;
    this.code = options?.code;
    if (options?.cause !== undefined) {
      (this as { cause?: unknown }).cause = options.cause;
    }
  }
}

/**
 * Classify a raw error thrown from the Ring Hub client into a typed error.
 * 401/403 and auth-signature failures -> RingHubAuthError; everything else -> RingHubUnavailableError.
 */
export function classifyRingHubError(error: unknown): RingHubAuthError | RingHubUnavailableError {
  const e = error as { status?: number; code?: string; message?: string };
  const status = e?.status;
  const message = (e?.message || '').toLowerCase();

  const isAuth =
    status === 401 ||
    status === 403 ||
    message.includes('authentication required') ||
    message.includes('authentication failed') ||
    message.includes('signature verification failed') ||
    message.includes('unauthorized');

  if (isAuth) {
    return new RingHubAuthError(e?.message || 'Ring Hub authentication failed', {
      status,
      code: e?.code,
      cause: error,
    });
  }

  return new RingHubUnavailableError(e?.message || 'Ring Hub unavailable', {
    status,
    code: e?.code,
    cause: error,
  });
}
