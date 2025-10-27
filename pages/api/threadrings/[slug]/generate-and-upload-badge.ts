import type { NextApiRequest, NextApiResponse } from 'next'
import { getSessionUser } from '@/lib/auth/server'
import { generateBadge } from '@/lib/badge-generator'
import { uploadBadgeImage } from '@/lib/badge-uploader'
import { db } from '@/lib/config/database/connection'
import { withCsrfProtection } from "@/lib/api/middleware/withCsrfProtection";
import { withRateLimit } from "@/lib/api/middleware/withRateLimit";

interface BadgeGenerationRequest {
  title: string;
  subtitle?: string;
  templateId?: string;
  backgroundColor?: string;
  textColor?: string;
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await getSessionUser(req)
  if (!user) {
    return res.status(401).json({ error: 'Authentication required' })
  }

  const { slug } = req.query
  if (typeof slug !== 'string') {
    return res.status(400).json({ error: 'Invalid ring slug' })
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { title, subtitle, templateId, backgroundColor, textColor } = req.body as BadgeGenerationRequest

    // Validate input
    if (!title || title.trim().length === 0) {
      return res.status(400).json({ error: 'Badge title is required' })
    }

    // Check if user owns this ThreadRing
    const ringHubOwnership = await db.ringHubOwnership.findUnique({
      where: { ringSlug: slug }
    })

    if (!ringHubOwnership || ringHubOwnership.ownerUserId !== user.id) {
      return res.status(403).json({ error: 'Not authorized to manage this ThreadRing badge' })
    }

    // Step 1: Generate the badge image
    const generatedBadge = await generateBadge({
      title: title.trim(),
      subtitle: subtitle?.trim(),
      templateId,
      backgroundColor,
      textColor
    })

    if (!generatedBadge.imageDataUrl) {
      return res.status(500).json({ error: 'Failed to generate badge image' })
    }

    // Step 2: Upload to S3
    const uploadResult = await uploadBadgeImage(generatedBadge.imageDataUrl, slug)

    return res.json({
      badgeImageUrl: uploadResult.badgeImageUrl,
      badgeImageHighResUrl: uploadResult.badgeImageHighResUrl,
      generatedBadge: {
        title: generatedBadge.title,
        subtitle: generatedBadge.subtitle,
        templateId: generatedBadge.templateId,
        backgroundColor: generatedBadge.backgroundColor,
        textColor: generatedBadge.textColor
      }
    })

  } catch (error) {
    console.error('Badge generation error:', error)
    
    if (error instanceof Error) {
      if (error.message.includes('Missing required environment variable')) {
        return res.status(500).json({ error: 'S3 configuration not available' })
      }
    }

    return res.status(500).json({ error: 'Failed to generate and upload badge' })
  }
}

// Apply CSRF protection and rate limiting
export default withRateLimit('threadring_operations')(withCsrfProtection(handler));