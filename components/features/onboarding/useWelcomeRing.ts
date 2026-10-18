import { useEffect, useState } from 'react';

export const WELCOME_RING_PATH = '/tr/welcome';

/**
 * Whether the Welcome Ring exists: true, false (the hub says it doesn't), or
 * null when we couldn't tell (hub down, offline). Onboarding links use this
 * so they don't send newcomers to "ThreadRing not found".
 */
export async function welcomeRingExists(): Promise<boolean | null> {
  try {
    const res = await fetch('/api/threadrings/welcome');
    if (res.ok) return true;
    return res.status === 404 ? false : null;
  } catch {
    return null;
  }
}

/** True only once the ring is known to be missing, so links don't flicker. */
export function useWelcomeRingMissing(): boolean {
  const [missing, setMissing] = useState(false);
  useEffect(() => {
    let alive = true;
    welcomeRingExists().then((exists) => {
      if (alive) setMissing(exists === false);
    });
    return () => { alive = false; };
  }, []);
  return missing;
}
