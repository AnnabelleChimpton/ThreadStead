export type BulletinCategory = 'LOOKING_FOR' | 'SHARING' | 'INVITATION' | 'HELP_FEEDBACK' | 'COMMUNITY_NOTICE';

export interface BulletinColorConfig {
  bg: string;
  cssVar: string;
  label: string;
}

/**
 * Maps bulletin categories to colors using existing CSS variables
 */
export function getBulletinColor(category: BulletinCategory): BulletinColorConfig {
  const colorMap: Record<BulletinCategory, BulletinColorConfig> = {
    LOOKING_FOR: {
      bg: 'bg-[#f6e27f]',
      cssVar: 'var(--ha-butter)',
      label: 'Looking For',
    },
    SHARING: {
      bg: 'bg-[#f2c6a0]',
      cssVar: 'var(--ha-header)',
      label: 'Sharing',
    },
    INVITATION: {
      bg: 'bg-[#9dbfd3]',
      cssVar: 'var(--ha-surface)',
      label: 'Invitation',
    },
    HELP_FEEDBACK: {
      bg: 'bg-[#d9a9b5]',
      cssVar: 'var(--ha-rose)',
      label: 'Help & Feedback',
    },
    COMMUNITY_NOTICE: {
      bg: 'bg-[#c0b7f9]',
      cssVar: 'var(--ha-lav)',
      label: 'Community Notice',
    },
  };

  return colorMap[category];
}

/**
 * Returns an array of all bulletin categories with their display labels
 * (excluding COMMUNITY_NOTICE for non-admins)
 */
export function getUserBulletinCategories(): Array<{ value: BulletinCategory; label: string }> {
  return [
    { value: 'LOOKING_FOR', label: 'Looking For' },
    { value: 'SHARING', label: 'Sharing' },
    { value: 'INVITATION', label: 'Invitation' },
    { value: 'HELP_FEEDBACK', label: 'Help & Feedback' },
  ];
}

/**
 * Returns all bulletin categories including admin-only ones
 */
export function getAllBulletinCategories(): Array<{ value: BulletinCategory; label: string }> {
  return [
    ...getUserBulletinCategories(),
    { value: 'COMMUNITY_NOTICE', label: 'Community Notice' },
  ];
}
