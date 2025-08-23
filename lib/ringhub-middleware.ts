import { NextApiRequest, NextApiResponse } from 'next'
import { featureFlags } from '@/lib/feature-flags'

/**
 * Middleware to ensure Ring Hub feature is enabled
 * Usage: export default withRingHubFeature(handler)
 */
export function withRingHubFeature<T = any>(
  handler: (req: NextApiRequest, res: NextApiResponse<T>) => Promise<void> | void
) {
  return async (req: NextApiRequest, res: NextApiResponse<T>) => {
    if (!featureFlags.ringhub()) {
      return res.status(404).json({ error: "Ring Hub feature not available" } as T);
    }
    
    return handler(req, res);
  };
}

/**
 * Check if Ring Hub should be used instead of local ThreadRings
 * This will be used during the migration period
 */
export function shouldUseRingHub(): boolean {
  return featureFlags.ringhub();
}

/**
 * Check if local ThreadRings should be used
 * During migration, some operations might need to fall back to local
 */
export function shouldUseLocalThreadRings(): boolean {
  return featureFlags.threadrings() && !featureFlags.ringhub();
}

/**
 * Get the appropriate ThreadRing system to use
 * Returns 'ringhub' | 'local' | 'none'
 */
export function getThreadRingSystem(user?: any): 'ringhub' | 'local' | 'none' {
  if (featureFlags.ringhub()) {
    return 'ringhub';
  }
  if (featureFlags.threadrings(user)) {
    return 'local';
  }
  return 'none';
}

/**
 * Middleware for mixed ThreadRing/Ring Hub operations
 * Allows both systems to be available during migration
 */
export function withThreadRingSupport<T = any>(
  handler: (
    req: NextApiRequest, 
    res: NextApiResponse<T>,
    system: 'ringhub' | 'local'
  ) => Promise<void> | void
) {
  return async (req: NextApiRequest, res: NextApiResponse<T>) => {
    // Import here to avoid circular dependency
    const { getSessionUser } = await import('@/lib/auth-server');
    
    // Get user context for feature flag check
    const user = await getSessionUser(req);
    const system = getThreadRingSystem(user);
    
    if (system === 'none') {
      return res.status(404).json({ error: "ThreadRing features not available" } as T);
    }
    
    return handler(req, res, system);
  };
}