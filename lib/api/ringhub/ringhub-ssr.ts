/**
 * SSR helpers for Ring Hub calls.
 *
 * getServerSideProps blocks TTFB, so a hub call that hangs turns into a slow or
 * white page. The client's global 15s timeout is far too long for server render.
 * `raceHubCall` bounds any hub promise to a short deadline (~4s default) and
 * returns a sentinel on timeout/error instead of throwing, so the page can fall
 * back to local data or render an explicit "hub temporarily unavailable" state.
 */

export const HUB_SSR_TIMEOUT_MS = 4000;

/**
 * Distinguishable sentinel returned when a hub call times out or fails during SSR.
 * Callers check `=== HUB_TIMEOUT` to branch into a degraded/fallback render.
 */
export const HUB_TIMEOUT = Symbol('ring-hub-ssr-timeout');
export type HubTimeout = typeof HUB_TIMEOUT;

/**
 * Race a hub promise against a timeout. Resolves with the value on success, or
 * HUB_TIMEOUT on timeout OR on any thrown error (never rejects). This keeps SSR
 * fast and crash-free; the caller decides how to degrade.
 */
export async function raceHubCall<T>(
  promise: Promise<T>,
  timeoutMs: number = HUB_SSR_TIMEOUT_MS
): Promise<T | HubTimeout> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<T | HubTimeout>((resolve) => {
    timer = setTimeout(() => resolve(HUB_TIMEOUT), timeoutMs);
  });
  const guarded: Promise<T | HubTimeout> = promise.catch(() => HUB_TIMEOUT);
  try {
    return await Promise.race([guarded, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
