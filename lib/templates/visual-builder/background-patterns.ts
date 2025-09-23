/**
 * Background Pattern Generator
 * Creates SVG-based patterns for fun visual backgrounds
 */

import type { BackgroundPattern } from '@/components/features/templates/visual-builder/GlobalSettingsPanel';

/**
 * Generate CSS background pattern from configuration
 */
export function generatePatternCSS(pattern: BackgroundPattern): string {
  if (pattern.type === 'none') return '';

  const svgPattern = generateSVGPattern(pattern);
  if (!svgPattern) return '';

  // Encode SVG for CSS
  const encodedSVG = encodeURIComponent(svgPattern);
  return `url("data:image/svg+xml,${encodedSVG}")`;
}

/**
 * Generate SVG pattern based on type
 */
function generateSVGPattern(pattern: BackgroundPattern): string {
  const size = pattern.size * 20; // Base size unit
  const opacity = pattern.opacity;
  const primaryColor = pattern.primaryColor;
  const secondaryColor = pattern.secondaryColor || primaryColor;

  switch (pattern.type) {
    case 'dots':
      return `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <circle cx="${size/2}" cy="${size/2}" r="${size/4}" fill="${primaryColor}" opacity="${opacity}"/>
      </svg>`;

    case 'stripes':
      return `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <rect width="${size/2}" height="${size}" fill="${primaryColor}" opacity="${opacity}"/>
        <rect x="${size/2}" width="${size/2}" height="${size}" fill="${secondaryColor}" opacity="${opacity * 0.7}"/>
      </svg>`;

    case 'checkerboard':
      return `<svg width="${size*2}" height="${size*2}" xmlns="http://www.w3.org/2000/svg">
        <rect width="${size}" height="${size}" fill="${primaryColor}" opacity="${opacity}"/>
        <rect x="${size}" y="${size}" width="${size}" height="${size}" fill="${primaryColor}" opacity="${opacity}"/>
        <rect x="${size}" width="${size}" height="${size}" fill="${secondaryColor}" opacity="${opacity * 0.5}"/>
        <rect y="${size}" width="${size}" height="${size}" fill="${secondaryColor}" opacity="${opacity * 0.5}"/>
      </svg>`;

    case 'stars':
      return `<svg width="${size*3}" height="${size*3}" xmlns="http://www.w3.org/2000/svg">
        <polygon points="${size},${size*0.5} ${size*1.2},${size*0.9} ${size*1.5},${size*0.7} ${size*1.3},${size*1.1} ${size*1.6},${size*1.5} ${size},${size*1.2} ${size*0.4},${size*1.5} ${size*0.7},${size*1.1} ${size*0.5},${size*0.7} ${size*0.8},${size*0.9}"
          fill="${primaryColor}" opacity="${opacity}"/>
        <polygon points="${size*2},${size*1.5} ${size*2.1},${size*1.65} ${size*2.25},${size*1.6} ${size*2.15},${size*1.75} ${size*2.3},${size*1.9} ${size*2},${size*1.8} ${size*1.7},${size*1.9} ${size*1.85},${size*1.75} ${size*1.75},${size*1.6} ${size*1.9},${size*1.65}"
          fill="${secondaryColor}" opacity="${opacity * 0.6}"/>
      </svg>`;

    case 'hearts':
      return `<svg width="${size*2}" height="${size*2}" xmlns="http://www.w3.org/2000/svg">
        <path d="M${size*0.5},${size*0.7} C${size*0.5},${size*0.5} ${size*0.2},${size*0.3} ${size*0.2},${size*0.6} C${size*0.2},${size*0.8} ${size*0.5},${size*1.1} ${size},${size*1.5} C${size*1.5},${size*1.1} ${size*1.8},${size*0.8} ${size*1.8},${size*0.6} C${size*1.8},${size*0.3} ${size*1.5},${size*0.5} ${size*1.5},${size*0.7} C${size*1.3},${size*0.9} ${size*1.1},${size*1.1} ${size},${size*1.3} C${size*0.9},${size*1.1} ${size*0.7},${size*0.9} ${size*0.5},${size*0.7} Z"
          fill="${primaryColor}" opacity="${opacity}"/>
      </svg>`;

    case 'diamonds':
      return `<svg width="${size*2}" height="${size*2}" xmlns="http://www.w3.org/2000/svg">
        <polygon points="${size},${size*0.5} ${size*1.5},${size} ${size},${size*1.5} ${size*0.5},${size}"
          fill="${primaryColor}" opacity="${opacity}"/>
      </svg>`;

    case 'waves':
      return `<svg width="${size*4}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <path d="M0,${size*0.5} Q${size},${size*0.2} ${size*2},${size*0.5} T${size*4},${size*0.5}"
          stroke="${primaryColor}" stroke-width="${size*0.1}" fill="none" opacity="${opacity}"/>
      </svg>`;

    case 'grid':
      return `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <line x1="0" y1="0" x2="0" y2="${size}" stroke="${primaryColor}" stroke-width="1" opacity="${opacity}"/>
        <line x1="0" y1="0" x2="${size}" y2="0" stroke="${primaryColor}" stroke-width="1" opacity="${opacity}"/>
      </svg>`;

    case 'confetti':
      return `<svg width="${size*3}" height="${size*3}" xmlns="http://www.w3.org/2000/svg">
        <rect x="${size*0.5}" y="${size*0.3}" width="${size*0.3}" height="${size*0.1}" fill="${primaryColor}" opacity="${opacity}" transform="rotate(45 ${size*0.65} ${size*0.35})"/>
        <rect x="${size*1.5}" y="${size*0.8}" width="${size*0.3}" height="${size*0.1}" fill="${secondaryColor}" opacity="${opacity}" transform="rotate(-30 ${size*1.65} ${size*0.85})"/>
        <rect x="${size*0.8}" y="${size*1.5}" width="${size*0.3}" height="${size*0.1}" fill="${primaryColor}" opacity="${opacity * 0.8}" transform="rotate(60 ${size*0.95} ${size*1.55})"/>
        <rect x="${size*2}" y="${size*1.2}" width="${size*0.3}" height="${size*0.1}" fill="${secondaryColor}" opacity="${opacity * 0.7}" transform="rotate(15 ${size*2.15} ${size*1.25})"/>
        <circle cx="${size*1.2}" cy="${size*0.5}" r="${size*0.05}" fill="${primaryColor}" opacity="${opacity}"/>
        <circle cx="${size*2.5}" cy="${size*2}" r="${size*0.05}" fill="${secondaryColor}" opacity="${opacity}"/>
      </svg>`;

    case 'sparkles':
      return `<svg width="${size*2}" height="${size*2}" xmlns="http://www.w3.org/2000/svg">
        <path d="M${size},${size*0.5} L${size*1.1},${size*0.9} L${size},${size*1.5} L${size*0.9},${size*0.9} Z"
          fill="${primaryColor}" opacity="${opacity}"/>
        <path d="M${size*1.5},${size*1.2} L${size*1.55},${size*1.35} L${size*1.5},${size*1.5} L${size*1.45},${size*1.35} Z"
          fill="${secondaryColor}" opacity="${opacity * 0.6}"/>
        <path d="M${size*0.3},${size*1.3} L${size*0.35},${size*1.4} L${size*0.3},${size*1.5} L${size*0.25},${size*1.4} Z"
          fill="${primaryColor}" opacity="${opacity * 0.8}"/>
      </svg>`;

    case 'bubbles':
      return `<svg width="${size*3}" height="${size*3}" xmlns="http://www.w3.org/2000/svg">
        <circle cx="${size}" cy="${size}" r="${size*0.3}" fill="none" stroke="${primaryColor}" stroke-width="${size*0.02}" opacity="${opacity}"/>
        <circle cx="${size*2}" cy="${size*1.5}" r="${size*0.2}" fill="none" stroke="${secondaryColor}" stroke-width="${size*0.02}" opacity="${opacity * 0.7}"/>
        <circle cx="${size*0.5}" cy="${size*2}" r="${size*0.25}" fill="none" stroke="${primaryColor}" stroke-width="${size*0.02}" opacity="${opacity * 0.5}"/>
        <circle cx="${size*2.5}" cy="${size*0.8}" r="${size*0.15}" fill="none" stroke="${secondaryColor}" stroke-width="${size*0.02}" opacity="${opacity * 0.8}"/>
      </svg>`;

    default:
      return '';
  }
}

