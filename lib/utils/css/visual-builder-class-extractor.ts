/**
 * Extract Visual Builder class names from CSS for application to live profile HTML
 */

/**
 * Extract Visual Builder class names from CSS content
 * These classes need to be applied to HTML elements for the CSS rules to take effect
 */
export function extractVisualBuilderClasses(css: string): string[] {
  if (!css || typeof css !== 'string') return [];

  const classNames: string[] = [];

  // Match CSS selectors that are Visual Builder classes
  // Look for .vb-theme-*, .vb-pattern-*, .vb-effect-*, etc.
  const vbClassRegex = /\.(vb-[a-z]+-[a-z0-9-]+)/g;

  let match;
  while ((match = vbClassRegex.exec(css)) !== null) {
    const className = match[1];

    // Avoid duplicates
    if (!classNames.includes(className)) {
      classNames.push(className);
    }
  }

  return classNames;
}

/**
 * Extract theme class specifically (for primary container styling)
 */
export function extractThemeClass(css: string): string | null {
  const classes = extractVisualBuilderClasses(css);
  const themeClass = classes.find(cls => cls.startsWith('vb-theme-'));
  return themeClass || null;
}

/**
 * Check if CSS contains Visual Builder generated content
 */
export function isVisualBuilderCSS(css: string): boolean {
  if (!css || typeof css !== 'string') return false;

  return (
    css.includes('Visual Builder Generated CSS') ||
    css.includes('--global-bg-color') ||
    css.includes('--vb-') ||
    css.includes('.vb-theme-') ||
    css.includes('.vb-pattern-') ||
    css.includes('.vb-effect-')
  );
}

/**
 * Generate a class string for Visual Builder container
 */
export function generateContainerClasses(css: string, existingClasses: string = ''): string {
  const vbClasses = extractVisualBuilderClasses(css);
  const existingArray = existingClasses.split(' ').filter(cls => cls.trim());

  // Combine existing classes with Visual Builder classes
  const allClasses = [...existingArray, ...vbClasses];

  // Remove duplicates and return
  const uniqueClasses = Array.from(new Set(allClasses));
  return uniqueClasses.join(' ').trim();
}