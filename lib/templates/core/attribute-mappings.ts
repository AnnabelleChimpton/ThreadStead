/**
 * Centralized Attribute Mapping System
 *
 * Single source of truth for HTML attribute to React prop conversions.
 * This eliminates 400+ lines of duplicate mapping code across the codebase.
 *
 * Used by:
 * - island-detector.ts (island creation during compilation)
 * - AdvancedProfileRenderer.tsx (runtime hydration)
 * - template-parser.ts (sanitization schema)
 */

import { find, html as htmlSpace, svg as svgSpace } from 'property-information';

/**
 * Master attribute mapping table
 * Maps lowercase/kebab-case HTML attributes to proper React prop names
 */
export const ATTRIBUTE_MAP = {
  // ============================================================================
  // UNIVERSAL STYLING PROPERTIES
  // ============================================================================
  // Core Colors
  'backgroundcolor': 'backgroundColor',
  'background-color': 'backgroundColor',
  'textcolor': 'textColor',
  'text-color': 'textColor',
  'bordercolor': 'borderColor',
  'border-color': 'borderColor',
  'accentcolor': 'accentColor',
  'accent-color': 'accentColor',

  // Typography
  'fontsize': 'fontSize',
  'font-size': 'fontSize',
  'fontweight': 'fontWeight',
  'font-weight': 'fontWeight',
  'fontfamily': 'fontFamily',
  'font-family': 'fontFamily',
  'textalign': 'textAlign',
  'text-align': 'textAlign',
  'lineheight': 'lineHeight',
  'line-height': 'lineHeight',
  'textdecoration': 'textDecoration',
  'text-decoration': 'textDecoration',
  'fontstyle': 'fontStyle',
  'font-style': 'fontStyle',
  'texttransform': 'textTransform',
  'text-transform': 'textTransform',
  'letterspacing': 'letterSpacing',
  'letter-spacing': 'letterSpacing',
  'wordspacing': 'wordSpacing',
  'word-spacing': 'wordSpacing',
  'textindent': 'textIndent',
  'text-indent': 'textIndent',
  'whitespace': 'whiteSpace',
  'white-space': 'whiteSpace',
  'wordbreak': 'wordBreak',
  'word-break': 'wordBreak',
  'wordwrap': 'wordWrap',
  'word-wrap': 'wordWrap',
  'textoverflow': 'textOverflow',
  'text-overflow': 'textOverflow',

  // Borders & Effects
  'borderradius': 'borderRadius',
  'border-radius': 'borderRadius',
  'borderwidth': 'borderWidth',
  'border-width': 'borderWidth',
  'borderstyle': 'borderStyle',
  'border-style': 'borderStyle',
  'boxshadow': 'boxShadow',
  'box-shadow': 'boxShadow',

  // CSS Properties
  'customcss': 'customCSS',
  'custom-css': 'customCSS',

  // ============================================================================
  // COMPONENT-SPECIFIC PROPERTIES
  // ============================================================================

  // ArcadeButton
  'style3d': 'style3D',
  'style-3d': 'style3D',
  'clickeffect': 'clickEffect',
  'click-effect': 'clickEffect',

  // ============================================================================
  // TEMPLATE VARIABLE & STATE COMPONENTS
  // ============================================================================

  // Var, ShowVar, Set components
  'initial': 'initial',
  'persist': 'persist',
  'param': 'param',
  'default': 'default',
  'type': 'type',
  'expression': 'expression',
  'var': 'var',
  'format': 'format',
  'fallback': 'fallback',
  'coerce': 'coerce',
  'separator': 'separator',
  'dateformat': 'dateFormat',
  'date-format': 'dateFormat',

  // ============================================================================
  // INTERACTIVE COMPONENTS
  // ============================================================================

  // Increment, Decrement
  'by': 'by',
  'min': 'min',
  'max': 'max',
  'step': 'step',

  // TInput, Checkbox, ShowToast
  'rows': 'rows',
  'multiline': 'multiline',
  'message': 'message',
  'duration': 'duration',
  'disabled': 'disabled',
  'placeholder': 'placeholder',

  // RadioGroup, Slider, Select, ColorPicker
  'showvalue': 'showValue',
  'showValue': 'showValue',
  'show-value': 'showValue',
  'direction': 'direction',
  'debounce': 'debounce',

  // Array/String actions
  'value': 'value',
  'index': 'index',
  'values': 'values',
  'array': 'array',

  // Event handlers
  'seconds': 'seconds',
  'milliseconds': 'milliseconds',
  'delay': 'delay',

  // ForEach loop
  'item': 'item',

  // ============================================================================
  // CONDITIONAL COMPONENTS
  // ============================================================================

  // If/When comparison operators
  'equals': 'equals',
  'greaterthan': 'greaterThan',
  'greater-than': 'greaterThan',
  'lessthan': 'lessThan',
  'less-than': 'lessThan',
  'greaterthanorequal': 'greaterThanOrEqual',
  'greater-than-or-equal': 'greaterThanOrEqual',
  'lessthanorequal': 'lessThanOrEqual',
  'less-than-or-equal': 'lessThanOrEqual',
  'notequals': 'notEquals',
  'not-equals': 'notEquals',
  'startswith': 'startsWith',
  'starts-with': 'startsWith',
  'endswith': 'endsWith',
  'ends-with': 'endsWith',
  'contains': 'contains',
  'matches': 'matches',
  'and': 'and',
  'or': 'or',
  'not': 'not',
  'exists': 'exists',
  'condition': 'condition',

  // ============================================================================
  // VALIDATION & ERROR HANDLING
  // ============================================================================

  // Validate component
  'pattern': 'pattern',
  'required': 'required',
  'minlength': 'minLength',
  'min-length': 'minLength',
  'maxlength': 'maxLength',
  'max-length': 'maxLength',

  // Attempt component
  'showerror': 'showError',
  'show-error': 'showError',

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  // OnKeyPress, OnKeyUp
  'keyname': 'keyName',
  'key-name': 'keyName',

  // OnChange, OnMount, OnInterval
  // (using shared props from above)

  // OnVisible
  'threshold': 'threshold',
  'once': 'once',

  // ============================================================================
  // CSS MANIPULATION COMPONENTS
  // ============================================================================

  // AddClass, RemoveClass, ToggleClass, SetCSSVar
  'target': 'target',
  'element': 'element',
  'attribute': 'attribute',

  // ============================================================================
  // COLLECTION OPERATIONS
  // ============================================================================

  // Filter, Sort, Transform, Find, Count, Sum, Get
  'where': 'where',
  'order': 'order',
  'order-var': 'order-var',
  'property': 'property',
  'from': 'from',
  'at': 'at',

  // ============================================================================
  // ADVANCED STATE MANAGEMENT
  // ============================================================================

  // Merge, ObjectSet, ConditionalAttr
  'path': 'path',
  'as': 'as',
  'sources': 'sources',

  // ============================================================================
  // COMMON COMPONENT PROPS
  // ============================================================================

  'className': 'className',
  'class': 'className',
  'src': 'src',
  'alt': 'alt',
  'href': 'href',
  'title': 'title',
  'content': 'content',
  'text': 'text',
  'label': 'label',
  'name': 'name',
  'category': 'category',
  'color': 'color',
  'size': 'size',
  'variant': 'variant',
  'icon': 'icon',
  'description': 'description',
  'level': 'level',
  'caption': 'caption',
  'link': 'link',
  'when': 'when',
  'data': 'data',

} as const;

