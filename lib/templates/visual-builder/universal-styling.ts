/**
 * Universal Styling System for Visual Builder Components
 *
 * Provides consistent styling props and processing logic for all components,
 * eliminating the confusion of multiple styling approaches.
 */

import React from 'react';

// Universal styling prop definitions for component registry
export const UNIVERSAL_STYLE_PROPS = {
  // Color properties
  backgroundColor: {
    type: 'string' as const,
    description: 'Background color of the component'
  },
  textColor: {
    type: 'string' as const,
    description: 'Text color of the component'
  },
  borderColor: {
    type: 'string' as const,
    description: 'Border color of the component'
  },
  accentColor: {
    type: 'string' as const,
    description: 'Accent color for highlights and special elements'
  },

  // Visual effects
  opacity: {
    type: 'string' as const,
    description: 'Component opacity (0-100%)'
  },
  borderRadius: {
    type: 'string' as const,
    description: 'Border radius for rounded corners'
  },
  borderWidth: {
    type: 'string' as const,
    description: 'Border thickness'
  },
  boxShadow: {
    type: 'string' as const,
    description: 'Drop shadow effect'
  },

  // Typography (for text-containing components)
  fontSize: {
    type: 'string' as const,
    description: 'Font size'
  },
  fontWeight: {
    type: 'string' as const,
    description: 'Font weight (normal, bold, etc.)'
  },
  fontFamily: {
    type: 'string' as const,
    description: 'Font family'
  },
  textAlign: {
    type: 'enum' as const,
    values: ['left', 'center', 'right', 'justify'] as const,
    description: 'Text alignment'
  },
  lineHeight: {
    type: 'string' as const,
    description: 'Line height for text spacing'
  },

  // Spacing
  padding: {
    type: 'string' as const,
    description: 'Internal padding'
  },
  margin: {
    type: 'string' as const,
    description: 'External margin'
  },

  // Advanced CSS override
  customCSS: {
    type: 'string' as const,
    description: 'Raw CSS styles as JSON string for advanced customization'
  }
};

// Type for universal style props
export interface UniversalStyleProps {
  backgroundColor?: string;
  textColor?: string;
  borderColor?: string;
  accentColor?: string;
  opacity?: string;
  borderRadius?: string;
  borderWidth?: string;
  boxShadow?: string;
  fontSize?: string;
  fontWeight?: string;
  fontFamily?: string;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  lineHeight?: string;
  padding?: string;
  margin?: string;
  customCSS?: string;
}

// Component categories for determining which props to apply
export type ComponentStyleCategory = 'text' | 'container' | 'media' | 'interactive' | 'decorative';

// Category-specific prop filters
export const CATEGORY_STYLE_PROPS: Record<ComponentStyleCategory, (keyof UniversalStyleProps)[]> = {
  text: [
    'backgroundColor', 'textColor', 'borderColor', 'opacity', 'borderRadius',
    'fontSize', 'fontWeight', 'fontFamily', 'textAlign', 'lineHeight', 'padding', 'customCSS'
  ],
  container: [
    'backgroundColor', 'borderColor', 'opacity', 'borderRadius', 'borderWidth',
    'boxShadow', 'padding', 'margin', 'customCSS'
  ],
  media: [
    'backgroundColor', 'borderColor', 'opacity', 'borderRadius', 'borderWidth',
    'boxShadow', 'margin', 'customCSS'
  ],
  interactive: [
    'backgroundColor', 'textColor', 'borderColor', 'accentColor', 'opacity',
    'borderRadius', 'borderWidth', 'boxShadow', 'padding', 'customCSS'
  ],
  decorative: [
    'backgroundColor', 'textColor', 'borderColor', 'accentColor', 'opacity',
    'borderRadius', 'borderWidth', 'boxShadow', 'customCSS'
  ]
};

// Legacy prop name mappings for backwards compatibility (includes HTML lowercase variants)
const LEGACY_PROP_MAPPINGS: Record<string, keyof UniversalStyleProps> = {
  // Original legacy mappings
  'backgroundcolor': 'backgroundColor',  // Old Paragraph prop
  'color': 'textColor',                  // Old color prop -> textColor
  'fontsize': 'fontSize',               // Legacy prop
  'fontweight': 'fontWeight',           // Legacy prop
  'textalign': 'textAlign',             // Legacy prop
  'bordercolor': 'borderColor',         // Legacy prop
  'borderradius': 'borderRadius',       // Legacy prop
  // HTML lowercase variants (what HTML attribute parsing creates)
  'textcolor': 'textColor',             // HTML textColor -> textcolor
  'accentcolor': 'accentColor',         // HTML accentColor -> accentcolor
  'borderwidth': 'borderWidth',         // HTML borderWidth -> borderwidth
  'boxshadow': 'boxShadow',             // HTML boxShadow -> boxshadow
  'fontfamily': 'fontFamily',           // HTML fontFamily -> fontfamily
  'lineheight': 'lineHeight',           // HTML lineHeight -> lineheight
  'customcss': 'customCSS',             // HTML customCSS -> customcss
};

/**
 * Migrate legacy props to new universal prop names (bidirectional compatibility)
 */
