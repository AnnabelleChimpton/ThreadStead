// Shared presence tracking module
// Used by both server.js and API routes

// In-memory presence tracking
const roomPresence = new Map(); // roomId -> Map<userId, userData>

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
  });
}

/**
 * Remove user from room presence
 */
function removeFromPresence(roomId, userId) {
  const presence = roomPresence.get(roomId);
  if (presence) {
    presence.delete(userId);
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

module.exports = {
  getRoomPresence,
  addToPresence,
  removeFromPresence,
  updateLastActive,
};
