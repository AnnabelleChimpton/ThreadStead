/**
 * Types for User Quick-View Modal
 * Used to display user information in a popup/modal throughout the app
 */

export interface UserQuickViewStats {
  followers: number;
  following: number;
  posts: number;
  mutualFriends: number;
}

export interface UserQuickViewBadge {
  id: string;
  name: string;
  imageUrl: string;
  description?: string;
}

export type RelationshipStatus = 'owner' | 'friends' | 'following' | 'followed_by' | 'none';

export interface UserQuickViewData {
  userId: string;
  username: string;
  displayName: string;
  primaryHandle: string;
  avatarUrl: string | null;
  bio: string | null;
  relationship: RelationshipStatus;
  /** null when the viewer can't see the profile */
  stats: UserQuickViewStats | null;
  badges: UserQuickViewBadge[];
  /** They have a pixel home the viewer may see (lib/domain/users/profile-access) */
  hasPixelHome: boolean;
  /** Set when the viewer can't see the profile (a block reads as private) */
  visibility?: 'private' | 'followers' | 'friends';
}

export interface UserQuickViewResponse {
  success: boolean;
  data?: UserQuickViewData;
  error?: string;
}
