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
  cleaned = cleaned.replace(
    /<ThreadsteadNavigation[^>]*\/>/gi,
    ''
  );

  cleaned = cleaned.replace(
    /<ThreadsteadNavigation[^>]*>[\s\S]*?<\/ThreadsteadNavigation>/gi,
    ''
  );

  // Strip any divs with data-component-id="system-navigation"
  cleaned = cleaned.replace(
    /<div[^>]*data-component-id=["']system-navigation["'][^>]*>[\s\S]*?<\/div>/gi,
    ''
  );

  // Strip any divs with data-component-type="navigation"
  cleaned = cleaned.replace(
    /<div[^>]*data-component-type=["']navigation["'][^>]*>[\s\S]*?<\/div>/gi,
    ''
  );

  // Clean up extra whitespace left behind
  cleaned = cleaned.replace(/\n\s*\n\s*\n/g, '\n\n');
  cleaned = cleaned.trim();

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