/**
 * Component metadata attributes (for preservation during sanitization)
 * These should NOT be normalized since they need to be read as-is
 */
export const METADATA_ATTRIBUTES = new Set([
  'data-component-id',
  'data-island',
  'data-component',
  'data-locked',
  'data-hidden',
  'data-component-name',
]);

/**
 * Internal system properties (should be preserved but not normalized)
 */
export const INTERNAL_PROPS = new Set([
  'children',
]);

/**
 * Normalize an HTML attribute name to its React prop equivalent
 *
 * @param attrName - The HTML attribute name (can be lowercase, kebab-case, or camelCase)
 * @returns The normalized React prop name
 *
 * @example
 * normalizeAttributeName('background-color') // 'backgroundColor'
 * normalizeAttributeName('backgroundcolor') // 'backgroundColor'
 * normalizeAttributeName('backgroundColor') // 'backgroundColor'
 */
export function normalizeAttributeName(attrName: string): string {
  // Check if it's a metadata attribute - preserve as-is
  if (METADATA_ATTRIBUTES.has(attrName)) {
    return attrName;
  }

  // Check if it's an internal prop - preserve as-is
  if (INTERNAL_PROPS.has(attrName)) {
    return attrName;
  }

  // Look up in attribute map (try exact match first, then lowercase)
  const normalized = (ATTRIBUTE_MAP as any)[attrName] || (ATTRIBUTE_MAP as any)[attrName.toLowerCase()];

  // If found in map, return normalized name
  if (normalized) {
    return normalized;
  }

  // Not in map - convert HTML attribute conventions to React
  // Handle special cases
  if (attrName === 'class') return 'className';
  if (attrName === 'for') return 'htmlFor';

  // React takes aria-* attributes as written (ariaLabel would render as an
  // unknown "arialabel" attribute that screen readers ignore)
  if (attrName.startsWith('aria-')) return attrName;

  // Convert kebab-case to camelCase for data attributes and other props
  if (attrName.includes('-') && !attrName.startsWith('data-')) {
    return attrName.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
  }

  // Return as-is if no conversion needed
  return attrName;
}

