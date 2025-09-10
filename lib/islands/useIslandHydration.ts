// React hook for island hydration management
import { useState, useEffect, useCallback, useRef } from 'react';
import type { HydrationContext, HydrationResult, HydrationError, IslandPerformanceMetrics } from './hydrator-types';

// Hook result interface
export interface UseIslandHydrationResult {
  hydrate: (context: HydrationContext) => Promise<void>;
  cleanup: () => Promise<void>;
  isHydrating: boolean;
  isHydrated: boolean;
  result: HydrationResult | null;
  errors: HydrationError[];
  supported: boolean;
}

// Options for the hook
export interface UseIslandHydrationOptions {
  autoCleanup?: boolean;
  onHydrationComplete?: (result: HydrationResult) => void;
  onHydrationError?: (errors: HydrationError[]) => void;
}

// Main hook for island hydration
export function useIslandHydration(options: UseIslandHydrationOptions = {}): UseIslandHydrationResult {
  const { autoCleanup = true, onHydrationComplete, onHydrationError } = options;
  
  const [isHydrating, setIsHydrating] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [result, setResult] = useState<HydrationResult | null>(null);
  const [errors, setErrors] = useState<HydrationError[]>([]);
  
  const hydrationRef = useRef<Promise<HydrationResult> | null>(null);
  const supported = typeof window !== 'undefined'; // Simplified check to avoid JSX import

  // Hydration function
  const hydrate = useCallback(async (context: HydrationContext) => {
    if (!supported) {
      console.warn('Island hydration not supported in this environment');
      return;
    }

    if (isHydrating) {
      console.warn('Hydration already in progress');
      return;
    }

    setIsHydrating(true);
    setErrors([]);

    try {
      // Import hydrator functions dynamically to avoid JSX import issues
      const { hydrateProfileIslands } = await import('./hydrator');
      
      // Prevent concurrent hydration attempts
      const hydrationPromise = hydrateProfileIslands(context);
      hydrationRef.current = hydrationPromise;

      const hydrationResult = await hydrationPromise;
      
      // Only update state if this is still the current hydration
      if (hydrationRef.current === hydrationPromise) {
        setResult(hydrationResult);
        setIsHydrated(true);
        setErrors(hydrationResult.errors);

        // Call completion callback
        onHydrationComplete?.(hydrationResult);
        
        // Call error callback if there were errors
        if (hydrationResult.errors.length > 0) {
          onHydrationError?.(hydrationResult.errors);
        }
      }

    } catch (error) {
      console.error('Island hydration failed:', error);
      
      const hydrationError: HydrationError = {
        islandId: 'hydration',
        componentType: 'system',
        error: error instanceof Error ? error : new Error(String(error))
      };
      
      setErrors([hydrationError]);
      onHydrationError?.([hydrationError]);
      
    } finally {
      setIsHydrating(false);
    }
  }, [supported, isHydrating, onHydrationComplete, onHydrationError]);

  // Cleanup function
  const cleanup = useCallback(async () => {
    if (isHydrated) {
      const { cleanupIslands } = await import('./hydrator');
      cleanupIslands();
      setIsHydrated(false);
      setResult(null);
      setErrors([]);
    }
  }, [isHydrated]);

  // Auto-cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoCleanup && isHydrated) {
        cleanup().catch(console.error);
      }
    };
  }, [autoCleanup, cleanup, isHydrated]);

  return {
    hydrate,
    cleanup,
    isHydrating,
    isHydrated,
    result,
    errors,
    supported
  };
}

// Simplified hook for common use cases
export function useProfileIslandHydration() {
  const [hydrationStatus, setHydrationStatus] = useState<'idle' | 'hydrating' | 'hydrated' | 'error'>('idle');
  
  const {
    hydrate,
    cleanup,
    isHydrating,
    result,
    errors,
    supported
  } = useIslandHydration({
    autoCleanup: true,
    onHydrationComplete: (result) => {
      // Hydration completed successfully
      setHydrationStatus('hydrated');
    },
    onHydrationError: (errors) => {
      console.error(`Failed to hydrate ${errors.length} islands`);
      setHydrationStatus('error');
    }
  });

  useEffect(() => {
    if (isHydrating) {
      setHydrationStatus('hydrating');
    }
  }, [isHydrating]);

  const hydrateProfile = useCallback(async (
    containerId: string,
    context: Omit<HydrationContext, 'containerId'>
  ) => {
    setHydrationStatus('hydrating');
    await hydrate({
      ...context,
      containerId
    });
  }, [hydrate]);

  return {
    hydrateProfile,
    cleanup,
    status: hydrationStatus,
    isSupported: supported,
    hydratedCount: result?.hydratedCount || 0,
    failedCount: result?.failedCount || 0,
    errors,
    performance: result ? {
      duration: result.endTime - result.startTime,
      startTime: result.startTime,
      endTime: result.endTime
    } : null
  };
}

// Hook for monitoring island performance
export function useIslandPerformance() {
  const [metrics, setMetrics] = useState<IslandPerformanceMetrics[]>([]);
  
  useEffect(() => {
    // Update metrics periodically in development
    if (process.env.NODE_ENV === 'development') {
      const interval = setInterval(() => {
        import('./hydrator').then(({ getIslandPerformanceMetrics }) => {
          setMetrics(getIslandPerformanceMetrics());
        }).catch(() => {
          // Ignore import errors in development
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, []);

  return {
    metrics,
    getTotalHydrationTime: () => metrics.reduce((sum, m) => sum + (m.hydrationTime || 0), 0),
    getSlowestIsland: () => metrics.sort((a, b) => (b.hydrationTime || 0) - (a.hydrationTime || 0))[0],
    getAverageHydrationTime: () => {
      const times = metrics.map(m => m.hydrationTime).filter(Boolean);
      return times.length > 0 ? times.reduce((sum, t) => sum + t, 0) / times.length : 0;
    }
  };
}