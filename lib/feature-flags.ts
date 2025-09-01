import { UserRole } from '@prisma/client'

export interface UserWithRole {
  id?: string;
  role: UserRole | string;
}

export function isFeatureEnabled(feature: 'ringhub' | 'template-islands' | 'template-compilation', user?: UserWithRole | null): boolean {
  switch (feature) {
    case 'ringhub':
      return process.env.NEXT_PUBLIC_USE_RING_HUB === 'true';
    case 'template-islands':
      return process.env.ENABLE_TEMPLATE_ISLANDS === 'true';
    case 'template-compilation':
      return process.env.ENABLE_TEMPLATE_COMPILATION === 'true';
    default:
      return false;
  }
}

// Gradual rollout function for template islands
export function shouldUseTemplateIslands(user?: UserWithRole | null): boolean {
  if (!isFeatureEnabled('template-islands', user)) return false;
  if (!user?.id) return false;
  
  // Gradual rollout: hash user ID and use percentage
  const rolloutPercent = parseInt(process.env.TEMPLATE_ISLAND_ROLLOUT_PERCENT || '0');
  if (rolloutPercent === 0) return false;
  if (rolloutPercent >= 100) return true;
  
  // Simple hash function for user ID
  let hash = 0;
  for (let i = 0; i < user.id.length; i++) {
    const char = user.id.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return Math.abs(hash) % 100 < rolloutPercent;
}

export const featureFlags = {
  ringhub: () => isFeatureEnabled('ringhub'),
  templateIslands: (user?: UserWithRole | null) => shouldUseTemplateIslands(user),
  templateCompilation: () => isFeatureEnabled('template-compilation'),
} as const;