/**
 * Normalize all attribute names in a props object
 *
 * @param props - Object with potentially unnormalized attribute names
 * @returns New object with all attribute names normalized to React props
 *
 * @example
 * normalizeProps({ 'background-color': 'red', fontSize: '16px' })
 * // { backgroundColor: 'red', fontSize: '16px' }
 */
export function normalizeProps(props: Record<string, any>): Record<string, any> {
  const normalized: Record<string, any> = {};

  for (const [key, value] of Object.entries(props)) {
    const normalizedKey = normalizeAttributeName(key);
    normalized[normalizedKey] = value;
  }

  return normalized;
}

/**
 * Get all allowed attribute names for sanitization schema
 * Returns both normalized and original forms for maximum compatibility
 *
 * @returns Array of all allowed attribute names
 */
export function getAllowedAttributes(): string[] {
  const attributes = new Set<string>();

  // Add all original attribute names (lowercase/kebab-case variants)
  for (const attr of Object.keys(ATTRIBUTE_MAP)) {
    attributes.add(attr);
  }

  // Add all normalized React prop names
  for (const prop of Object.values(ATTRIBUTE_MAP)) {
    attributes.add(prop);
  }

  // Add metadata attributes
  for (const attr of METADATA_ATTRIBUTES) {
    attributes.add(attr);
    // Also add camelCase variants
    const camelCase = attr.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    attributes.add(camelCase);
  }

  // Add common HTML attributes
  const commonAttrs = [
    'id', 'style', 'title', 'role', 'aria-label', 'aria-describedby',
    'tabindex', 'data-testid', 'key'
  ];
  for (const attr of commonAttrs) {
    attributes.add(attr);
  }

  return Array.from(attributes);
}

/**
 * Check if an attribute should be preserved during normalization
 * (metadata attributes, internal props, etc.)
 */
export function shouldPreserveAttribute(attrName: string): boolean {
  return METADATA_ATTRIBUTES.has(attrName) ||
         INTERNAL_PROPS.has(attrName) ||
         attrName.startsWith('data-') ||
         attrName.startsWith('aria-');
}

