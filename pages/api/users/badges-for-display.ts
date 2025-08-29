// pages/api/users/badges-for-display.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/lib/db'
import { UserBadgePreferences } from '@/pages/api/users/me/badge-preferences'
import { featureFlags } from '@/lib/feature-flags'
import { getPublicRingHubClient } from '@/lib/ringhub-client'
import { getUserDID } from '@/lib/server-did-client'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { userId, context } = req.query

  if (typeof userId !== 'string' || typeof context !== 'string') {
    return res.status(400).json({ error: 'Invalid parameters' })
  }

  if (!['posts', 'comments'].includes(context)) {
    return res.status(400).json({ error: 'Invalid context' })
  }

  try {
    // Get user's badge preferences
    const userProfile = await db.profile.findUnique({
      where: { userId },
      select: { badgePreferences: true }
    })

    if (!userProfile?.badgePreferences) {
      return res.json({ badges: [] })
    }

    const preferences = JSON.parse(userProfile.badgePreferences as string) as UserBadgePreferences

    if (!preferences.selectedBadges?.length) {
      return res.json({ badges: [] })
    }

    // Filter badges based on context and user preferences
    const contextField = context === 'posts' ? 'showOnPosts' : 'showOnComments'
    const maxBadges = context === 'posts' ? preferences.maxBadgesOnPosts : preferences.maxBadgesOnComments

    const eligibleBadges = preferences.selectedBadges
      .filter(b => b[contextField])
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .slice(0, maxBadges)

    if (eligibleBadges.length === 0) {
      return res.json({ badges: [] })
    }

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

      // Fetch all user's badges from Ring Hub
      const ringHubBadges = await publicClient.getActorBadges(userDID, {
        status: 'active',
        limit: 100
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

      // Filter to only the badges that match user's selected preferences
      const selectedBadgeIds = new Set(eligibleBadges.map(b => b.badgeId))
      const filteredBadges = ringHubBadges.badges
        .filter(badge => {
          const badgeId = `${badge.ring.slug}-badge`
          return selectedBadgeIds.has(badgeId)
        })
        .map(badge => {
          const ring = ringDataMap.get(badge.ring.slug)
          const achievement = badge.badge.credentialSubject?.achievement
          const badgeId = `${badge.ring.slug}-badge`
          const preference = eligibleBadges.find(p => p.badgeId === badgeId)
          
          return {
            id: badgeId,
            title: ring?.name || achievement?.name || badge.ring.name,
            subtitle: badge.membership.role !== 'member' ? badge.membership.role : undefined,
            // Use the ring's current badge URL if available, fallback to achievement image
            imageUrl: ring?.badgeImageUrl || ring?.badgeImageHighResUrl || achievement?.image,
            templateId: undefined,
            backgroundColor: '#4A90E2',
            textColor: '#FFFFFF',
            threadRing: {
              id: badge.ring.slug,
              name: badge.ring.name,
              slug: badge.ring.slug
            },
            displayOrder: preference?.displayOrder || 999
          }
        })
        .sort((a, b) => a.displayOrder - b.displayOrder)

      return res.json({ 
        badges: filteredBadges.map(({ displayOrder, ...badge }) => badge)
      })
    } catch (error) {
      console.error('Ring Hub badges fetch failed:', error)
      return res.json({ badges: [] })
    }
  } catch (error) {
    console.error('Error fetching badges for display:', error)
    return res.status(500).json({ error: 'Failed to fetch badges' })
  }
}