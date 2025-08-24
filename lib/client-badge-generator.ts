/**
 * Client-side badge generation using Canvas API
 * Generates 88x31 ThreadRing badges with proper text rendering
 */

export interface ClientBadgeOptions {
  title: string
  subtitle?: string
  backgroundColor?: string
  textColor?: string
  templateId?: string
}

/**
 * Generate a 88x31 badge image as a data URL using client-side Canvas
 */
export function generateClientBadgeDataUrl(options: ClientBadgeOptions): string {
  const {
    title,
    subtitle,
    backgroundColor = '#4A90E2',
    textColor = '#FFFFFF'
  } = options

  // Create canvas
  const canvas = document.createElement('canvas')
  canvas.width = 88
  canvas.height = 31
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    throw new Error('Failed to get canvas context')
  }

  // Fill background
  ctx.fillStyle = backgroundColor
  ctx.fillRect(0, 0, 88, 31)

  // Draw border
  ctx.strokeStyle = '#000000'
  ctx.lineWidth = 1
  ctx.strokeRect(0, 0, 88, 31)

  // Set text properties
  ctx.fillStyle = textColor
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  // Draw title and subtitle
  if (subtitle) {
    // Two-line layout
    ctx.font = 'bold 8px Arial, sans-serif'
    ctx.fillText(title, 44, 12)
    ctx.font = '7px Arial, sans-serif'
    ctx.fillText(subtitle, 44, 23)
  } else {
    // Single line layout - adjust font size based on title length
    let fontSize = 10
    if (title.length > 12) fontSize = 8
    if (title.length > 16) fontSize = 7
    
    ctx.font = `bold ${fontSize}px Arial, sans-serif`
    ctx.fillText(title, 44, 15.5)
  }

  return canvas.toDataURL('image/png')
}

/**
 * Generate badge colors from text using simple hash
 */
export function generateBadgeColors(text: string): { backgroundColor: string, textColor: string } {
  // Simple hash function
  let hash = 0
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }

  // Generate hue from hash (0-360)
  const hue = Math.abs(hash) % 360
  
  // Use HSL with fixed saturation and lightness for consistency
  const backgroundColor = `hsl(${hue}, 70%, 50%)`
  
  // Choose white or black text for contrast
  const lightness = (hue > 60 && hue < 180) ? 20 : 90 // Yellow/green range gets dark text
  const textColor = lightness > 50 ? '#FFFFFF' : '#000000'

  return { backgroundColor, textColor }
}

/**
 * Preview badge generation - returns both the data URL and a preview element
 */
export function generateBadgePreview(options: ClientBadgeOptions): {
  dataUrl: string
  previewElement: HTMLImageElement
} {
  const dataUrl = generateClientBadgeDataUrl(options)
  
  const img = document.createElement('img')
  img.src = dataUrl
  img.width = 88
  img.height = 31
  img.style.border = '1px solid #ccc'
  img.alt = `${options.title} Badge Preview`
  
  return { dataUrl, previewElement: img }
}

/**
 * Upload badge image to server and get hosted URLs
 */
export async function uploadBadgeToServer(imageDataUrl: string, ringSlug: string): Promise<{
  badgeImageUrl: string
  badgeImageHighResUrl: string
}> {
  const response = await fetch('/api/badges/upload', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      imageDataUrl,
      ringSlug
    })
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to upload badge')
  }

  const result = await response.json()
  return {
    badgeImageUrl: result.badgeImageUrl,
    badgeImageHighResUrl: result.badgeImageHighResUrl
  }
}