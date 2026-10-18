// Who each chat user shares a block with (either direction), cached so
// typing events — one per keystroke burst — don't each cost a DB query.
// Like presence.ts, the store lives on globalThis: the socket server (loaded
// by Node) and the block API routes (webpack bundles) get separate module
// instances, and the routes need to clear entries when a block changes.
import { getUsersBlockedEitherWay } from "@/lib/domain/users/blocks";

/** How long a lookup is trusted if nothing clears it first. */
export const CHAT_BLOCK_CACHE_TTL_MS = 60 * 1000;
const SWEEP_AT_SIZE = 500;

interface Entry {
  ids: Promise<ReadonlySet<string>>;
  expiresAt: number;
}

declare global {
  var __threadsteadChatBlockCache: Map<string, Entry> | undefined;
}

const cache: Map<string, Entry> =
  globalThis.__threadsteadChatBlockCache ||
  (globalThis.__threadsteadChatBlockCache = new Map()); // userId -> blocked-either-way ids

/**
 * User ids this user blocked or was blocked by. Rejects if the lookup fails
 * (nothing is cached then), so callers can fail closed.
 */
export function getChatBlockedIds(userId: string): Promise<ReadonlySet<string>> {
  const now = Date.now();
  const cached = cache.get(userId);
  if (cached && cached.expiresAt > now) return cached.ids;

  if (cache.size >= SWEEP_AT_SIZE) {
    for (const [id, entry] of cache) if (entry.expiresAt <= now) cache.delete(id);
  }

  const entry: Entry = {
    ids: getUsersBlockedEitherWay(userId).then((ids) => new Set(ids)),
    expiresAt: now + CHAT_BLOCK_CACHE_TTL_MS,
  };
  entry.ids.catch(() => {
    if (cache.get(userId) === entry) cache.delete(userId);
  });
  cache.set(userId, entry);
  return entry.ids;
}

/** Drop cached lookups for these users; call after a block is made or removed. */
export function forgetChatBlocks(...userIds: Array<string | null | undefined>): void {
  for (const id of userIds) if (id) cache.delete(id);
}
