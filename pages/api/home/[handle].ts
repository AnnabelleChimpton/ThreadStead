import { NextApiRequest, NextApiResponse } from 'next'
import { PrismaClient } from '@prisma/client'
import { getSessionUser } from '../../../lib/auth/server'
import { z } from 'zod'

const prisma = new PrismaClient()

const updateConfigSchema = z.object({
  houseTemplate: z.enum(['cottage_v1', 'townhouse_v1', 'loft_v1', 'cabin_v1']).optional(),
  palette: z.enum(['thread_sage', 'charcoal_nights', 'pixel_petals', 'crt_glow', 'classic_linen']).optional(),
  bookSkin: z.string().optional(),
  seasonalOptIn: z.boolean().optional(),
  preferPixelHome: z.boolean().optional()
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
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

    if (req.method === 'GET') {
      // Get user home configuration
      let homeConfig = await prisma.userHomeConfig.findUnique({
        where: { userId: user.id }
      })

      // Create default config if none exists
      if (!homeConfig) {
        homeConfig = await prisma.userHomeConfig.create({
          data: {
            userId: user.id,
            houseTemplate: 'cottage_v1',
            palette: 'thread_sage',
            bookSkin: 'linen_v1',
            seasonalOptIn: false,
            preferPixelHome: false
          }
        })
      }

      return res.status(200).json({
        homeConfig: {
          houseTemplate: homeConfig.houseTemplate,
          palette: homeConfig.palette,
          bookSkin: homeConfig.bookSkin,
          seasonalOptIn: homeConfig.seasonalOptIn,
          preferPixelHome: homeConfig.preferPixelHome,
          updatedAt: homeConfig.updatedAt
        }
      })
    }

    if (req.method === 'PATCH') {
      // Update home configuration (owner only)
      const currentUser = await getSessionUser(req)
      if (!currentUser) {
        return res.status(401).json({ error: 'Authentication required' })
      }

      if (currentUser.id !== user.id) {
        return res.status(403).json({ error: 'Unauthorized: Can only update your own home' })
      }

      const validatedData = updateConfigSchema.parse(req.body)

      const updatedConfig = await prisma.userHomeConfig.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          houseTemplate: validatedData.houseTemplate || 'cottage_v1',
          palette: validatedData.palette || 'thread_sage',
          bookSkin: validatedData.bookSkin || 'linen_v1',
          seasonalOptIn: validatedData.seasonalOptIn || false,
          preferPixelHome: validatedData.preferPixelHome || false
        },
        update: validatedData
      })

      return res.status(200).json({
        homeConfig: {
          houseTemplate: updatedConfig.houseTemplate,
          palette: updatedConfig.palette,
          bookSkin: updatedConfig.bookSkin,
          seasonalOptIn: updatedConfig.seasonalOptIn,
          preferPixelHome: updatedConfig.preferPixelHome,
          updatedAt: updatedConfig.updatedAt
        }
      })
    }

    return res.status(405).json({ error: 'Method not allowed' })

  } catch (error) {
    console.error('Home config API error:', error)
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation error',
        details: error.issues
      })
    }

    return res.status(500).json({ error: 'Internal server error' })
  } finally {
    await prisma.$disconnect()
  }
}