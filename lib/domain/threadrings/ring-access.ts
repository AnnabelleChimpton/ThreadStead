/**
 * A Ring Hub ring as one resident sees it, and what the hub lets them do
 * with it. Every management page and route starts here.
 *
 * The ring is read signed as the viewer: the hub shows a PRIVATE ring only to
 * its ACTIVE members, and this site's own key isn't one. Nothing falls back
 * to the local mirror row, whose name, policies and description are
 * placeholders.
 *
 * Rights come from the hub, not RingHubOwnership (which can lag a hand-over):
 *  - the Host is whoever holds Ring.ownerDid. Older rings this site owns on
 *    the hub for a resident name that resident in RingHubOwnership, and the
 *    site signs for them.
 *  - moderators are the hub's `moderator` role.
 *  - a site admin acts as this site's DID, which the hub treats as an admin
 *    for settings, roles and the badge (its isAdmin override). Removing and
 *    inviting go by the signer's own role, so an admin gets no say there.
 */
import { db } from '@/lib/config/database/connection'
import { ApiError } from '@/lib/api/errors'
import {
  getPublicRingHubClient,
  getRingHubClient,
  RingHubClientError,
  type RingDescriptor,
  type RingHubClient,
} from '@/lib/api/ringhub/ringhub-client'
import {
  createAuthenticatedRingHubClient,
  type AuthenticatedRingHubClient,
} from '@/lib/api/ringhub/ringhub-user-operations'
import { RingHubAuthError, RingHubUnavailableError } from '@/lib/api/ringhub/ringhub-errors'

export interface RingViewer {
  id: string
  role?: string | null
}

export interface RingAccess {
  ring: RingDescriptor
  /** The viewer's DID on the hub, when they have one */
  viewerDid: string | null
  /** The ring's Host: Ring.ownerDid is theirs, or this site holds it for them */
  isHost: boolean
  /** Host or moderator: removes plain members, invites, runs prompts */
  isSteward: boolean
  /**
   * Who signs changes to the ring itself (settings, roles, badge): the viewer,
   * this site (a ring the site owns for them, or a site admin), or nobody.
   */
  manageAs: 'self' | 'site' | null
}

export const HUB_UNREACHABLE = "We can't reach Ring Hub right now. Try again in a minute."

/** The ring signed as `viewer` (null when it's not there for them), and their rights in it. */
export async function readRingAs(viewer: RingViewer | null, slug: string): Promise<RingAccess | null> {
  const key = viewer
    ? await db.userDID.findUnique({ where: { userId: viewer.id }, select: { did: true } })
    : null
  const member = viewer && key ? createAuthenticatedRingHubClient(viewer.id) : null
  // A stale or unresolvable key never hides a public ring: read it unsigned
  const ring = member
    ? await member.getRingAsMember(slug).catch((error) => {
        if (error instanceof RingHubAuthError) return getPublicRingHubClient().getRing(slug)
        throw error
      })
    : await getPublicRingHubClient().getRing(slug)
  if (!ring) return null

  const viewerDid = key?.did ?? null
  const ownHost = !!viewerDid && viewerDid === ring.ownerDid
  const siteHost = !ownHost && !!viewer && (await holdsSiteRing(ring, viewer.id))
  const isHost = ownHost || siteHost
  const isSteward = isHost || (!!member && !!viewerDid && (await moderates(member, ring, viewerDid)))
  const manageAs = ownHost ? 'self' : siteHost || viewer?.role === 'admin' ? 'site' : null

  return { ring, viewerDid, isHost, isSteward, manageAs }
}

/** A RingAccess, or the ApiError a route throws: 503 when the hub can't be read, 404 when the ring isn't there. */
export async function requireRingAs(viewer: RingViewer, slug: string): Promise<RingAccess> {
  let access: RingAccess | null
  try {
    access = await readRingAs(viewer, slug)
  } catch (error) {
    console.error(`Couldn't read ring ${slug} as ${viewer.id}:`, error)
    throw new ApiError(503, HUB_UNREACHABLE, { degraded: true })
  }
  if (!access) throw new ApiError(404, 'Ring not found')
  return access
}

type RingManager = Pick<RingHubClient, 'updateRing' | 'updateRingBadge' | 'updateMemberRole'>

/** The client that signs changes to the ring itself, or a 403 when the viewer may not make them. */
export function ringManager(access: RingAccess, viewerId: string): RingManager {
  if (access.manageAs === 'self') return createAuthenticatedRingHubClient(viewerId)
  if (access.manageAs === 'site') return getRingHubClient()
  throw new ApiError(403, 'Only the ring’s Host can change that.')
}

/** The hub's refusal of a write, in words for the person who asked. */
export function hubWriteError(error: unknown, signer: RingAccess['manageAs'] = 'self'): ApiError {
  if (error instanceof ApiError) return error
  if (error instanceof RingHubAuthError || error instanceof RingHubUnavailableError) {
    return new ApiError(503, HUB_UNREACHABLE, { degraded: true })
  }
  if (!(error instanceof RingHubClientError) || !error.status || error.status >= 500) {
    return new ApiError(502, "Ring Hub couldn't make that change. Try again in a minute.")
  }
  switch (error.status) {
    case 401:
      // The hub didn't accept the signer's key: its problem, not a signed-out viewer
      return new ApiError(503, HUB_UNREACHABLE, { degraded: true })
    case 403:
      return new ApiError(
        403,
        signer === 'site' ? "Ring Hub doesn't let this site change that ring." : "Ring Hub says you can't do that."
      )
    case 404:
      return new ApiError(404, 'Ring not found')
    default:
      return new ApiError(error.status, error.data?.message || error.message)
  }
}

/** A ring this site owns on the hub, held here for this resident. */
async function holdsSiteRing(ring: RingDescriptor, userId: string): Promise<boolean> {
  if (!process.env.THREADSTEAD_DID || ring.ownerDid !== process.env.THREADSTEAD_DID) return false
  const local = await db.ringHubOwnership.findUnique({ where: { ringSlug: ring.slug }, select: { ownerUserId: true } })
  return local?.ownerUserId === userId
}

/** The viewer holds the hub's moderator role. A failed read gives no rights. */
async function moderates(member: AuthenticatedRingHubClient, ring: RingDescriptor, viewerDid: string): Promise<boolean> {
  // A private ring read as its member says so; a public one doesn't
  const role = ring.currentUserMembership?.role
  if (role) return role === 'moderator' || role === 'owner'
  try {
    const { members } = await member.getRingMembers(ring.slug, { role: 'moderator', limit: 100 })
    return members.some((m) => m.actorDid === viewerDid && m.status === 'ACTIVE')
  } catch (error) {
    console.error(`Couldn't read ${ring.slug}'s moderators:`, error)
    return false
  }
}
