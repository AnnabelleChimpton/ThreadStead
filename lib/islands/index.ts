// Islands hydration system exports
export * from './hydrator-types';
export * from './useIslandHydration';

// Re-export key functions (import dynamically to avoid JSX issues)
export const hydrateProfileIslands = async (context: import('./hydrator-types').HydrationContext) => {
  const { hydrateProfileIslands: fn } = await import('./hydrator');
  return fn(context);
};

export const cleanupIslands = async () => {
  const { cleanupIslands: fn } = await import('./hydrator');
  return fn();
};

export const isIslandsSupported = async () => {
  const { isIslandsSupported: fn } = await import('./hydrator');
  return fn();
};

export const trackIslandPerformance = async (islandId: string, componentType: string) => {
  const { trackIslandPerformance: fn } = await import('./hydrator');
  return fn(islandId, componentType);
};

export const getIslandPerformanceMetrics = async () => {
  const { getIslandPerformanceMetrics: fn } = await import('./hydrator');
  return fn();
};

export const debugIslands = async () => {
  const { debugIslands: fn } = await import('./hydrator');
  return fn();
};

export type {
  UseIslandHydrationResult,
  UseIslandHydrationOptions
} from './useIslandHydration';

export {
  useIslandHydration,
  useProfileIslandHydration,
  useIslandPerformance
} from './useIslandHydration';