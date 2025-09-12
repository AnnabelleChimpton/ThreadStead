import { NextApiRequest, NextApiResponse } from 'next'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { username } = req.query

  if (typeof username !== 'string') {
    return res.status(400).json({ error: 'Invalid username' })
  }

  try {
    // Find user by handle
    const userHandle = await prisma.handle.findFirst({
      where: { handle: username.toLowerCase() },
      include: { user: true }
    })

    if (!userHandle) {
      return res.status(404).json({ error: 'User not found' })
    }

    const user = userHandle.user

    // Get user's ThreadRing memberships with lineage information
    const memberships = await prisma.threadRingMember.findMany({
      where: { userId: user.id },
      include: {
        threadRing: {
          include: {
            parent: {
              select: {
                id: true,
                name: true,
                slug: true
              }
            },
            children: {
              select: {
                id: true,
                name: true,
                slug: true
              }
            }
          }
        }
      },
      orderBy: [
        { threadRing: { lineageDepth: 'asc' } },
        { joinedAt: 'asc' }
      ]
    })

    // Transform to lineage format
    const lineage = memberships.map(membership => ({
      id: membership.threadRing.id,
      name: membership.threadRing.name,
      slug: membership.threadRing.slug,
      role: membership.role,
      joinedAt: membership.joinedAt.toISOString(),
      parentRing: membership.threadRing.parent ? {
        id: membership.threadRing.parent.id,
        name: membership.threadRing.parent.name,
        slug: membership.threadRing.parent.slug
      } : undefined,
      childRings: membership.threadRing.children.map(child => ({
        id: child.id,
        name: child.name,
        slug: child.slug
      })),
      lineageDepth: membership.threadRing.lineageDepth,
      lineagePath: membership.threadRing.lineagePath
    }))

    return res.status(200).json({
      lineage,
      summary: {
        totalRings: lineage.length,
        leadershipRoles: lineage.filter(ring => ring.role !== 'member').length,
        maxDepth: Math.max(...lineage.map(ring => ring.lineageDepth), 0),
        rootRings: lineage.filter(ring => ring.lineageDepth === 0).length
      }
    })

  } catch (error) {
    console.error('ThreadRing lineage API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  } finally {
    await prisma.$disconnect()
  }
}