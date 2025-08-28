// pages/api/users/me/badge-preferences.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { getSessionUser } from '@/lib/auth-server'
import { db } from '@/lib/db'
import { featureFlags } from '@/lib/feature-flags'
import { getPublicRingHubClient } from '@/lib/ringhub-client'
import { getUserDID } from '@/lib/server-did-client'

export type UserBadgePreferences = {
  selectedBadges: Array<{
    threadRingId: string
    threadRingSlug: string
    threadRingName: string
    badgeId: string
    displayOrder: number
    showOnProfile: boolean
    showOnPosts: boolean
    showOnComments: boolean
  }>
  maxBadgesOnPosts: number
  maxBadgesOnComments: number
  showBadgesOnProfile: boolean
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await getSessionUser(req)
  if (!user) {
    return res.status(401).json({ error: 'Authentication required' })
  }

  switch (req.method) {
    case 'GET':
      return getBadgePreferences(req, res, user.id)
    case 'PUT':
      return updateBadgePreferences(req, res, user.id)
    default:
      return res.status(405).json({ error: 'Method not allowed' })
  }
}

async function getBadgePreferences(req: NextApiRequest, res: NextApiResponse, userId: string) {
  try {
    // Get existing preferences from user profile (stored as JSON)
    const userProfile = await db.profile.findUnique({
      where: { userId },
      select: { badgePreferences: true }
    })

    const existingPrefs = userProfile?.badgePreferences ? 
      JSON.parse(userProfile.badgePreferences as string) as UserBadgePreferences : 
      null

    let availableBadges: any[] = []

    // Use Ring Hub only (no local fallback)
    if (!featureFlags.ringhub()) {
      // Ring Hub not enabled, return empty badges
      return res.json({
        preferences: {
          selectedBadges: existingPrefs?.selectedBadges || [],
          maxBadgesOnPosts: existingPrefs?.maxBadgesOnPosts || 2,
          maxBadgesOnComments: existingPrefs?.maxBadgesOnComments || 1,
          showBadgesOnProfile: existingPrefs?.showBadgesOnProfile ?? true
        },
        availableBadges: []
      })
    }

    try {
      // Get user's DID for Ring Hub lookup
      const userDID = await getUserDID(userId)
      if (!userDID) {
        return res.json({
          preferences: {
            selectedBadges: existingPrefs?.selectedBadges || [],
            maxBadgesOnPosts: existingPrefs?.maxBadgesOnPosts || 2,
            maxBadgesOnComments: existingPrefs?.maxBadgesOnComments || 1,
            showBadgesOnProfile: existingPrefs?.showBadgesOnProfile ?? true
          },
          availableBadges: []
        })
      }

      const publicClient = getPublicRingHubClient()
      if (!publicClient) {
        return res.json({
          preferences: {
            selectedBadges: existingPrefs?.selectedBadges || [],
            maxBadgesOnPosts: existingPrefs?.maxBadgesOnPosts || 2,
            maxBadgesOnComments: existingPrefs?.maxBadgesOnComments || 1,
            showBadgesOnProfile: existingPrefs?.showBadgesOnProfile ?? true
          },
          availableBadges: []
        })
      }

      // Note: We can't use getMyMemberships() here since we're using the public client
      // The badges endpoint should include all the membership info we need

      // Fetch badges from Ring Hub
      // Use 'active' status to get all active badges (should include member, curator, owner roles)
      const ringHubBadges = await publicClient.getActorBadges(userDID, {
        status: 'active',
        limit: 100 // Get all active badges for this user
      })

      // Debug: Log badge data to understand what's being returned
      console.log(`[Badge Debug] User DID: ${userDID}`)
      console.log(`[Badge Debug] Total badges returned: ${ringHubBadges.badges.length}`)
      console.log(`[Badge Debug] Badge details:`, ringHubBadges.badges.map(b => ({ 
        ring: b.ring.name, 
        ringSlug: b.ring.slug,
        visibility: b.ring.visibility,
        role: b.membership.role,
        status: b.membership.status,
        joinedAt: b.membership.joinedAt,
        isRevoked: b.isRevoked
      })))
      
      // Additional debugging: Check if we're missing any owner/curator roles
      const memberCount = ringHubBadges.badges.filter(b => b.membership.role === 'member').length
      const ownerCount = ringHubBadges.badges.filter(b => b.membership.role === 'owner').length  
      const curatorCount = ringHubBadges.badges.filter(b => b.membership.role === 'curator').length
      const moderatorCount = ringHubBadges.badges.filter(b => b.membership.role === 'moderator').length
      console.log(`[Badge Debug] Role breakdown: member=${memberCount}, owner=${ownerCount}, curator=${curatorCount}, moderator=${moderatorCount}`)
      
      const privateRings = ringHubBadges.badges.filter(b => b.ring.visibility === 'PRIVATE')
      if (privateRings.length > 0) {
        console.log(`[Badge Debug] Found ${privateRings.length} badges from PRIVATE rings (these should NOT be filtered out by our client)`)
      }

      // Transform Ring Hub badges to our expected format
      availableBadges = ringHubBadges.badges.map(badge => {
        const achievement = badge.badge.credentialSubject?.achievement
        const badgeId = `${badge.ring.slug}-badge` // Create a consistent badge ID
        return {
          threadRingId: badge.ring.slug,
          threadRingSlug: badge.ring.slug,
          threadRingName: badge.ring.name,
          badgeId: badgeId,
          badge: {
            title: achievement?.name || badge.ring.name,
            subtitle: badge.membership.role !== 'member' ? badge.membership.role : undefined,
            imageUrl: achievement?.image,
            templateId: undefined, // Not available from Ring Hub
            backgroundColor: '#4A90E2', // Default color
            textColor: '#FFFFFF' // Default color
          }
        }
      })
    } catch (error) {
      console.error('Ring Hub badges fetch failed:', error)
      // Return empty badges on error
      return res.json({
        preferences: {
          selectedBadges: existingPrefs?.selectedBadges || [],
          maxBadgesOnPosts: existingPrefs?.maxBadgesOnPosts || 2,
          maxBadgesOnComments: existingPrefs?.maxBadgesOnComments || 1,
          showBadgesOnProfile: existingPrefs?.showBadgesOnProfile ?? true
        },
        availableBadges: []
      })
    }

    // Apply existing preferences or create defaults
    const selectedBadges = existingPrefs?.selectedBadges || 
      availableBadges.map((badge, index) => ({
        threadRingId: badge.threadRingId,
        threadRingSlug: badge.threadRingSlug,
        threadRingName: badge.threadRingName,
        badgeId: badge.badgeId,
        displayOrder: index,
        showOnProfile: true,
        showOnPosts: index < 2, // Show first 2 on posts by default
        showOnComments: index < 1 // Show first 1 on comments by default
      }))

    const preferences: UserBadgePreferences = {
      selectedBadges,
      maxBadgesOnPosts: existingPrefs?.maxBadgesOnPosts || 2,
      maxBadgesOnComments: existingPrefs?.maxBadgesOnComments || 1,
      showBadgesOnProfile: existingPrefs?.showBadgesOnProfile ?? true
    }

    return res.json({
      preferences,
      availableBadges
    })
  } catch (error) {
    console.error('Error fetching badge preferences:', error)
    return res.status(500).json({ error: 'Failed to fetch badge preferences' })
  }
}

async function updateBadgePreferences(req: NextApiRequest, res: NextApiResponse, userId: string) {
  try {
    const { preferences } = req.body as { preferences: UserBadgePreferences }

    if (!preferences) {
      return res.status(400).json({ error: 'Badge preferences required' })
    }

    // Validate preferences structure
    if (!Array.isArray(preferences.selectedBadges)) {
      return res.status(400).json({ error: 'Selected badges must be an array' })
    }

    // When using Ring Hub, we trust the badges returned by the API
    // No need to validate membership since Ring Hub only returns badges the user has

    // Update user profile with preferences
    await db.profile.upsert({
      where: { userId },
      create: {
        userId,
        badgePreferences: JSON.stringify(preferences)
      },
      update: {
        badgePreferences: JSON.stringify(preferences)
      }
    })

    return res.json({ success: true, preferences })
  } catch (error) {
    console.error('Error updating badge preferences:', error)
    return res.status(500).json({ error: 'Failed to update badge preferences' })
  }
}