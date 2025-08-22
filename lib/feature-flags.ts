import { UserRole } from '@prisma/client'

export interface UserWithRole {
  role: UserRole | string;
}

export function isFeatureEnabled(feature: 'threadrings' | 'ringhub', user?: UserWithRole | null): boolean {
  switch (feature) {
    case 'threadrings':
      // Admin users always have access to ThreadRings (check both string and enum)
      if (user?.role === UserRole.admin || user?.role === 'admin') {
        return true;
      }
      // Otherwise check if globally enabled
      return process.env.NEXT_PUBLIC_THREADRINGS_ENABLED === 'true';
    case 'ringhub':
      return process.env.NEXT_PUBLIC_USE_RING_HUB === 'true';
    default:
      return false;
  }
}

export const featureFlags = {
  threadrings: (user?: UserWithRole | null) => isFeatureEnabled('threadrings', user),
  ringhub: () => isFeatureEnabled('ringhub'),
} as const;