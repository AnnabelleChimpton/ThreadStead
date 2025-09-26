/**
 * Legacy CSS to Visual Builder Conversion Utilities
 *
 * Extracts key styling values from legacy templates for conversion to Visual Builder
 * while providing a clean slate for the new Visual Builder development experience.
 */

import type { GlobalSettings } from '@/components/features/templates/visual-builder/GlobalSettingsPanel';
import { CSSClassGenerator } from '@/lib/templates/visual-builder/css-class-generator';

export interface ExtractedValues {
  backgroundColor?: string;
  textColor?: string;
  fontFamily?: string;
  fontSize?: string;
  accentColor?: string;
  linkColor?: string;
  // Track what was extracted for user information
  extractedProperties: string[];
}

/**
 * Extract convertible CSS values from legacy template CSS
 * Focuses on preserving user's core design choices (colors, fonts)
 * while clearing layout and component-specific styling
 */
export function extractLegacyValues(css: string): ExtractedValues {
  if (!css || !css.trim()) {
    return { extractedProperties: [] };
  }

  const extracted: ExtractedValues = {
    extractedProperties: []
  };

  // Extract body background (including gradients)
  const backgroundMatch = css.match(/body\s*\{[^}]*background(?:-color)?:\s*([^;]+);/i);
  if (backgroundMatch) {
    extracted.backgroundColor = backgroundMatch[1].trim();
    extracted.extractedProperties.push('Background color/gradient');
  }

  // Extract body text color
  const colorMatch = css.match(/body\s*\{[^}]*color:\s*([^;]+);/i);
  if (colorMatch) {
    extracted.textColor = colorMatch[1].trim();
    extracted.extractedProperties.push('Text color');
  }

  // Extract body font family
  const fontMatch = css.match(/body\s*\{[^}]*font-family:\s*([^;]+);/i);
  if (fontMatch) {
    extracted.fontFamily = fontMatch[1].trim();
    extracted.extractedProperties.push('Font family');
  }

  // Extract body font size
  const fontSizeMatch = css.match(/body\s*\{[^}]*font-size:\s*([^;]+);/i);
  if (fontSizeMatch) {
    extracted.fontSize = fontSizeMatch[1].trim();
    extracted.extractedProperties.push('Font size');
  }

  // Extract heading colors for accent color (h1, h2, h3, h4)
  const headingColorMatch = css.match(/h[1-4][^}]*color:\s*([^;!]+)/i);
  if (headingColorMatch) {
    extracted.accentColor = headingColorMatch[1].trim();
    extracted.extractedProperties.push('Heading/accent color');
  }

  // Extract link colors
  const linkColorMatch = css.match(/a\s*\{[^}]*color:\s*([^;]+);/i) ||
                        css.match(/a:link[^}]*color:\s*([^;]+);/i);
  if (linkColorMatch) {
    extracted.linkColor = linkColorMatch[1].trim();
    extracted.extractedProperties.push('Link color');
  }

  return extracted;
}

/**
 * Convert extracted legacy values to Visual Builder GlobalSettings format
 * This integrates with the existing Visual Builder theme system
 */
export function generateGlobalSettingsFromLegacy(extractedValues: ExtractedValues): GlobalSettings {
  // Detect background type (solid vs gradient)
  const isGradient = extractedValues.backgroundColor?.includes('gradient');

  const globalSettings: GlobalSettings = {
    theme: 'custom',
    background: {
      type: isGradient ? 'gradient' : 'solid',
      color: extractedValues.backgroundColor || '#FCFAF7',
      // Parse gradient if present
      ...(isGradient && extractedValues.backgroundColor && {
        gradient: parseGradient(extractedValues.backgroundColor)
      })
    },
    typography: {
      fontFamily: extractedValues.fontFamily || 'system-ui, sans-serif',
      baseSize: extractedValues.fontSize || '16px',
      scale: 1.2, // Default scale
      ...(extractedValues.textColor && {
        color: extractedValues.textColor
      })
    },
    spacing: {
      containerPadding: '1rem',
      sectionSpacing: '1.5rem'
    },
    effects: {}
  };

  return globalSettings;
}

/**
 * Parse CSS gradient string to extract colors and angle
 * Handles linear-gradient format
 */
