import type { NextApiResponse } from 'next';

/**
 * The one set of error bodies API routes send. Every error is `{ error }`
 * (plus optional extra fields such as `details`), so clients can always read
 * `data.error`.
 */
export const API_ERRORS = {
  unauthenticated: 'Sign in first.',
  forbiddenAdmin: 'Admin access required',
  methodNotAllowed: 'Method not allowed',
  validation: 'Validation error',
  internal: 'Internal server error',
} as const;

/** Throw from inside an apiHandler to send `{ error: message }` with `status`. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly extra?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function sendError(
  res: NextApiResponse,
  status: number,
  message: string,
  extra?: Record<string, unknown>
): void {
  res.status(status).json({ error: message, ...extra });
}

export function sendUnauthenticated(res: NextApiResponse): void {
  sendError(res, 401, API_ERRORS.unauthenticated);
}

export function sendForbiddenAdmin(res: NextApiResponse): void {
  sendError(res, 403, API_ERRORS.forbiddenAdmin);
}

export function sendMethodNotAllowed(res: NextApiResponse, allowed: readonly string[]): void {
  res.setHeader('Allow', allowed.join(', '));
  sendError(res, 405, API_ERRORS.methodNotAllowed);
}
