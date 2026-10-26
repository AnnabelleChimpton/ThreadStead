/**
 * Utility to strip ThreadsteadNavigation components from HTML templates
 * Used during template save to ensure navigation is metadata-driven, not HTML-driven
 */

/**
 * Removes ThreadsteadNavigation components from HTML template
 * Handles both custom component format and any potential HTML format
 */
export function stripNavigationFromTemplate(html: string): string {
  if (!html) return html;

  let cleaned = html;

  // Strip <ThreadsteadNavigation> component tags (self-closing and with children)
  // Each goes, but its line breaks stay, so every line after it keeps its
  // number in the editor's messages (bug bash 2026-10-26)
  const keepLines = (removed: string) => removed.replace(/[^\n]/g, '');

  cleaned = cleaned.replace(
    /<ThreadsteadNavigation[^>]*\/>/gi,
    keepLines
  );

  cleaned = cleaned.replace(
    /<ThreadsteadNavigation[^>]*>[\s\S]*?<\/ThreadsteadNavigation>/gi,
    keepLines
  );

  // Strip any divs with data-component-id="system-navigation"
  cleaned = cleaned.replace(
    /<div[^>]*data-component-id=["']system-navigation["'][^>]*>[\s\S]*?<\/div>/gi,
    keepLines
  );

  // Strip any divs with data-component-type="navigation"
  cleaned = cleaned.replace(
    /<div[^>]*data-component-type=["']navigation["'][^>]*>[\s\S]*?<\/div>/gi,
    keepLines
  );

  // Blank lines stay as written: squeezing every run of them, on every page,
  // took the blank lines out of <pre> ASCII art (template audit 11 #5). Those
  // at the top too: trimmed, every line number the editor gave was off by
  // them (bug bash 2026-10-26)
  cleaned = cleaned.trimEnd();

  return cleaned;
}

/**
 * Extracts navigation props from existing ThreadsteadNavigation component if present
 * Returns null if no navigation component found
 */
export function extractNavigationProps(html: string): Record<string, any> | null {
  if (!html) return null;

  // Try to find ThreadsteadNavigation component
  const navMatch = html.match(/<ThreadsteadNavigation([^>]*)>/i);
  if (!navMatch) return null;

  const attrsString = navMatch[1];
  const props: Record<string, any> = {};

  // Extract common navigation props
  const propPatterns = {
    navBackgroundColor: /navBackgroundColor=["']([^"']*)["']/i,
    navTextColor: /navTextColor=["']([^"']*)["']/i,
    navOpacity: /navOpacity=["']?([^"'\s]*)["']?/i,
    navBlur: /navBlur=["']?([^"'\s]*)["']?/i,
    navBorderColor: /navBorderColor=["']([^"']*)["']/i,
    navBorderWidth: /navBorderWidth=["']?([^"'\s]*)["']?/i,
    dropdownBackgroundColor: /dropdownBackgroundColor=["']([^"']*)["']/i,
    dropdownTextColor: /dropdownTextColor=["']([^"']*)["']/i,
    dropdownBorderColor: /dropdownBorderColor=["']([^"']*)["']/i,
    dropdownHoverColor: /dropdownHoverColor=["']([^"']*)["']/i
  };

  for (const [key, pattern] of Object.entries(propPatterns)) {
    const match = attrsString.match(pattern);
    if (match && match[1]) {
      // Parse numbers
      if (key === 'navOpacity' || key === 'navBlur' || key === 'navBorderWidth') {
        props[key] = parseFloat(match[1]);
      } else {
        props[key] = match[1];
      }
    }
  }

  return Object.keys(props).length > 0 ? props : null;
}

/**
 * Checks if template contains ThreadsteadNavigation component
 */
export function hasNavigationComponent(html: string): boolean {
  if (!html) return false;
  return /ThreadsteadNavigation|data-component-id=["']system-navigation["']|data-component-type=["']navigation["']/i.test(html);
}
