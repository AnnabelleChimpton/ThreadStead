import type { NextApiRequest, NextApiResponse } from 'next'

/**
 * Image proxy endpoint for cross-origin images
 * Used by the pixel home capture feature to convert cross-origin images to same-origin
 * This allows html-to-image to capture images without CORS restrictions
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { url } = req.query

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Missing url parameter' })
  }

  try {
    // Validate URL - only allow trusted domains
    const parsedUrl = new URL(url)
    const allowedDomains = [
      process.env.NEXT_PUBLIC_R2_CDN_URL?.replace(/^https?:\/\//, '').replace(/\/$/, ''),
      process.env.R2_CDN_URL?.replace(/^https?:\/\//, '').replace(/\/$/, ''),
    ].filter(Boolean)

    const isAllowedDomain = allowedDomains.some(domain =>
      domain && parsedUrl.hostname.endsWith(domain.split('/')[0])
    )

    if (!isAllowedDomain) {
      return res.status(403).json({ error: 'Domain not allowed' })
    }

    // Fetch the image
    const response = await fetch(url, {
      headers: {
        'Accept': 'image/*',
      },
    })

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Failed to fetch image' })
    }

    const contentType = response.headers.get('content-type') || 'image/png'
    const buffer = Buffer.from(await response.arrayBuffer())

    // Set caching headers
    res.setHeader('Content-Type', contentType)
    res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800')
    res.setHeader('Access-Control-Allow-Origin', '*')

    return res.send(buffer)
  } catch (error) {
    console.error('Image proxy error:', error)
    return res.status(500).json({ error: 'Failed to proxy image' })
  }
}

export const config = {
  api: {
    responseLimit: '4mb',
  },
}