function migrateLegacyProps(props: Record<string, unknown>): UniversalStyleProps & Record<string, unknown> {
  const migratedProps = { ...props };

  // Apply legacy prop mappings (legacy -> universal)
  Object.entries(LEGACY_PROP_MAPPINGS).forEach(([legacyKey, newKey]) => {
    if (props[legacyKey] !== undefined && props[newKey] === undefined) {
      // Only migrate if the new prop doesn't already exist
      migratedProps[newKey] = props[legacyKey];
    }
  });

  // Apply reverse mappings (universal -> legacy) for maximum compatibility
  // This ensures components that expect legacy prop names still work
  const reverseMappings: Record<keyof UniversalStyleProps, string> = {
    'backgroundColor': 'backgroundcolor',
    'textColor': 'color',
    'borderColor': 'bordercolor',
    'fontFamily': 'fontfamily',
    'fontSize': 'fontsize',
    'fontWeight': 'fontweight',
    'textAlign': 'textalign',
    'borderRadius': 'borderradius',
    // Other props that don't have legacy equivalents
    'accentColor': 'accentColor',
    'opacity': 'opacity',
    'borderWidth': 'borderWidth',
    'boxShadow': 'boxShadow',
    'lineHeight': 'lineHeight',
    'padding': 'padding',
    'margin': 'margin',
    'customCSS': 'customCSS'
  };

  Object.entries(reverseMappings).forEach(([universalKey, legacyKey]) => {
    if (props[universalKey] !== undefined && props[legacyKey] === undefined) {
      // Add legacy prop for backwards compatibility
      migratedProps[legacyKey] = props[universalKey];
    }
  });

  return migratedProps as UniversalStyleProps & Record<string, unknown>;
}

/**
 * Process universal style props into a React CSSProperties object
 */
export function processUniversalStyles(
  props: UniversalStyleProps & Record<string, unknown>,
  category: ComponentStyleCategory = 'container',
  existingStyle?: React.CSSProperties
): React.CSSProperties {

  // First migrate any legacy props
  const migratedProps = migrateLegacyProps(props);

  let processedStyle: React.CSSProperties = existingStyle ? { ...existingStyle } : {};

  // Get relevant props for this component category
  const relevantProps = CATEGORY_STYLE_PROPS[category];

  // Process each universal style prop
  for (const propName of relevantProps) {
    const value = migratedProps[propName];
    if (!value || typeof value !== 'string') continue;

    switch (propName) {
      case 'backgroundColor':
        processedStyle.backgroundColor = value;
        break;
      case 'textColor':
        processedStyle.color = value;
        break;
      case 'borderColor':
        processedStyle.borderColor = value;
        break;
      case 'accentColor':
        // Store as CSS custom property for component-specific use
        (processedStyle as any)['--accent-color'] = value;
        break;
      case 'opacity':
        // Handle both percentage and decimal formats
        const opacityValue = value.endsWith('%')
          ? parseFloat(value) / 100
          : parseFloat(value);
        if (!isNaN(opacityValue)) {
          processedStyle.opacity = opacityValue;
        }
        break;
      case 'borderRadius':
        processedStyle.borderRadius = value.endsWith('px') || value.endsWith('%') || value.endsWith('rem')
          ? value : `${value}px`;
        break;
      case 'borderWidth':
        processedStyle.borderWidth = value.endsWith('px') ? value : `${value}px`;
        if (!processedStyle.borderStyle) {
          processedStyle.borderStyle = 'solid';
        }
        break;
      case 'boxShadow':
        processedStyle.boxShadow = value;
        break;
      case 'fontSize':
        processedStyle.fontSize = value.endsWith('px') || value.endsWith('rem') || value.endsWith('em')
          ? value : `${value}px`;
        break;
      case 'fontWeight':
        processedStyle.fontWeight = value;
        break;
      case 'fontFamily':
        processedStyle.fontFamily = value;
        break;
      case 'textAlign':
        processedStyle.textAlign = value as React.CSSProperties['textAlign'];
        break;
      case 'lineHeight':
        processedStyle.lineHeight = value;
        break;
      case 'padding':
        processedStyle.padding = value.includes('px') || value.includes('rem')
          ? value : `${value}px`;
        break;
      case 'margin':
        processedStyle.margin = value.includes('px') || value.includes('rem')
          ? value : `${value}px`;
        break;
      case 'customCSS':
        // Parse custom CSS JSON and merge it in
        try {
          const customStyles = JSON.parse(value) as React.CSSProperties;
          processedStyle = { ...processedStyle, ...customStyles };
        } catch (error) {
          console.warn('Failed to parse customCSS:', value, error);
        }
        break;
    }
  }

  return processedStyle;
}

/**
 * Get the appropriate style category for a component type
 */
