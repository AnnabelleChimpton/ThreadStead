/**
 * What the ring's Manage page (pages/tr/[slug]/manage.tsx) shows each
 * person, and the data behind its tabs. Rights come from ring-access.ts,
 * so they match what Ring Hub lets each of them do:
 *  - the Host: Ring, People, Badge, Stops, Prompts;
 *  - moderators: People and Prompts (removing plain members, inviting);
 *  - a site admin: what the hub lets this site do (settings, roles, badge,
 *    hand-over), plus whatever their own role in the ring gives them.
 * Stops are this site's own data, so they're the Host's alone.
 */
import type { PrismaClient, RingOutsideSites } from '@prisma/client'
import type { RingDescriptor, RingHubClient } from '@/lib/api/ringhub/ringhub-client'
import { readAllRingMembers } from '@/lib/api/ringhub/ring-members'
import { HUB_TIMEOUT } from '@/lib/api/ringhub/ringhub-ssr'
import { transformRingMembersBatchWithUserResolution } from '@/lib/api/ringhub/ringhub-transformers'
import type { RingAccess } from '@/lib/domain/threadrings/ring-access'
import { badgeHandlesFor } from '@/lib/pixel-homes/house-badge'
import { busiestDoorways } from './counts'
import { siteAddress } from './sites'
import { ringSiteRows } from './stops'
import { outsideSitesRule } from './walk'

export const MANAGE_TABS = ['ring', 'people', 'badge', 'stops', 'prompts'] as const
export type ManageTab = (typeof MANAGE_TABS)[number]

export interface ManageRights {
  /** The tabs this person gets, in order; none means the page is a 404 for them */
  tabs: ManageTab[]
  /** Change members' roles: whoever signs ring changes (the Host, or a site admin) */
  roles: boolean
  /** Remove: the Host anyone, a moderator plain members */
  remove: 'any' | 'members' | null
  /** Invite: the Host and moderators */
  invite: boolean
  /** Hand the ring over: the Host, or a site admin */
  handOver: boolean
  /** Delete it (only when they're its only member): the Host */
  delete: boolean
}

export function manageRights(access: RingAccess, viewerRole: string | null | undefined): ManageRights {
  const settings = access.manageAs !== null
  const tabs = MANAGE_TABS.filter((tab) =>
    tab === 'ring' || tab === 'badge'
      ? settings
      : tab === 'people'
        ? settings || access.isSteward
        : tab === 'stops'
          ? access.isHost
          : access.isSteward
  )
  return {
    tabs,
    roles: settings,
    remove: access.isHost ? 'any' : access.isSteward ? 'members' : null,
    invite: access.isSteward,
    handOver: access.isHost || viewerRole === 'admin',
    delete: access.isHost,
  }
}

/** The tab to open: the one asked for when this person has it, else their first. */
export function openingTab(asked: unknown, tabs: ManageTab[]): ManageTab {
  return tabs.find((tab) => tab === asked) ?? tabs[0]
}

export interface ManageMember {
  /** Their id here, or their DID when they're from another instance (the members route takes either) */
  key: string
  name: string
  /** "@cat", or "@fen@elsewhere.example" for someone from another instance */
  handle: string | null
  profileHref: string | null
  role: 'host' | 'moderator' | 'member'
  joinedAt: string
  avatarUrl: string | null
  /** Their pixel home's handle, when the viewer may see it: shows the house badge */
  homeHandle: string | null
  /** Has an account here, so the ring can be handed to them */
  local: boolean
}

/**
 * Everyone in the ring, read as the viewer (so a private ring's people show),
 * hosts first. HUB_TIMEOUT when the hub doesn't answer: no local fallback.
 */
