import { UserRole } from '@prisma/client'

export interface UserWithRole {
  role: UserRole | string;
}

export function isFeatureEnabled(feature: 'ringhub', user?: UserWithRole | null): boolean {
  switch (feature) {
    case 'ringhub':
      return process.env.NEXT_PUBLIC_USE_RING_HUB === 'true';
    default:
      return false;
  }
}

export const featureFlags = {
  ringhub: () => isFeatureEnabled('ringhub'),
} as const;