/**
 * Get CSS for gradient backgrounds
 */
export function generateGradientCSS(gradient: { colors: string[]; angle: number }): string {
  const colorStops = gradient.colors.join(', ');
  return `linear-gradient(${gradient.angle}deg, ${colorStops})`;
}

/**
 * Pattern preview configurations for UI
 */
export const PATTERN_PREVIEWS = [
  { type: 'none', label: '🚫 None', description: 'No pattern' },
  { type: 'dots', label: '🔵 Dots', description: 'Polka dot pattern' },
  { type: 'stripes', label: '🦓 Stripes', description: 'Diagonal stripes' },
  { type: 'checkerboard', label: '🏁 Checkerboard', description: 'Classic checkers' },
  { type: 'stars', label: '⭐ Stars', description: 'Scattered stars' },
  { type: 'hearts', label: '💕 Hearts', description: 'Lovely hearts' },
  { type: 'diamonds', label: '💎 Diamonds', description: 'Diamond shapes' },
  { type: 'waves', label: '🌊 Waves', description: 'Flowing waves' },
  { type: 'grid', label: '📐 Grid', description: 'Tech grid' },
  { type: 'confetti', label: '🎉 Confetti', description: 'Party time!' },
  { type: 'sparkles', label: '✨ Sparkles', description: 'Magical sparkles' },
  { type: 'bubbles', label: '🫧 Bubbles', description: 'Floating bubbles' }
];

/**
 * Get animation CSS for patterns
 */
export function getPatternAnimationCSS(pattern: BackgroundPattern): string {
  if (!pattern.animated) return '';

  switch (pattern.type) {
    case 'stars':
    case 'sparkles':
      return `
        @keyframes twinkle {
          0%, 100% { opacity: ${pattern.opacity}; }
          50% { opacity: ${pattern.opacity * 0.3}; }
        }
        animation: twinkle 3s ease-in-out infinite;
      `;

    case 'bubbles':
      return `
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        animation: float 4s ease-in-out infinite;
      `;

    case 'grid':
      return `
        @keyframes pulse {
          0%, 100% { opacity: ${pattern.opacity}; }
          50% { opacity: ${pattern.opacity * 1.5}; }
        }
        animation: pulse 2s ease-in-out infinite;
      `;

    default:
      return '';
  }
}