export function getComponentStyleCategory(componentType: string): ComponentStyleCategory {
  const textComponents = ['TextElement', 'Heading', 'Paragraph', 'DisplayName', 'Bio'];
  const containerComponents = ['GradientBox', 'CenteredBox', 'NeonBorder', 'RevealBox', 'CustomHTMLElement'];
  const mediaComponents = ['ProfilePhoto', 'UserImage', 'MediaGrid'];
  const interactiveComponents = ['FollowButton', 'ContactCard', 'Tabs'];

  if (textComponents.includes(componentType)) return 'text';
  if (containerComponents.includes(componentType)) return 'container';
  if (mediaComponents.includes(componentType)) return 'media';
  if (interactiveComponents.includes(componentType)) return 'interactive';

  return 'decorative'; // Default fallback
}

/**
 * Hook for components to easily process their universal styles
 */
export function useUniversalStyles(
  props: UniversalStyleProps & Record<string, unknown>,
  componentType: string,
  existingStyle?: React.CSSProperties
): React.CSSProperties {
  return React.useMemo(() => {
    const category = getComponentStyleCategory(componentType);
    return processUniversalStyles(props, category, existingStyle);
  }, [
    // Universal prop names (camelCase)
    props.backgroundColor, props.textColor, props.borderColor, props.accentColor,
    props.opacity, props.borderRadius, props.borderWidth, props.boxShadow,
    props.fontSize, props.fontWeight, props.fontFamily, props.textAlign, props.lineHeight,
    props.padding, props.margin, props.customCSS,
    // HTML lowercase variants (what profile page actually receives)
    props.backgroundcolor, props.textcolor, props.bordercolor, props.accentcolor,
    props.borderradius, props.borderwidth, props.boxshadow,
    props.fontsize, props.fontweight, props.fontfamily, props.textalign, props.lineheight,
    props.customcss,
    // Legacy variants
    props.color,
    // Component type and existing style
    componentType, existingStyle
  ]);
}

/**
 * Get the display value for a universal style prop, checking both new and legacy prop names
 */
export function getDisplayValueForStyleProp(
  props: Record<string, unknown>,
  propName: keyof UniversalStyleProps
): string {
  // First check the new prop name
  if (props[propName] !== undefined) {
    return String(props[propName]);
  }

  // Then check for legacy prop names
  const legacyKey = Object.keys(LEGACY_PROP_MAPPINGS).find(
    key => LEGACY_PROP_MAPPINGS[key] === propName
  );

  if (legacyKey && props[legacyKey] !== undefined) {
    return String(props[legacyKey]);
  }

  return '';
}

/**
 * Utility to merge component-specific props with universal style props for registry
 */
export function mergeWithUniversalProps(
  componentSpecificProps: Record<string, any>,
  styleCategory: ComponentStyleCategory = 'container'
): Record<string, any> {
  const relevantUniversalProps = CATEGORY_STYLE_PROPS[styleCategory];
  const universalPropsForComponent: Record<string, any> = {};

  // Only include relevant universal props for this component category
  for (const propName of relevantUniversalProps) {
    if (UNIVERSAL_STYLE_PROPS[propName]) {
      universalPropsForComponent[propName] = UNIVERSAL_STYLE_PROPS[propName];
    }
  }

  return {
    ...componentSpecificProps,
    ...universalPropsForComponent
  };
}

/**
 * Separate universal styling props from other props
 * This prevents styling props from being added as HTML attributes
 */
export function separateUniversalStyleProps<T extends Record<string, any>>(
  props: T
): {
  styleProps: Partial<UniversalStyleProps> & Record<string, any>;
  otherProps: Omit<T, keyof UniversalStyleProps | keyof typeof LEGACY_PROP_MAPPINGS>;
} {
  const styleProps: Record<string, any> = {};
  const otherProps: Record<string, any> = {};

  // List of all style prop names (universal, legacy, and HTML lowercase variants)
  const allStylePropNames = new Set<string>([
    // Universal prop names (camelCase)
    'backgroundColor',
    'textColor',
    'borderColor',
    'accentColor',
    'opacity',
    'borderRadius',
    'borderWidth',
    'boxShadow',
    'fontSize',
    'fontWeight',
    'fontFamily',
    'textAlign',
    'lineHeight',
    'padding',
    'margin',
    'customCSS',
    // Legacy prop names (lowercase)
    'backgroundcolor',
    'color',
    'bordercolor',
    'fontsize',
    'fontweight',
    'fontfamily',
    'textalign',
    'borderradius',
    // HTML attribute lowercase variants (what browser parsing creates)
    'backgroundcolor',  // backgroundColor → backgroundcolor
    'textcolor',        // textColor → textcolor
    'bordercolor',      // borderColor → bordercolor
    'accentcolor',      // accentColor → accentcolor
    'borderradius',     // borderRadius → borderradius
    'borderwidth',      // borderWidth → borderwidth
    'boxshadow',        // boxShadow → boxshadow
    'fontsize',         // fontSize → fontsize
    'fontweight',       // fontWeight → fontweight
    'fontfamily',       // fontFamily → fontfamily
    'textalign',        // textAlign → textalign
    'lineheight',       // lineHeight → lineheight
    'customcss'         // customCSS → customcss
  ]);

  // Separate props
  Object.entries(props).forEach(([key, value]) => {
    if (allStylePropNames.has(key)) {
      styleProps[key] = value;
    } else {
      otherProps[key] = value;
    }
  });

  return {
    styleProps,
    otherProps: otherProps as any
  };
}