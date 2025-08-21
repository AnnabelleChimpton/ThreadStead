// pages/api/users/[username]/badges.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/lib/db'
import { UserBadgePreferences } from '@/pages/api/users/me/badge-preferences'

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

    // Get user's badge preferences
    const userProfile = await db.profile.findUnique({
      where: { userId },
      select: { badgePreferences: true }
    })

    if (!userProfile?.badgePreferences) {
      return res.json({ badges: [] })
    }

    const preferences = JSON.parse(userProfile.badgePreferences as string) as UserBadgePreferences

    if (!preferences.showBadgesOnProfile || !preferences.selectedBadges?.length) {
      return res.json({ badges: [] })
    }

    // Get the actual badge data for selected badges
    const badgeIds = preferences.selectedBadges
      .filter(b => b.showOnProfile)
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map(b => b.badgeId)

    if (badgeIds.length === 0) {
      return res.json({ badges: [] })
    }

    const badges = await db.threadRingBadge.findMany({
      where: { id: { in: badgeIds } },
      include: {
        threadRing: {
          select: {
            id: true,
            name: true,
            slug: true,
            visibility: true
          }
        }
      }
    })

    // Filter out badges from private ThreadRings (unless user is viewing their own profile)
    // For now, we'll show all public badges
    const publicBadges = badges.filter(badge => badge.threadRing.visibility === 'public')

    // Sort badges according to user's display order preference
    const sortedBadges = publicBadges.map(badge => {
      const preference = preferences.selectedBadges.find(p => p.badgeId === badge.id)
      return {
        ...badge,
        displayOrder: preference?.displayOrder || 999
      }
    }).sort((a, b) => a.displayOrder - b.displayOrder)

    return res.json({ 
      badges: sortedBadges.map(badge => ({
        id: badge.id,
        title: badge.title,
        subtitle: badge.subtitle,
        imageUrl: badge.imageUrl,
        templateId: badge.templateId,
        backgroundColor: badge.backgroundColor,
        textColor: badge.textColor,
        threadRing: {
          id: badge.threadRing.id,
          name: badge.threadRing.name,
          slug: badge.threadRing.slug
        }
      }))
    })
  } catch (error) {
    console.error('Error fetching user badges:', error)
    return res.status(500).json({ error: 'Failed to fetch user badges' })
  }
}