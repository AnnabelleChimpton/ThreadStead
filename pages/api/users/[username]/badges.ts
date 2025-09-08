// pages/api/users/[username]/badges.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/lib/db'
import { featureFlags } from '@/lib/utils/features/feature-flags'
import { getPublicRingHubClient } from '@/lib/api/ringhub/ringhub-client'
import { getUserDID } from '@/lib/api/did/server-did-client'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

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
      include: { user: true }
    })

    if (!handle?.user) {
      return res.status(404).json({ error: 'User not found' })
    }

    const userId = handle.user.id

    // Use Ring Hub only (no local fallback)
    if (!featureFlags.ringhub()) {
      return res.json({ badges: [] })
    }

    try {
      // Get user's DID for Ring Hub lookup
      const userDID = await getUserDID(userId)
      if (!userDID) {
        return res.json({ badges: [] })
      }

      const publicClient = getPublicRingHubClient()
      if (!publicClient) {
        return res.json({ badges: [] })
      }

      // Fetch badges from Ring Hub
      const ringHubBadges = await publicClient.getActorBadges(userDID, {
        status: 'active',
        limit: 100 // Get all active badges
      })

      // Fetch all unique rings to get their current badge designs
      const uniqueRingSlugs = [...new Set(ringHubBadges.badges.map(b => b.ring.slug))]
      const ringDataMap = new Map<string, any>()
      
      // Fetch ring data in parallel for all unique rings
      const ringFetchPromises = uniqueRingSlugs.map(async slug => {
        try {
          const ring = await publicClient.getRing(slug)
          if (ring) {
            ringDataMap.set(slug, ring)
          }
        } catch (error) {
          // Silently continue if ring data fetch fails
        }
      })
      
      await Promise.all(ringFetchPromises)

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
      return res.json({ badges: [] })
    }
  } catch (error) {
    console.error('Error fetching user badges:', error)
    return res.status(500).json({ error: 'Failed to fetch user badges' })
  }
}