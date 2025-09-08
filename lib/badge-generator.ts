import { getBadgeTemplate, BADGE_TEMPLATES, type BadgeTemplate } from './domain/threadrings/badges';

export interface BadgeGenerationOptions {
  title: string;
  subtitle?: string;
  templateId?: string;
  backgroundColor?: string;
  textColor?: string;
  autoColor?: boolean; // Auto-generate colors based on title
}

export interface GeneratedBadge {
  title: string;
  subtitle?: string;
  templateId?: string;
  backgroundColor: string;
  textColor: string;
  imageDataUrl?: string;
  isGenerated: boolean;
}

// Simple hash function to generate consistent colors from text
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

// Generate colors based on ThreadRing name
function generateColorsFromName(name: string): { backgroundColor: string; textColor: string } {
  const hash = hashString(name.toLowerCase());
  
  // Predefined color palettes that work well together
  const colorPalettes = [
    { bg: '#4A90E2', text: '#FFFFFF' }, // Blue
    { bg: '#7B68EE', text: '#FFFFFF' }, // Slate Blue
    { bg: '#20B2AA', text: '#FFFFFF' }, // Light Sea Green
    { bg: '#FF6347', text: '#FFFFFF' }, // Tomato
    { bg: '#DA70D6', text: '#FFFFFF' }, // Orchid
    { bg: '#FF4500', text: '#FFFFFF' }, // Orange Red
    { bg: '#32CD32', text: '#FFFFFF' }, // Lime Green
    { bg: '#FF1493', text: '#FFFFFF' }, // Deep Pink
    { bg: '#1E90FF', text: '#FFFFFF' }, // Dodger Blue
    { bg: '#FFD700', text: '#8B4513' }, // Gold with brown text
    { bg: '#9932CC', text: '#FFFFFF' }, // Dark Orchid
    { bg: '#228B22', text: '#FFFFFF' }, // Forest Green
    { bg: '#DC143C', text: '#FFFFFF' }, // Crimson
    { bg: '#4169E1', text: '#FFFFFF' }, // Royal Blue
    { bg: '#FF8C00', text: '#FFFFFF' }, // Dark Orange
    { bg: '#8A2BE2', text: '#FFFFFF' }  // Blue Violet
  ];
  
  const paletteIndex = hash % colorPalettes.length;
  const palette = colorPalettes[paletteIndex];
  return {
    backgroundColor: palette.bg,
    textColor: palette.text
  };
}

// Auto-select best template based on ThreadRing characteristics
function autoSelectTemplate(name: string, subtitle?: string): string {
  const nameWords = name.toLowerCase();
  
  // Theme-based template selection
  if (nameWords.includes('dev') || nameWords.includes('code') || nameWords.includes('tech')) {
    return 'matrix_black';
  }
  if (nameWords.includes('art') || nameWords.includes('design') || nameWords.includes('creative')) {
    return 'neon_pink';
  }
  if (nameWords.includes('retro') || nameWords.includes('vintage') || nameWords.includes('classic')) {
    return 'retro_green';
  }
  if (nameWords.includes('cyber') || nameWords.includes('future') || nameWords.includes('sci')) {
    return 'cyber_teal';
  }
  if (nameWords.includes('sun') || nameWords.includes('warm') || nameWords.includes('cozy')) {
    return 'sunset_orange';
  }
  if (nameWords.includes('royal') || nameWords.includes('premium') || nameWords.includes('elegant')) {
    return 'deep_purple';
  }
  if (nameWords.includes('bright') || nameWords.includes('happy') || nameWords.includes('fun')) {
    return 'golden_yellow';
  }
  
  // Default to classic blue for general use
  return 'classic_blue';
}

