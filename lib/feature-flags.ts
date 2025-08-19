export function isFeatureEnabled(feature: 'threadrings'): boolean {
  switch (feature) {
    case 'threadrings':
      return process.env.THREADRINGS_ENABLED === 'true';
    default:
      return false;
  }
}

export const featureFlags = {
  threadrings: () => isFeatureEnabled('threadrings'),
} as const;