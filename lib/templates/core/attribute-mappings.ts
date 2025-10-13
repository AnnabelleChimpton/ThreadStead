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

  // CRTMonitor
  'screencolor': 'screenColor',
  'screen-color': 'screenColor',
  'phosphorglow': 'phosphorGlow',
  'phosphor-glow': 'phosphorGlow',

  // ArcadeButton
  'style3d': 'style3D',
  'style-3d': 'style3D',
  'clickeffect': 'clickEffect',
  'click-effect': 'clickEffect',

  // PixelArtFrame
  'framecolor': 'frameColor',
  'frame-color': 'frameColor',
  'framewidth': 'frameWidth',
  'frame-width': 'frameWidth',
  'cornerstyle': 'cornerStyle',
  'corner-style': 'cornerStyle',
  'shadoweffect': 'shadowEffect',
  'shadow-effect': 'shadowEffect',
  'gloweffect': 'glowEffect',
  'glow-effect': 'glowEffect',
  'innerpadding': 'innerPadding',
  'inner-padding': 'innerPadding',

  // RetroGrid
  'gridstyle': 'gridStyle',
  'grid-style': 'gridStyle',

  // VHSTape
  'tapecolor': 'tapeColor',
  'tape-color': 'tapeColor',
  'labelstyle': 'labelStyle',
  'label-style': 'labelStyle',
  'showbarcode': 'showBarcode',
  'show-barcode': 'showBarcode',

  // CassetteTape
  'showspokestorotate': 'showSpokesToRotate',
  'show-spokes-to-rotate': 'showSpokesToRotate',

  // RetroTV
  'tvstyle': 'tvStyle',
  'tv-style': 'tvStyle',
  'channelnumber': 'channelNumber',
  'channel-number': 'channelNumber',
  'showstatic': 'showStatic',
  'show-static': 'showStatic',
  'showscanlines': 'showScanlines',
  'show-scanlines': 'showScanlines',

  // Boombox
  'showequalizer': 'showEqualizer',
  'show-equalizer': 'showEqualizer',
  'showcassettedeck': 'showCassetteDeck',
  'show-cassette-deck': 'showCassetteDeck',
  'showradio': 'showRadio',
  'show-radio': 'showRadio',
  'isplaying': 'isPlaying',
  'is-playing': 'isPlaying',
  'currenttrack': 'currentTrack',
  'current-track': 'currentTrack',

  // MatrixRain
  'customcharacters': 'customCharacters',
  'custom-characters': 'customCharacters',
  'fadeeffect': 'fadeEffect',
  'fade-effect': 'fadeEffect',
  'backgroundopacity': 'backgroundOpacity',
  'background-opacity': 'backgroundOpacity',

  // CustomHTMLElement
  'tagname': 'tagName',
  'tag-name': 'tagName',
  'innerhtml': 'innerHTML',
  'inner-html': 'innerHTML',
  'cssrendermode': 'cssRenderMode',
  'css-render-mode': 'cssRenderMode',

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

  // OnKeyPress
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

  // Extract, Property, Merge, Clone, ObjectSet, ConditionalAttr
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
 * Positioning data attribute names (for preservation during sanitization)
 * These should NOT be normalized since they need to be read as-is
 */
export const POSITIONING_ATTRIBUTES = new Set([
  // Legacy formats (for backward compatibility)
  'data-positioning-mode',
  'data-pixel-position',
  'data-position',
  'data-grid-position',
  'data-grid-column',
  'data-grid-row',
  'data-grid-span',

  // Pure positioning format (new standard)
  'data-pure-positioning',

  // Human-readable format (Phase 4.2)
  'data-x',
  'data-y',
  'data-width',
  'data-height',
  'data-responsive',
  'data-breakpoints',

  // Size metadata
  'data-component-size',

  // Component metadata
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
  '_positioning',
  '_positioningMode',
  '_size',
  '_isInVisualBuilder',
  '__visualBuilder',
  '__visualbuilder',
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
  // Check if it's a positioning attribute - preserve as-is
  if (POSITIONING_ATTRIBUTES.has(attrName)) {
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

  // Add positioning attributes
  for (const attr of POSITIONING_ATTRIBUTES) {
    attributes.add(attr);
    // Also add camelCase variants for positioning attributes
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
 * (positioning attributes, internal props, etc.)
 */
export function shouldPreserveAttribute(attrName: string): boolean {
  return POSITIONING_ATTRIBUTES.has(attrName) ||
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
