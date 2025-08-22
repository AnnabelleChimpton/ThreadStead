export function isFeatureEnabled(feature: 'threadrings' | 'ringhub'): boolean {
  switch (feature) {
    case 'threadrings':
      return process.env.NEXT_PUBLIC_THREADRINGS_ENABLED === 'true';
    case 'ringhub':
      return process.env.NEXT_PUBLIC_USE_RING_HUB === 'true';
    default:
      return false;
  }
}

export const featureFlags = {
  threadrings: () => isFeatureEnabled('threadrings'),
  ringhub: () => isFeatureEnabled('ringhub'),
} as const;