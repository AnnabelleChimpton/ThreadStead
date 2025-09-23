/**
 * CSS Validator Utility
 * Phase 2: CSS Validation Layer
 *
 * Provides comprehensive validation and sanitization for CSS property values
 * to prevent XSS attacks and ensure valid CSS generation.
 *
 * Security Features:
 * - Blocks dangerous CSS patterns (javascript:, expression(), etc.)
 * - Validates CSS property values with regex patterns
 * - Auto-corrects common mistakes
 * - Provides helpful error messages
 */

export interface ValidationResult {
  isValid: boolean;
  isDangerous: boolean;
  sanitizedValue?: string;
  errorMessage?: string;
  suggestion?: string;
  errorType: 'none' | 'invalid' | 'dangerous' | 'warning';
}

// Dangerous patterns that could lead to XSS or security issues
const DANGEROUS_PATTERNS = [
  /javascript:/i,
  /expression\s*\(/i,
  /behavior\s*:/i,
  /binding\s*:/i,
  /@import/i,
  /url\s*\(\s*["']?\s*javascript:/i,
  /url\s*\(\s*["']?\s*data:(?!image\/)/i, // Allow data:image/ but block other data: URIs
  /<script/i,
  /vbscript:/i,
  /mocha:/i,
  /livescript:/i,
  /eval\s*\(/i,
  /setInterval\s*\(/i,
  /setTimeout\s*\(/i,
];

// Safe CSS property validation patterns
const SAFE_PROPERTY_PATTERNS: Record<string, RegExp> = {
  // Color values: hex, rgb, rgba, hsl, hsla, named colors
  color: /^(#[0-9a-fA-F]{3,8}|rgb\s*\(\s*\d+%?\s*,\s*\d+%?\s*,\s*\d+%?\s*\)|rgba\s*\(\s*\d+%?\s*,\s*\d+%?\s*,\s*\d+%?\s*,\s*[\d.]+\s*\)|hsl\s*\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*\)|hsla\s*\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*,\s*[\d.]+\s*\)|transparent|currentColor|inherit|initial|unset|[a-zA-Z]+)$/,

  // Background color: same as color plus transparent
  backgroundColor: /^(#[0-9a-fA-F]{3,8}|rgb\s*\(\s*\d+%?\s*,\s*\d+%?\s*,\s*\d+%?\s*\)|rgba\s*\(\s*\d+%?\s*,\s*\d+%?\s*,\s*\d+%?\s*,\s*[\d.]+\s*\)|hsl\s*\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*\)|hsla\s*\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*,\s*[\d.]+\s*\)|transparent|currentColor|inherit|initial|unset|[a-zA-Z]+)$/,

  // Font size: px, em, rem, %, pt, named sizes
  fontSize: /^(\d+(\.\d+)?(px|em|rem|%|pt|pc|in|cm|mm|ex|ch|vw|vh|vmin|vmax)|xx-small|x-small|small|medium|large|x-large|xx-large|smaller|larger|inherit|initial|unset)$/,

  // Font weight: numeric (100-900) or named
  fontWeight: /^(normal|bold|bolder|lighter|[1-9]00|inherit|initial|unset)$/,

  // Text alignment
  textAlign: /^(left|right|center|justify|start|end|inherit|initial|unset)$/,

  // Additional properties that might be added in future phases
  textDecoration: /^(none|underline|overline|line-through|blink|inherit|initial|unset)$/,
  fontStyle: /^(normal|italic|oblique|inherit|initial|unset)$/,
  textTransform: /^(none|capitalize|uppercase|lowercase|inherit|initial|unset)$/,
};

// Auto-correction patterns
const AUTO_CORRECTIONS: Array<{pattern: RegExp; correction: (match: string) => string; description: string}> = [
  // Expand 3-digit hex to 6-digit
  {
    pattern: /^#([0-9a-fA-F])([0-9a-fA-F])([0-9a-fA-F])$/,
    correction: (match) => {
      const [, r, g, b] = match.match(/^#([0-9a-fA-F])([0-9a-fA-F])([0-9a-fA-F])$/)!;
      return `#${r}${r}${g}${g}${b}${b}`;
    },
    description: 'Expanded 3-digit hex color to 6-digit'
  },

  // Add px unit to bare numbers for font-size
  {
    pattern: /^\d+$/,
    correction: (match) => `${match}px`,
    description: 'Added px unit to number'
  },

  // Convert common named colors to hex (optional - could be kept as named)
  {
    pattern: /^red$/i,
    correction: () => '#ff0000',
    description: 'Converted named color to hex'
  },

  // Remove extra whitespace
  {
    pattern: /\s+/g,
    correction: (match) => ' ',
    description: 'Normalized whitespace'
  },
];

// Whitelist of safe CSS properties
const SAFE_PROPERTIES = new Set([
  'color',
  'backgroundColor',
  'fontSize',
  'fontWeight',
  'textAlign',
  'textDecoration',
  'fontStyle',
  'textTransform',
  'lineHeight',
  'letterSpacing',
  'wordSpacing',
  'textIndent',
  'margin',
  'marginTop',
  'marginRight',
  'marginBottom',
  'marginLeft',
  'padding',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'border',
  'borderRadius',
  'opacity',
  'visibility',
  'display',
]);

/**
 * Check if a CSS property is safe to use
 */
export function isSafeProperty(property: string): boolean {
  return SAFE_PROPERTIES.has(property);
}

/**
 * Check if a value contains dangerous patterns
 */
export function containsDangerousPatterns(value: string): boolean {
  return DANGEROUS_PATTERNS.some(pattern => pattern.test(value));
}

/**
 * Attempt to auto-correct common CSS value mistakes
 */
export function autoCorrectValue(value: string, property: string): {corrected: string; applied: string[]} {
  let corrected = value.trim();
  const appliedCorrections: string[] = [];

  // Apply auto-corrections
  for (const correction of AUTO_CORRECTIONS) {
    if (correction.pattern.test(corrected)) {
      const newValue = corrected.replace(correction.pattern, correction.correction);
      if (newValue !== corrected) {
        corrected = newValue;
        appliedCorrections.push(correction.description);
      }
    }
  }

  return {corrected, applied: appliedCorrections};
}

/**
 * Validate a single CSS property value
 */
export function validateCSSProperty(property: string, value: string): ValidationResult {
  // Empty values are generally allowed (they clear the property)
  if (!value || value.trim() === '') {
    return {
      isValid: true,
      isDangerous: false,
      sanitizedValue: '',
      errorType: 'none'
    };
  }

  const trimmedValue = value.trim();

  // Check for dangerous patterns first
  if (containsDangerousPatterns(trimmedValue)) {
    return {
      isValid: false,
      isDangerous: true,
      errorMessage: 'Value contains potentially dangerous content and has been blocked for security reasons.',
      errorType: 'dangerous'
    };
  }

  // Check if property is in whitelist
  if (!isSafeProperty(property)) {
    return {
      isValid: false,
      isDangerous: false,
      errorMessage: `Property '${property}' is not allowed for security reasons.`,
      errorType: 'dangerous'
    };
  }

  // Get validation pattern for this property
  const pattern = SAFE_PROPERTY_PATTERNS[property];
  if (!pattern) {
    return {
      isValid: false,
      isDangerous: false,
      errorMessage: `No validation pattern defined for property '${property}'.`,
      errorType: 'invalid'
    };
  }

  // Try auto-correction first
  const {corrected, applied} = autoCorrectValue(trimmedValue, property);

  // Test the corrected value against the pattern
  if (pattern.test(corrected)) {
    return {
      isValid: true,
      isDangerous: false,
      sanitizedValue: corrected,
      errorType: applied.length > 0 ? 'warning' : 'none',
      suggestion: applied.length > 0 ? `Auto-corrected: ${applied.join(', ')}` : undefined
    };
  }

  // If validation fails, provide helpful error message
  const errorMessages: Record<string, string> = {
    color: 'Please enter a valid color (hex: #ff0000, rgb: rgb(255,0,0), or named: red)',
    backgroundColor: 'Please enter a valid background color (hex: #ff0000, rgb: rgb(255,0,0), named: red, or transparent)',
    fontSize: 'Please enter a valid font size (e.g., 16px, 1.2em, 120%, medium)',
    fontWeight: 'Please enter a valid font weight (normal, bold, or 100-900)',
    textAlign: 'Please enter a valid text alignment (left, center, right, justify)',
  };

  return {
    isValid: false,
    isDangerous: false,
    errorMessage: errorMessages[property] || `Invalid value for ${property}`,
    suggestion: applied.length > 0 ? `Tried auto-correction but still invalid. ${applied.join(', ')}` : undefined,
    errorType: 'invalid'
  };
}

/**
 * Validate an entire CSS style object
 */
export function validateCSSStyles(styles: Record<string, any>): {
  validatedStyles: Record<string, any>;
  errors: Array<{property: string; error: string; type: ValidationResult['errorType']}>;
  warnings: Array<{property: string; message: string}>;
} {
  const validatedStyles: Record<string, any> = {};
  const errors: Array<{property: string; error: string; type: ValidationResult['errorType']}> = [];
  const warnings: Array<{property: string; message: string}> = [];

  for (const [property, value] of Object.entries(styles)) {
    const result = validateCSSProperty(property, String(value));

    if (result.isValid) {
      validatedStyles[property] = result.sanitizedValue ?? value;
      if (result.suggestion) {
        warnings.push({property, message: result.suggestion});
      }
    } else {
      errors.push({
        property,
        error: result.errorMessage || 'Invalid value',
        type: result.errorType
      });
    }
  }

  return {validatedStyles, errors, warnings};
}

/**
 * Sanitize CSS styles by removing invalid/dangerous properties
 */
export function sanitizeCSSStyles(styles: Record<string, any>): Record<string, any> {
  const {validatedStyles} = validateCSSStyles(styles);
  return validatedStyles;
}