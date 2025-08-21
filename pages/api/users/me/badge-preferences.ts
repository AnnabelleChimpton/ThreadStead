// pages/api/users/me/badge-preferences.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { getSessionUser } from '@/lib/auth-server'
import { db } from '@/lib/db'

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
    // Get user's ThreadRing memberships with badges
    const memberships = await db.threadRingMember.findMany({
      where: { userId },
      include: {
        threadRing: {
          include: {
            badge: true
          }
        }
      },
      orderBy: { joinedAt: 'desc' }
    })

    // Get existing preferences from user profile (stored as JSON)
    const userProfile = await db.profile.findUnique({
      where: { userId },
      select: { badgePreferences: true }
    })

    const existingPrefs = userProfile?.badgePreferences ? 
      JSON.parse(userProfile.badgePreferences as string) as UserBadgePreferences : 
      null

    // Build available badges list
    const availableBadges = memberships
      .filter(m => m.threadRing.badge) // Only rings with badges
      .map(m => ({
        threadRingId: m.threadRing.id,
        threadRingSlug: m.threadRing.slug,
        threadRingName: m.threadRing.name,
        badgeId: m.threadRing.badge!.id,
        badge: {
          title: m.threadRing.badge!.title,
          subtitle: m.threadRing.badge!.subtitle,
          imageUrl: m.threadRing.badge!.imageUrl,
          templateId: m.threadRing.badge!.templateId,
          backgroundColor: m.threadRing.badge!.backgroundColor,
          textColor: m.threadRing.badge!.textColor
        }
      }))

    // Apply existing preferences or create defaults
    const selectedBadges = existingPrefs?.selectedBadges || 
      availableBadges.slice(0, 3).map((badge, index) => ({
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

    // Validate user owns all selected ThreadRings
    const threadRingIds = preferences.selectedBadges.map(b => b.threadRingId)
    if (threadRingIds.length > 0) {
      const userMemberships = await db.threadRingMember.count({
        where: {
          userId,
          threadRingId: { in: threadRingIds }
        }
      })

      if (userMemberships !== threadRingIds.length) {
        return res.status(403).json({ error: 'Cannot select badges for ThreadRings you are not a member of' })
      }
    }

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