export async function generateBadge(options: BadgeGenerationOptions): Promise<GeneratedBadge> {
  let template: BadgeTemplate | undefined;
  let backgroundColor = options.backgroundColor;
  let textColor = options.textColor;
  let templateId = options.templateId;

  // Auto-generate colors if requested
  if (options.autoColor && !backgroundColor && !textColor) {
    const colors = generateColorsFromName(options.title);
    backgroundColor = colors.backgroundColor;
    textColor = colors.textColor;
  }

  // Only auto-select template if no auto-color and no backgroundColor provided
  if (!templateId && !backgroundColor && !options.autoColor) {
    templateId = autoSelectTemplate(options.title, options.subtitle);
  }

  // Get template if specified (only if not using auto-color)
  if (templateId && !options.autoColor) {
    template = getBadgeTemplate(templateId);
    if (template) {
      backgroundColor = template.backgroundColor;
      textColor = template.textColor;
    }
  }

  // Fallback to default colors
  if (!backgroundColor) backgroundColor = '#4A90E2';
  if (!textColor) textColor = '#FFFFFF';

  // Generate image data URL for server-side use
  let imageDataUrl: string | undefined;
  
  try {
    // Only generate image on server side (Node.js environment)
    if (typeof window === 'undefined') {
      imageDataUrl = await generateBadgeImageDataUrl(
        options.title,
        options.subtitle,
        backgroundColor,
        textColor
      );
    }
  } catch (error) {
    console.warn('Failed to generate badge image:', error);
    // Continue without image - not a fatal error
  }

  const result: GeneratedBadge = {
    title: options.title,
    subtitle: options.subtitle,
    templateId: templateId,
    backgroundColor,
    textColor,
    imageDataUrl,
    isGenerated: true
  };

  return result;
}

/**
 * Generate a 88x31 badge image as a data URL using Sharp with SVG text overlay
 */
async function generateBadgeImageDataUrl(
  title: string,
  subtitle?: string,
  backgroundColor: string = '#4A90E2',
  textColor: string = '#FFFFFF'
): Promise<string> {
  const sharp = (await import('sharp')).default;
  
  // Truncate title for badge display
  const displayTitle = title.length > 12 ? title.substring(0, 11) + '…' : title;
  const displaySubtitle = subtitle && subtitle.length > 10 ? subtitle.substring(0, 9) + '…' : subtitle;
  
  // Create SVG with text
  const fontSize = subtitle ? 8 : 10;
  const titleY = subtitle ? 12 : 16;
  const subtitleY = 23;
  
  const svgText = `
    <svg width="88" height="31" xmlns="http://www.w3.org/2000/svg">
      <rect width="88" height="31" fill="${backgroundColor}" stroke="#000" stroke-width="1"/>
      <text x="44" y="${titleY}" text-anchor="middle" 
            font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="bold" 
            fill="${textColor}">${displayTitle}</text>
      ${subtitle ? `<text x="44" y="${subtitleY}" text-anchor="middle" 
            font-family="Arial, sans-serif" font-size="7" 
            fill="${textColor}">${displaySubtitle}</text>` : ''}
    </svg>
  `;
  
  // Convert SVG to PNG using Sharp
  const badgeBuffer = await sharp(Buffer.from(svgText))
    .png()
    .toBuffer();

  // Convert to data URL
  const base64 = badgeBuffer.toString('base64');
  return `data:image/png;base64,${base64}`;
}

// Generate badge for a ThreadRing automatically
export async function generateThreadRingBadge(
  threadRingName: string,
  threadRingSlug: string,
  options: Partial<BadgeGenerationOptions> = {}
): Promise<GeneratedBadge> {
  // Use full name - let the SVG generator handle display truncation
  const title = threadRingName;
  const subtitle = options.subtitle;

  // Only use autoColor if no template or backgroundColor is specified
  const shouldAutoColor = !options.templateId && !options.backgroundColor && !options.autoColor;

  return generateBadge({
    title,
    subtitle,
    autoColor: shouldAutoColor,
    ...options
  });
}

// Validate badge content
export function validateBadgeContent(title: string, subtitle?: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!title || title.trim().length === 0) {
    errors.push('Badge title is required');
  }

  if (title && title.length > 15) {
    errors.push('Badge title should be 15 characters or less for optimal display');
  }

  if (subtitle && subtitle.length > 12) {
    errors.push('Badge subtitle should be 12 characters or less for optimal display');
  }

  // Check for problematic characters
  const problematicChars = /[<>\"'&]/;
  if (title && problematicChars.test(title)) {
    errors.push('Badge title contains invalid characters');
  }

  if (subtitle && problematicChars.test(subtitle)) {
    errors.push('Badge subtitle contains invalid characters');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

// Get optimal text size for badge content
export function getOptimalTextSize(title: string, subtitle?: string): { titleSize: number; subtitleSize: number } {
  let titleSize = 10;
  let subtitleSize = 7;

  // Adjust title size based on length
  if (title.length > 10) {
    titleSize = 8;
  } else if (title.length > 8) {
    titleSize = 9;
  }

  // If we have both title and subtitle, make title smaller
  if (subtitle) {
    titleSize = Math.min(titleSize, 8);
    if (subtitle.length > 8) {
      subtitleSize = 6;
    }
  }

  return { titleSize, subtitleSize };
}