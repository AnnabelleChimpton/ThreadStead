/**
 * Asks /api/cap/* for a short-lived capability token, the pass a write
 * carries in its `cap` field. Those routes are same-origin checked, not
 * CSRF checked, so a plain fetch does.
 */

export type CapabilityKind =
  | 'post'
  | 'media'
  | 'profile'
  | 'photo-comment'
  | `comments/${string}`
  | `guestbook/${string}`;

/**
 * A refused mint. The message is the server's own when it sent one (someone
 * leaving hears how to stay), so callers can show it as it is. `status` is
 * 401 when signed out, and 0 when the server couldn't be reached.
 */
export class CapabilityError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = 'CapabilityError';
  }
}

export async function requestCapability(kind: CapabilityKind, body?: Record<string, unknown>): Promise<string> {
  let res: Response;
  try {
    res = await fetch(
      `/api/cap/${kind}`,
      body
        ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
        : { method: 'POST' }
    );
  } catch {
    throw new CapabilityError("Couldn't reach the server. Try again in a moment.", 0);
  }
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) throw new CapabilityError('Please log in.', 401);
  if (!res.ok || typeof data.token !== 'string') {
    throw new CapabilityError(
      typeof data.error === 'string' ? data.error : "Couldn't do that. Try again in a moment.",
      res.status
    );
  }
  return data.token;
}
