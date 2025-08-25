import { ThreadRingRole } from '@/types/threadrings';

export interface ModerationPermissions {
  canModerate: boolean;
  canPin: boolean;
  canAccept: boolean;
  canReject: boolean;
  canRemove: boolean;
}

/**
 * Hook to determine what moderation actions a user can perform
 * based on their role in the ThreadRing
 */
export function useModerationPermissions(
  userRole?: ThreadRingRole,
  isUserMember: boolean = false
): ModerationPermissions {
  
  // Only curators and moderators can perform moderation actions
  const canModerate = isUserMember && (userRole === 'curator' || userRole === 'moderator');
  
  return {
    canModerate,
    canPin: canModerate,         // Both curators and moderators can pin/unpin
    canAccept: canModerate,      // Both can accept pending posts
    canReject: canModerate,      // Both can reject pending posts  
    canRemove: canModerate,      // Both can remove published posts
  };
}

/**
 * Check if user can perform a specific moderation action
 */
export function canPerformModerationAction(
  action: string,
  userRole?: ThreadRingRole,
  isUserMember: boolean = false
): boolean {
  const permissions = useModerationPermissions(userRole, isUserMember);
  
  switch (action) {
    case 'accept':
      return permissions.canAccept;
    case 'reject':
      return permissions.canReject;
    case 'remove':
      return permissions.canRemove;
    case 'pin':
    case 'unpin':
      return permissions.canPin;
    default:
      return false;
  }
}