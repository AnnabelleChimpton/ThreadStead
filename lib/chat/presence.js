// Shared presence tracking module
// Used by both server.js (plain require) and API routes (webpack-bundled copy).
// Those are two separate module instances, so the store itself must live on
// globalThis — otherwise the API routes read an always-empty map.

const roomPresence =
  globalThis.__threadsteadRoomPresence ||
  (globalThis.__threadsteadRoomPresence = new Map()); // roomId -> Map<userId, userData>

/**
 * Get presence list for a room
 */
function getRoomPresence(roomId) {
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
function addToPresence(roomId, user) {
  if (!roomPresence.has(roomId)) {
    roomPresence.set(roomId, new Map());
  }

  const presence = roomPresence.get(roomId);
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
function removeFromPresence(roomId, userId) {
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
function updateLastActive(roomId, userId) {
  const presence = roomPresence.get(roomId);
  if (presence && presence.has(userId)) {
    const user = presence.get(userId);
    user.lastActiveAt = new Date().toISOString();
  }
}

/**
 * Update user's status
 */
function updateStatus(roomId, userId, status, statusMessage) {
  const presence = roomPresence.get(roomId);
  if (presence && presence.has(userId)) {
    const user = presence.get(userId);
    user.status = status;
    user.statusMessage = statusMessage;
  }
}

module.exports = {
  getRoomPresence,
  addToPresence,
  removeFromPresence,
  updateLastActive,
  updateStatus,
};