function parseGradient(gradientString: string): { colors: string[]; angle: number } {
  // Default fallback
  const defaultGradient = { colors: ['#667eea', '#764ba2'], angle: 135 };

  if (!gradientString.includes('gradient')) {
    return defaultGradient;
  }

  // Extract angle from linear-gradient
  const angleMatch = gradientString.match(/linear-gradient\(\s*(-?\d+(?:\.\d+)?)deg/);
  const angle = angleMatch ? parseInt(angleMatch[1]) : 135;

  // Extract colors (simplified - handles basic color formats)
  const colorMatches = gradientString.match(/#[0-9a-fA-F]{3,6}|rgb\([^)]+\)|rgba\([^)]+\)|[a-zA-Z]+/g);
  const colors = colorMatches && colorMatches.length >= 2
    ? colorMatches.slice(0, 4) // Limit to 4 colors max
    : defaultGradient.colors;

  return { colors, angle };
}

/**
 * Generate Visual Builder container HTML with proper theme class
 */
export function generateConvertedTemplate(): string {
  return `<div class="pure-absolute-container vb-theme-custom">
  <!-- Your Visual Builder components go here -->
  <!-- Clean slate for building with Visual Builder tools -->
</div>`;
}

/**
 * Generate complete template with CSS for Visual Builder parsing
 * This creates a template that the Visual Builder parser can understand
 */
export function generateConvertedTemplateWithCSS(extractedValues: ExtractedValues): string {
  const htmlTemplate = generateConvertedTemplate();
  const cssContent = generateConvertedCSS(extractedValues);

  // Combine HTML and CSS in the format expected by Visual Builder
  return `<style>
${cssContent}
</style>
${htmlTemplate}`;
}

/**
 * Generate CSS using Visual Builder's proper CSS generation system
 * This ensures proper integration with Visual Builder themes and variables
 */
export function generateConvertedCSS(extractedValues: ExtractedValues): string {
  // Convert to GlobalSettings format
  const globalSettings = generateGlobalSettingsFromLegacy(extractedValues);

  // Use Visual Builder's CSS generation system
  const generator = new CSSClassGenerator();
  const generatedCSS = generator.generateGlobalCSS(globalSettings);

  // Add header comment and helpful user guidance
  const headerComments = [
    '/* Converted from legacy template - preserved styling */',
    '/* This CSS is generated using Visual Builder\'s theme system */',
    '/* You can edit the CSS variables below to customize your theme */',
    ''
  ];

  const footerComments = [
    '',
    '/* Add your custom Visual Builder styling below */',
    '/* Example: Override component styles, add animations, etc. */'
  ];

  return [
    ...headerComments,
    generatedCSS.css,
    ...footerComments
  ].join('\n');
}

/**
 * Generate human-readable summary of what will be preserved vs. cleared
 */
export function generateConversionSummary(extractedValues: ExtractedValues): {
  preserved: string[];
  cleared: string[];
} {
  const preserved = [...extractedValues.extractedProperties];

  const cleared = [
    'Component layouts and positioning',
    'Custom animations and transitions',
    'Grid and flexbox styling',
    'Component-specific colors and styling',
    'Border and shadow effects',
    'Custom CSS selectors and rules'
  ];

  // Add general categories if nothing was preserved
  if (preserved.length === 0) {
    preserved.push('Nothing (no convertible styles found)');
  }

  return { preserved, cleared };
}

/**
 * Validate that extracted values are safe CSS values
 * Prevents injection of malicious CSS
 */
export function validateExtractedValues(values: ExtractedValues): ExtractedValues {
  const validated: ExtractedValues = {
    extractedProperties: [...values.extractedProperties]
  };

  // Simple CSS value validation - reject anything with potentially dangerous content
  const dangerousPatterns = [
    /javascript:/i,
    /expression\(/i,
    /url\(\s*["']?\s*javascript:/i,
    /@import/i,
    /behavior:/i
  ];

  const validateValue = (value: string | undefined): string | undefined => {
    if (!value) return undefined;

    // Check for dangerous patterns
    for (const pattern of dangerousPatterns) {
      if (pattern.test(value)) {
        return undefined;
      }
    }

    // Basic CSS value format check
    if (value.length > 200) return undefined; // Prevent extremely long values

    return value.trim();
  };

  validated.backgroundColor = validateValue(values.backgroundColor);
  validated.textColor = validateValue(values.textColor);
  validated.fontFamily = validateValue(values.fontFamily);
  validated.fontSize = validateValue(values.fontSize);
  validated.accentColor = validateValue(values.accentColor);
  validated.linkColor = validateValue(values.linkColor);

  return validated;
}