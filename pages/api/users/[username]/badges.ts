// pages/api/users/[username]/badges.ts
import { db } from '@/lib/config/database/connection'
import { getPublicRingHubClient } from '@/lib/api/ringhub/ringhub-client'
import { getUserDID } from '@/lib/api/did/server-did-client'
import { cached } from '@/lib/api/ringhub/ringhub-cache'
import { RingHubAuthError, RingHubUnavailableError } from '@/lib/api/ringhub/ringhub-errors'
import { apiHandler } from '@/lib/api/handler'
import { residentAccess, sendPrivateProfile } from '@/lib/domain/users/profile-access'

export default apiHandler(
  { methods: ['GET'], auth: 'optional' },
  async (req, res, { user: viewer }) => {
    const { username } = req.query

    if (typeof username !== 'string') {
      return res.status(400).json({ error: 'Invalid username' })
    }

    try {
      // Find user by primary handle
      const handle = await db.handle.findFirst({
        where: { 
          handle: username.toLowerCase(),
          host: process.env.SITE_HANDLE_DOMAIN || 'HomePageAgain'
        },
        include: { user: { include: { profile: { select: { visibility: true } } } } }
      })

      if (!handle?.user) {
        return res.status(404).json({ error: 'User not found' })
      }

      const userId = handle.user.id

      // Ring badges are part of the profile: same visibility and blocks
      const access = await residentAccess(viewer, userId, handle.user.profile?.visibility ?? null)
      if (!access.visible) return sendPrivateProfile(res, access.visibility)

      try {
        // Get user's DID for Ring Hub lookup
        const userDID = await getUserDID(userId)
        if (!userDID) {
          return res.json({ badges: [] })
        }

        const publicClient = getPublicRingHubClient()

        // Fetch badges from Ring Hub (cached, SWR)
        const ringHubBadges = await cached(
          `actor-badges:${userDID}`,
          30_000,
          5 * 60_000,
          () => publicClient.getActorBadges(userDID, { status: 'active', limit: 100 })
        )

        // Fetch all unique rings to get their current badge designs.
        // allSettled + per-ring cache: one slow/failed ring must not drop the whole badge list.
        const uniqueRingSlugs = [...new Set(ringHubBadges.badges.map(b => b.ring.slug))]
        const ringDataMap = new Map<string, any>()

        const ringResults = await Promise.allSettled(
          uniqueRingSlugs.map(slug =>
            cached(`ring:${slug}`, 30_000, 5 * 60_000, () => publicClient.getRing(slug))
          )
        )
        ringResults.forEach((result, i) => {
          if (result.status === 'fulfilled' && result.value) {
            ringDataMap.set(uniqueRingSlugs[i], result.value)
          }
        })

        // Transform Ring Hub badges to our expected format
        const transformedBadges = ringHubBadges.badges.map(badge => {
          const ring = ringDataMap.get(badge.ring.slug)
          const achievement = badge.badge.credentialSubject?.achievement
          return {
            id: badge.ring.slug,
            title: ring?.name || achievement?.name || badge.ring.name,
            subtitle: badge.membership.role !== 'member' ? (badge.membership.role.toLowerCase() === 'owner' ? 'curator' : badge.membership.role.toLowerCase()) : undefined,
            // Use the ring's current badge URL if available, fallback to achievement image
            imageUrl: ring?.badgeImageUrl || ring?.badgeImageHighResUrl || achievement?.image,
            templateId: undefined, // Not available from Ring Hub
            backgroundColor: '#4A90E2', // Default color
            textColor: '#FFFFFF', // Default color
            threadRing: {
              id: badge.ring.slug,
              name: badge.ring.name,
              slug: badge.ring.slug,
              description: ring?.description || achievement?.description,
              memberCount: ring?.memberCount || 0,
              visibility: badge.ring.visibility.toLowerCase() as 'public' | 'unlisted' | 'private'
            },
            userMembership: {
              role: (badge.membership.role.toLowerCase() === 'owner' ? 'curator' : badge.membership.role.toLowerCase()) as 'member' | 'moderator' | 'curator',
              joinedAt: badge.membership.joinedAt
            }
          }
        })

        return res.json({ badges: transformedBadges })
      } catch (error) {
        console.error('Ring Hub badges fetch failed:', error)
        if (error instanceof RingHubAuthError || error instanceof RingHubUnavailableError) {
          return res.status(503).json({ error: 'hub_unavailable', degraded: true })
        }
        return res.json({ badges: [] })
      }
    } catch (error) {
      console.error('Error fetching user badges:', error)
      return res.status(500).json({ error: 'Failed to fetch user badges' })
    }
  }
)
