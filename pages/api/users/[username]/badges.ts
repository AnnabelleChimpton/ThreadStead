// pages/api/users/[username]/badges.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/lib/db'
import { featureFlags } from '@/lib/feature-flags'
import { getPublicRingHubClient } from '@/lib/ringhub-client'
import { getUserDID } from '@/lib/server-did-client'
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

    // Use Ring Hub if enabled
    if (featureFlags.ringhub()) {
      try {
        // Get user's DID for Ring Hub lookup
        const userDID = await getUserDID(userId)
        if (!userDID) {
          console.log(`No DID found for user ${userId}, falling back to local badges`)
          // Fall through to local logic below
        } else {
          const publicClient = getPublicRingHubClient()
          if (!publicClient) {
            console.log('Ring Hub client not available, falling back to local badges')
            // Fall through to local logic below  
          } else {
            // Fetch badges from Ring Hub
            const ringHubBadges = await publicClient.getActorBadges(userDID, {
              status: 'active',
              limit: 100 // Get all active badges
            })

            // Transform Ring Hub badges to our expected format
            const transformedBadges = ringHubBadges.badges.map(badge => {
              const achievement = badge.badge.credentialSubject?.achievement
              return {
                id: badge.ring.slug,
                title: achievement?.name || badge.ring.name,
                subtitle: badge.membership.role !== 'member' ? badge.membership.role : undefined,
                imageUrl: achievement?.image,
                templateId: undefined, // Not available from Ring Hub
                backgroundColor: '#4A90E2', // Default color
                textColor: '#FFFFFF', // Default color
                threadRing: {
                  id: badge.ring.slug,
                  name: badge.ring.name,
                  slug: badge.ring.slug,
                  description: achievement?.description,
                  memberCount: 0, // Not available in badges endpoint
                  visibility: badge.ring.visibility.toLowerCase() as 'public' | 'unlisted' | 'private'
                },
                userMembership: {
                  role: badge.membership.role.toLowerCase() as 'member' | 'moderator' | 'curator',
                  joinedAt: badge.membership.joinedAt
                }
              }
            })

            return res.json({ badges: transformedBadges })
          }
        }
      } catch (error) {
        console.error('Ring Hub badges fetch failed:', error)
        // Fall through to local logic below
      }
    }

    // Local database fallback
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