// Shared presence tracking module
// Used by both server.js and API routes

interface UserPresence {
  id: string;
  primaryHandle: string;
  profile?: {
    displayName?: string;
    avatarUrl?: string;
    avatarThumbnailUrl?: string;
  };
  lastActiveAt: string;
}

interface PresenceUser {
  userId: string;
  handle: string;
  displayName?: string;
  avatarUrl?: string;
  lastActiveAt: string;
}

// In-memory presence tracking
const roomPresence = new Map<string, Map<string, UserPresence>>(); // roomId -> Map<userId, userData>

/**
 * Get presence list for a room
 */
export function getRoomPresence(roomId: string): PresenceUser[] {
  const presence = roomPresence.get(roomId);
  if (!presence) return [];

  return Array.from(presence.values()).map(user => ({
    userId: user.id,
    handle: user.primaryHandle,
    displayName: user.profile?.displayName,
    avatarUrl: user.profile?.avatarThumbnailUrl || user.profile?.avatarUrl,
    lastActiveAt: user.lastActiveAt,
  }));
}

/**
 * Add user to room presence
 */
export function addToPresence(roomId: string, user: UserPresence): void {
  if (!roomPresence.has(roomId)) {
    roomPresence.set(roomId, new Map());
  }

  const presence = roomPresence.get(roomId)!;
  presence.set(user.id, {
    ...user,
    lastActiveAt: new Date().toISOString(),
  });
}

/**
 * Remove user from room presence
 */
export function removeFromPresence(roomId: string, userId: string): void {
  const presence = roomPresence.get(roomId);
  if (presence) {
    presence.delete(userId);
  }
}

/**
 * Update user's last active timestamp
 */
export function updateLastActive(roomId: string, userId: string): void {
  const presence = roomPresence.get(roomId);
  if (presence && presence.has(userId)) {
    const user = presence.get(userId)!;
    user.lastActiveAt = new Date().toISOString();
  }
}
