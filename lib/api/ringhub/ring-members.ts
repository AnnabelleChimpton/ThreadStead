/**
 * Reading a ring's whole member list from RingHub during server render.
 *
 * The hub's members list (GET /trp/rings/:slug/members, hub rings.ts) pages
 * newest first and defaults to 20, so a single unparameterised read silently
 * drops everyone past the 20 newest. This reads every page at the hub's max
 * size, under one SSR deadline and a page cap.
 */
import type { RingHubClient, RingMember } from './ringhub-client'
import { raceHubCall, HUB_TIMEOUT, HUB_SSR_TIMEOUT_MS, type HubTimeout } from './ringhub-ssr'

/** The hub's largest page (rings.ts caps limit at 100). */
export const MEMBER_PAGE_SIZE = 100
/** Pages read at most, so a huge ring can't hold up a page render. */
export const MAX_MEMBER_PAGES = 10

export type RingMembersRead = {
  members: RingMember[]
  /** The hub's count of members matching the read. */
  total: number
  /** False when the page cap or deadline cut the read short. */
  complete: boolean
}

/**
 * Every member of a ring, or HUB_TIMEOUT when the first page fails or misses
 * the deadline (the caller's existing fallback). A later page failing keeps
 * what was read and marks it incomplete rather than throwing it away.
 */
export async function readAllRingMembers(
  hub: Pick<RingHubClient, 'getRingMembers'>,
  slug: string,
  {
    deadlineMs = HUB_SSR_TIMEOUT_MS,
    maxPages = MAX_MEMBER_PAGES,
    now = Date.now,
  }: { deadlineMs?: number; maxPages?: number; now?: () => number } = {}
): Promise<RingMembersRead | HubTimeout> {
  const deadline = now() + deadlineMs
  const byDid = new Map<string, RingMember>()
  let total = 0

  for (let page = 0; page < maxPages; page++) {
    const remaining = deadline - now()
    if (page > 0 && remaining <= 0) break
    const result = await raceHubCall(
      hub.getRingMembers(slug, { limit: MEMBER_PAGE_SIZE, offset: page * MEMBER_PAGE_SIZE }),
      Math.max(remaining, 0)
    )
    if (result === HUB_TIMEOUT || !result || !Array.isArray(result.members)) {
      if (page === 0) return HUB_TIMEOUT
      break
    }
    total = typeof result.total === 'number' ? result.total : total
    // Offsets shift if someone joins mid-read; the same member can show up twice
    for (const m of result.members) if (!byDid.has(m.actorDid)) byDid.set(m.actorDid, m)
    if (!result.hasMore) return { members: [...byDid.values()], total, complete: true }
  }

  return { members: [...byDid.values()], total, complete: false }
}
