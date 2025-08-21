// pages/api/users/badges-for-display.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/lib/db'
import { UserBadgePreferences } from '@/pages/api/users/me/badge-preferences'

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

    // Get the actual badge data
    const badgeIds = eligibleBadges.map(b => b.badgeId)

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

    // Filter out badges from private ThreadRings and sort by display order
    const publicBadges = badges
      .filter(badge => badge.threadRing.visibility === 'public')
      .map(badge => {
        const preference = eligibleBadges.find(p => p.badgeId === badge.id)
        return {
          ...badge,
          displayOrder: preference?.displayOrder || 999
        }
      })
      .sort((a, b) => a.displayOrder - b.displayOrder)

    return res.json({ 
      badges: publicBadges.map(badge => ({
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
    console.error('Error fetching badges for display:', error)
    return res.status(500).json({ error: 'Failed to fetch badges' })
  }
}