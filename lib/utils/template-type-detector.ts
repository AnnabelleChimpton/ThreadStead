/**
 * Simple Template Type Detection Utility
 *
 * Safely detects whether a template is legacy or Visual Builder format
 * without any DOM manipulation or complex parsing.
 */

export type TemplateType = 'legacy' | 'visual-builder';

/**
 * Detect template type based on HTML content and CSS patterns
 * Fails safe to 'legacy' if detection is uncertain
 */
export function detectTemplateType(
  staticHTML?: string,
  customCSS?: string | null
): TemplateType {
  // Ensure we have valid strings to work with
  const html = staticHTML || '';
  const css = customCSS || '';

  // Primary detection: Visual Builder templates always have pure-absolute-container
  if (html.includes('pure-absolute-container')) {
    return 'visual-builder';
  }

  // Secondary detection: Visual Builder positioning attributes
  if (html.includes('data-pure-positioning') ||
      html.includes('data-positioning-mode="absolute"') ||
      html.includes('data-positioning-mode="grid"')) {
    return 'visual-builder';
  }

  // Tertiary detection: Visual Builder CSS patterns
  if (css.includes('--global-bg-color') ||
      css.includes('.vb-theme-') ||
      css.includes('/* Visual Builder Generated CSS */')) {
    return 'visual-builder';
  }

  // Additional Visual Builder indicators
  if (html.includes('class="vb-theme-') ||
      html.includes('class="vb-pattern-')) {
    return 'visual-builder';
  }

  // Default to legacy if no Visual Builder indicators found
  return 'legacy';
}

/**
 * Check if template has Visual Builder positioning data
 * Used for additional context in rendering decisions
 */
export function hasVisualBuilderPositioning(staticHTML?: string): boolean {
  const html = staticHTML || '';

  return html.includes('data-pure-positioning') ||
         html.includes('data-positioning-mode') ||
         html.includes('data-pixel-position') ||
         html.includes('data-grid-position');
}

/**
 * Check if CSS contains Visual Builder generated content
 * Used to validate CSS/HTML template type consistency
 */
export function hasVisualBuilderCSS(customCSS?: string | null): boolean {
  const css = customCSS || '';

  return css.includes('Visual Builder Generated CSS') ||
         css.includes('--global-bg-color') ||
         css.includes('--vb-') ||
         css.includes('.vb-theme-') ||
         css.includes('.vb-pattern-');
}

/**
 * Get appropriate container class name based on template type
 */
export function getContainerClassName(templateType: TemplateType): string {
  switch (templateType) {
    case 'visual-builder':
      // Visual Builder templates manage their own container classes
      return '';
    case 'legacy':
      return 'advanced-template-container';
    default:
      // Fail-safe to legacy container
      return 'advanced-template-container';
  }
}

/**
 * Validate template type consistency between HTML and CSS
 * Returns warnings if there are mismatches
 */
export function validateTemplateTypeConsistency(
  staticHTML?: string,
  customCSS?: string | null
): {
  isConsistent: boolean;
  warnings: string[];
  detectedType: TemplateType;
} {
  const detectedType = detectTemplateType(staticHTML, customCSS);
  const hasVbHtml = staticHTML?.includes('pure-absolute-container') || hasVisualBuilderPositioning(staticHTML);
  const hasVbCss = hasVisualBuilderCSS(customCSS);

  const warnings: string[] = [];
  let isConsistent = true;

  // Check for mismatched indicators
  if (detectedType === 'visual-builder' && !hasVbHtml && hasVbCss) {
    warnings.push('Visual Builder CSS detected but no Visual Builder HTML structure found');
    isConsistent = false;
  }

  if (detectedType === 'legacy' && hasVbHtml) {
    warnings.push('Visual Builder HTML structure found but classified as legacy template');
    isConsistent = false;
  }

  return {
    isConsistent,
    warnings,
    detectedType
  };
}