/**
 * Get reverse attribute mapping (React prop → HTML attribute)
 * Used for deduplication in HTML generation
 *
 * @returns Object mapping React prop names to their lowercase HTML attribute equivalents
 *
 * @example
 * const reverseMap = getReverseAttributeMap();
 * // { 'backgroundColor': 'backgroundcolor', 'textColor': 'textcolor', ... }
 */
export function getReverseAttributeMap(): Record<string, string> {
  const reverse: Record<string, string> = {};

  for (const [htmlAttr, reactProp] of Object.entries(ATTRIBUTE_MAP)) {
    // Only create reverse mapping if they're different
    // (some entries map to themselves for documentation purposes)
    if (htmlAttr !== reactProp && htmlAttr.toLowerCase() === htmlAttr) {
      // Only include mappings where the HTML attribute is lowercase
      // (this excludes kebab-case variants since we only want one reverse mapping per prop)
      reverse[reactProp] = htmlAttr;
    }
  }

  return reverse;
}

/**
 * Get pairs of duplicate props for deduplication
 * Returns array of [universalProp, legacyProp] pairs
 *
 * Used by HTML generators to detect and remove duplicate prop variants
 * For example, if both 'backgroundColor' and 'backgroundcolor' exist,
 * keep the universal name and remove the legacy lowercase version
 *
 * @returns Array of [universal, legacy] prop name pairs
 *
 * @example
 * const pairs = getDuplicatePropPairs();
 * // [['backgroundColor', 'backgroundcolor'], ['textColor', 'textcolor'], ...]
 *
 * // Usage in deduplication:
 * pairs.forEach(([universal, legacy]) => {
 *   if (props[universal] && props[legacy]) {
 *     delete props[legacy]; // Remove duplicate
 *   }
 * });
 */
export function getDuplicatePropPairs(): [string, string][] {
  const pairs: [string, string][] = [];
  const reverseMap = getReverseAttributeMap();

  for (const [reactProp, htmlAttr] of Object.entries(reverseMap)) {
    pairs.push([reactProp, htmlAttr]);
  }

  return pairs;
}

/**
 * Where React spells a property differently from property-information. Only
 * these five, by a sweep of every allowed attribute; with the hast spelling
 * React dropped them, so dashed and round-capped SVG lines drew solid and
 * square (template audit 11 #1).
 */
const REACT_SPELLING: Readonly<Record<string, string>> = {
  strokeDashArray: 'strokeDasharray',
  strokeDashOffset: 'strokeDashoffset',
  strokeLineCap: 'strokeLinecap',
  strokeLineJoin: 'strokeLinejoin',
  strokeMiterLimit: 'strokeMiterlimit',
};

/**
 * One attribute of a page's own (non-component) HTML element, as a React
 * prop. Used when compiled HTML is turned back into React elements around
 * hydrated islands. property-information knows every HTML and SVG
 * attribute's React-style name and type, so:
 *  - boolean attributes are on when present (`<audio controls>` has
 *    `controls=""`, which React reads as false);
 *  - `aria-*` and `data-*` stay as written (React wants them that way);
 *  - form fields get their starting value as defaultValue/defaultChecked,
 *    so React doesn't freeze them as read-only controlled inputs.
 */
export function domAttributeToReactProp(
  tagName: string,
  name: string,
  value: string,
  inSvg: boolean
): [string, unknown] {
  const lower = name.toLowerCase();
  if (lower.startsWith('aria-') || lower.startsWith('data-')) return [lower, value];
  const info = find(inSvg ? svgSpace : htmlSpace, name);
  const prop = REACT_SPELLING[info.property] ?? info.property;
  if (info.boolean) {
    return [prop === 'checked' && tagName === 'input' ? 'defaultChecked' : prop, true];
  }
  if (info.overloadedBoolean) {
    return [prop, value === '' || value.toLowerCase() === lower ? true : value];
  }
  if (prop === 'value' && (tagName === 'input' || tagName === 'textarea' || tagName === 'select')) {
    return ['defaultValue', value];
  }
  return [prop, value];
}
