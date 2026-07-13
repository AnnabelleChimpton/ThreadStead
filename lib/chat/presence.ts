// Shared presence tracking module
// Used by both server.js (which requires the sibling presence.js) and API routes
// (which import this file and get a separate webpack-bundled module instance).
// Both instances share one store via globalThis — without that, the API routes
// would read an always-empty map and presence endpoints would return nothing.

interface UserPresence {
  id: string;
  primaryHandle: string;
  profile?: {
    displayName?: string;
    avatarUrl?: string;
    avatarThumbnailUrl?: string;
  };
  lastActiveAt: string;
  status?: string;
  statusMessage?: string | null;
}

interface PresenceUser {
  userId: string;
  handle: string;
  displayName?: string;
  avatarUrl?: string;
  lastActiveAt: string;
  status: string;
  statusMessage: string | null;
}

declare global {
  // eslint-disable-next-line no-var
  var __threadsteadRoomPresence: Map<string, Map<string, UserPresence>> | undefined;
}

// In-memory presence tracking, shared across module instances
const roomPresence: Map<string, Map<string, UserPresence>> =
  globalThis.__threadsteadRoomPresence ||
  (globalThis.__threadsteadRoomPresence = new Map()); // roomId -> Map<userId, userData>

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
    status: user.status || 'online',
    statusMessage: user.statusMessage || null,
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
    status: 'online',
    statusMessage: null,
  });
}

/**
 * Remove user from room presence
 */
export function removeFromPresence(roomId: string, userId: string): void {
  const presence = roomPresence.get(roomId);
  if (presence) {
    presence.delete(userId);
    // Drop the room's map once empty so long-lived servers don't accumulate
    // an entry for every room ever visited.
    if (presence.size === 0) {
      roomPresence.delete(roomId);
    }
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

/**
 * Update user's status
 */
export function updateStatus(
  roomId: string,
  userId: string,
  status: string,
  statusMessage: string | null
): void {
  const presence = roomPresence.get(roomId);
  if (presence && presence.has(userId)) {
    const user = presence.get(userId)!;
    user.status = status;
    user.statusMessage = statusMessage;
  }
}
