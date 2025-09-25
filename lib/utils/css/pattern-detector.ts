/**
 * Utility functions for detecting Visual Builder patterns in CSS
 */

/**
 * Check if CSS contains Visual Builder pattern styling
 */
export function hasVisualBuilderPattern(css: string | null | undefined): boolean {
  if (!css || typeof css !== 'string') return false;

  // Check for pattern-specific CSS classes
  const patternIndicators = [
    '.vb-pattern-',
    'vb-pattern-stars',
    'vb-pattern-dots',
    'vb-pattern-stripes',
    'vb-pattern-grid',
    'vb-pattern-zigzag',
    'vb-pattern-triangles',
    'background-image: url("data:image/svg+xml',
    '--vb-pattern-type:',
    '--vb-bg-type: pattern'
  ];

  return patternIndicators.some(indicator => css.includes(indicator));
}

/**
 * Extract pattern type from Visual Builder CSS
 */
export function extractPatternType(css: string | null | undefined): string | null {
  if (!css || typeof css !== 'string') return null;

  // Look for pattern type in CSS variables
  const patternTypeMatch = css.match(/--vb-pattern-type:\s*([^;!]+)/);
  if (patternTypeMatch) {
    return patternTypeMatch[1].trim();
  }

  // Look for pattern classes
  const patternClassMatch = css.match(/\.vb-pattern-([a-z0-9-]+)/);
  if (patternClassMatch) {
    return patternClassMatch[1];
  }

  return null;
}

/**
 * Check if Visual Builder is in disable mode with patterns
 */
export function isVisualBuilderDisableModeWithPattern(
  customCSS: string | null | undefined,
  cssMode: string | undefined,
  templateMode: string | undefined
): boolean {
  return (
    templateMode === 'advanced' &&
    cssMode === 'disable' &&
    hasVisualBuilderPattern(customCSS)
  );
}