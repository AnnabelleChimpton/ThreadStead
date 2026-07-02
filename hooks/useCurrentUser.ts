import { useState, useEffect } from 'react';
import { UserRole } from '@prisma/client';

export interface CurrentUser {
  id: string;
  did: string;
  role: UserRole;
  primaryHandle: string | null;
}

export interface UseCurrentUserResult {
  user: CurrentUser | null;
  loading: boolean;
  loggedIn: boolean;
}

// ---------------------------------------------------------------------------
// Module-level shared cache for /api/auth/me.
//
// Every mounted useCurrentUser/useMe instance used to fire its own request
// (a feed page could fire 6+ identical requests). This cache plus in-flight
// promise dedupe means concurrent mounts share a single request, and
// remounts within the TTL reuse the last response without any network call.
// ---------------------------------------------------------------------------

export type AuthMeData = {
  loggedIn: boolean;
  user?: CurrentUser;
} & Record<string, unknown>;

const AUTH_ME_TTL_MS = 30_000;

let authMeCache: { data: AuthMeData; fetchedAt: number } | null = null;
let authMeInFlight: Promise<AuthMeData> | null = null;

/** Returns the cached /api/auth/me response if it is still fresh, else null. */
export function peekAuthMe(): AuthMeData | null {
  if (authMeCache && Date.now() - authMeCache.fetchedAt < AUTH_ME_TTL_MS) {
    return authMeCache.data;
  }
  return null;
}

/** Drops the cached response (e.g. after login/logout) so the next call refetches. */
export function invalidateAuthMe(): void {
  authMeCache = null;
}

/**
 * Fetch /api/auth/me with a short-TTL cache and in-flight request dedupe.
 * All concurrent callers share one network request.
 */
export function fetchAuthMe(): Promise<AuthMeData> {
  const cached = peekAuthMe();
  if (cached) return Promise.resolve(cached);
  if (authMeInFlight) return authMeInFlight;

  authMeInFlight = (async () => {
    try {
      const response = await fetch('/api/auth/me', { credentials: 'same-origin' });
      if (!response.ok) {
        // Don't cache transient failures; each retry window gets a fresh attempt.
        return { loggedIn: false };
      }
      const data = await response.json().catch(() => null);
      const result: AuthMeData =
        data && typeof data === 'object' ? data : { loggedIn: false };
      authMeCache = { data: result, fetchedAt: Date.now() };
      return result;
    } finally {
      authMeInFlight = null;
    }
  })();

  return authMeInFlight;
}

export function useCurrentUser(): UseCurrentUserResult {
  // Seed state synchronously from the shared cache when possible to avoid a
  // loading flicker on remounts.
  const cached = peekAuthMe();
  const [user, setUser] = useState<CurrentUser | null>(
    cached?.loggedIn && cached.user ? cached.user : null
  );
  const [loading, setLoading] = useState(!cached);
  const [loggedIn, setLoggedIn] = useState(!!(cached?.loggedIn && cached.user));

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const data = await fetchAuthMe();
        if (!alive) return;
        if (data.loggedIn && data.user) {
          setUser(data.user);
          setLoggedIn(true);
        } else {
          setUser(null);
          setLoggedIn(false);
        }
      } catch (error) {
        console.error('Failed to fetch current user:', error);
        if (!alive) return;
        setUser(null);
        setLoggedIn(false);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  return { user, loading, loggedIn };
}
