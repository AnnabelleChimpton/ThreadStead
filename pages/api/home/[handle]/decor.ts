import { NextApiRequest, NextApiResponse } from 'next'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { handle } = req.query

  if (typeof handle !== 'string') {
    return res.status(400).json({ error: 'Invalid handle' })
  }

  try {
    // Find user by handle
    const userHandle = await prisma.handle.findFirst({
      where: { handle: handle.toLowerCase() },
      include: { user: true }
    })

    if (!userHandle) {
      return res.status(404).json({ error: 'User not found' })
    }

    const user = userHandle.user

    // Get user's ThreadRing badges
    const threadRingMemberships = await prisma.threadRingMember.findMany({
      where: { userId: user.id },
      include: {
        threadRing: {
          include: {
            badge: {
              where: { isActive: true }
            }
          }
        }
      },
      orderBy: { joinedAt: 'desc' }
    })

    const badges = threadRingMemberships
      .filter(membership => membership.threadRing.badge)
      .map(membership => ({
        id: membership.threadRing.badge!.id,
        title: membership.threadRing.badge!.title,
        subtitle: membership.threadRing.badge!.subtitle,
        imageUrl: membership.threadRing.badge!.imageUrl,
        backgroundColor: membership.threadRing.badge!.backgroundColor,
        textColor: membership.threadRing.badge!.textColor,
        threadRing: {
          id: membership.threadRing.id,
          name: membership.threadRing.name,
          slug: membership.threadRing.slug
        },
        role: membership.role,
        joinedAt: membership.joinedAt
      }))

    // Get seasonal decorations (placeholder for future implementation)
    const currentDate = new Date()
    const month = currentDate.getMonth() + 1 // 1-12
    
    let seasonalTheme = 'default'
    let seasonalDecorations: any[] = []

    // Determine seasonal theme
    if (month >= 3 && month <= 5) {
      seasonalTheme = 'spring'
      seasonalDecorations = [
        { type: 'flowers', position: { x: 10, y: 70 }, animation: 'gentle-sway' },
        { type: 'birds', position: { x: 80, y: 40 }, animation: 'fly-by' }
      ]
    } else if (month >= 6 && month <= 8) {
      seasonalTheme = 'summer'
      seasonalDecorations = [
        { type: 'sunshine', position: { x: 85, y: 15 }, animation: 'gentle-glow' },
        { type: 'bees', position: { x: 30, y: 60 }, animation: 'buzzing' }
      ]
    } else if (month >= 9 && month <= 11) {
      seasonalTheme = 'autumn'
      seasonalDecorations = [
        { type: 'falling-leaves', position: { x: 50, y: 30 }, animation: 'leaf-drift' },
        { type: 'pumpkin', position: { x: 20, y: 85 }, animation: 'none' }
      ]
    } else {
      seasonalTheme = 'winter'
      seasonalDecorations = [
        { type: 'snow', position: { x: 45, y: 25 }, animation: 'snow-fall' },
        { type: 'icicles', position: { x: 70, y: 35 }, animation: 'gentle-drip' }
      ]
    }

    // Get user's home config to check seasonal opt-in
    const homeConfig = await prisma.userHomeConfig.findUnique({
      where: { userId: user.id }
    })

    const shouldShowSeasonal = homeConfig?.seasonalOptIn || false

    return res.status(200).json({
      badges,
      seasonal: {
        theme: seasonalTheme,
        enabled: shouldShowSeasonal,
        decorations: shouldShowSeasonal ? seasonalDecorations : []
      },
      summary: {
        totalBadges: badges.length,
        leadershipBadges: badges.filter(badge => badge.role !== 'member').length,
        recentJoins: badges.filter(badge => {
          const joinDate = new Date(badge.joinedAt)
          const thirtyDaysAgo = new Date(Date.now() - (30 * 24 * 60 * 60 * 1000))
          return joinDate > thirtyDaysAgo
        }).length
      }
    })

  } catch (error) {
    console.error('Home decor API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  } finally {
    await prisma.$disconnect()
  }
}