export async function ringPeople(
  db: PrismaClient,
  { reader, ring, viewerId, host }: { reader: Pick<RingHubClient, 'getRingMembers'>; ring: RingDescriptor; viewerId: string; host: string }
): Promise<ManageMember[] | typeof HUB_TIMEOUT> {
  const read = await readAllRingMembers(reader, ring.slug)
  if (read === HUB_TIMEOUT) return HUB_TIMEOUT

  // A ring this site holds on the hub for a resident: the site isn't a person, the resident is the host
  const siteDid = process.env.THREADSTEAD_DID
  const heldFor =
    siteDid && ring.ownerDid === siteDid
      ? (await db.ringHubOwnership.findUnique({ where: { ringSlug: ring.slug }, select: { ownerUserId: true } }))?.ownerUserId
      : null
  const members = read.members.filter((m) => m.actorDid !== siteDid && (!m.status || m.status === 'ACTIVE'))
  const resolved = await transformRingMembersBatchWithUserResolution(members, ring.slug, db, viewerId)

  let homes = new Map<string, string>()
  try {
    homes = await badgeHandlesFor(db, resolved.map((m) => m.user.id), viewerId, host)
  } catch (error) {
    console.error('House badges skipped:', error)
  }

  const people = resolved.map((m): ManageMember => {
    const local = !m.user.id.startsWith('did:')
    const own = m.user.handles.find((h) => h.host === host)
    const theirs = m.user.handles[0]
    const handle = own ? `@${own.handle}` : theirs ? `@${theirs.handle}@${theirs.host}` : null
    const role = m.role === 'curator' || m.user.id === heldFor ? 'host' : m.role === 'moderator' ? 'moderator' : 'member'
    return {
      key: m.user.id,
      name: m.user.displayName || theirs?.handle || 'Someone',
      handle,
      profileHref: own ? `/resident/${encodeURIComponent(own.handle)}` : m.user.profileUrl && /^https?:\/\//i.test(m.user.profileUrl) ? m.user.profileUrl : null,
      role,
      joinedAt: m.joinedAt,
      avatarUrl: m.user.avatarUrl ?? null,
      homeHandle: homes.get(m.user.id) ?? null,
      local,
    }
  })
  const order = { host: 0, moderator: 1, member: 2 }
  return people.sort((a, b) => order[a.role] - order[b.role] || a.joinedAt.localeCompare(b.joinedAt))
}

export type StopStatus = 'listed' | 'pending' | 'hidden'

export interface StopsData {
  rule: RingOutsideSites
  /** No rule saved: it follows how people join */
  ruleIsDefault: boolean
  /** Strips are for public rings only */
  isPublic: boolean
  rows: Array<{
    stopId: string
    status: StopStatus
    reason: string | null
    name: string
    site: { id: string; url: string; title: string | null; address: string }
  }>
  busiest: Array<{ address: string; clicks: number }>
}

/** Members' own sites in the ring, for the Host (Manage › Stops). */
export async function ringStopsData(
  db: PrismaClient,
  { ring, host, now = new Date() }: { ring: Pick<RingDescriptor, 'slug' | 'joinPolicy' | 'visibility'>; host: string; now?: Date }
): Promise<StopsData> {
  const rows = await ringSiteRows(db, ring.slug)
  const people = await db.user.findMany({
    where: { id: { in: rows.map((r) => r.userId) } },
    select: { id: true, handles: { where: { host }, select: { handle: true }, take: 1 }, profile: { select: { displayName: true } } },
  })
  const who = new Map(people.map((p) => [p.id, p]))
  const addressOf = new Map(rows.map((r) => [r.site.id, siteAddress(r.site.url)]))
  const busiest = await busiestDoorways(db, ring.slug, new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)))
  const setting = await db.ringSiteSettings.findUnique({ where: { ringSlug: ring.slug } })
  return {
    rule: await outsideSitesRule(db, ring),
    ruleIsDefault: !setting,
    isPublic: ring.visibility === 'PUBLIC',
    rows: rows.map((r) => {
      const person = who.get(r.userId)
      return {
        stopId: r.id,
        status: r.status,
        reason: r.reason,
        name: person?.profile?.displayName || person?.handles[0]?.handle || 'A member',
        site: { id: r.site.id, url: r.site.url, title: r.site.title, address: addressOf.get(r.site.id)! },
      }
    }),
    busiest: busiest.flatMap((b) => (addressOf.has(b.siteId) ? [{ address: addressOf.get(b.siteId)!, clicks: b.clicks }] : [])),
  }
}
