import type { NextApiRequest, NextApiResponse } from 'next'
import { getSessionUser } from '@/lib/auth-server'
import { AuthenticatedRingHubClient } from '@/lib/api/ringhub/ringhub-user-operations'

interface BadgeUpdateRequest {
  badgeImageUrl?: string;
  badgeImageHighResUrl?: string;
  description?: string;
  criteria?: string;
  updateExistingBadges?: boolean;
}

interface BadgeUpdateResponse {
  success: boolean;
  message: string;
  badgeImageUrl?: string;
  badgeImageHighResUrl?: string;
  description?: string;
  criteria?: string;
  badgesUpdated?: number;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await getSessionUser(req)
  if (!user) {
    return res.status(401).json({ error: 'Authentication required' })
  }

  const { slug } = req.query
  if (typeof slug !== 'string') {
    return res.status(400).json({ error: 'Invalid ring slug' })
  }

  switch (req.method) {
    case 'PUT':
      return updateRingBadge(req, res, user.id, slug)
    default:
      return res.status(405).json({ error: 'Method not allowed' })
  }
}

async function updateRingBadge(
  req: NextApiRequest, 
  res: NextApiResponse, 
  userId: string,
  slug: string
) {
  try {
    const updateData = req.body as BadgeUpdateRequest

    // Validate the request data
    if (!updateData || typeof updateData !== 'object') {
      return res.status(400).json({ error: 'Invalid request body' })
    }

    // Validate image URLs if provided
    if (updateData.badgeImageUrl && !isValidHttpsUrl(updateData.badgeImageUrl)) {
      return res.status(400).json({ error: 'Badge image URL must be a valid HTTPS URL' })
    }

    if (updateData.badgeImageHighResUrl && !isValidHttpsUrl(updateData.badgeImageHighResUrl)) {
      return res.status(400).json({ error: 'High-res badge image URL must be a valid HTTPS URL' })
    }

    // Get user-authenticated RingHub client
    const authenticatedClient = new AuthenticatedRingHubClient(userId)

    // Update the badge via RingHub using the user's DID
    const result = await authenticatedClient.updateRingBadge(slug, updateData)

    return res.json(result)
  } catch (error) {
    console.error('Badge update error:', error)
    
    // Handle RingHub API errors
    if (error instanceof Error) {
      if (error.message.includes('403')) {
        return res.status(403).json({ error: 'Not authorized to update this ring badge. Only ring owners can update badges.' })
      }
      if (error.message.includes('404')) {
        return res.status(404).json({ error: 'ThreadRing not found' })
      }
    }

    return res.status(500).json({ error: 'Failed to update badge' })
  }
}

function isValidHttpsUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString)
    return url.protocol === 'https:'
  } catch {
    return false
  }
}