/**
 * Universal Styling System for Template Components
 *
 * Relocated from visual-builder/universal-styling.ts — the mergeWithUniversalProps
 * function and related types are used by component-registrations-display.ts and
 * component-registrations-state.ts.
 */

import React from 'react';

// Universal styling prop definitions for component registry. They're CSS
// (`css: true`): the compiler turns them into the component's inline style.
export const UNIVERSAL_STYLE_PROPS = {
  backgroundColor: {
    type: 'string' as const,
    css: true,
    description: 'A CSS colour for the background.'
  },
  textColor: {
    type: 'string' as const,
    css: true,
    description: 'A CSS colour for the text.'
  },
  borderColor: {
    type: 'string' as const,
    css: true,
    description: 'A CSS colour for the border.'
  },
  accentColor: {
    type: 'string' as const,
    css: true,
    description: 'A CSS colour for highlights.'
  },
  opacity: {
    type: 'string' as const,
    css: true,
    description: 'How see-through it is, from 0 (invisible) to 1.'
  },
  borderRadius: {
    type: 'string' as const,
    css: true,
    description: 'How round the corners are, like 8px.'
  },
  borderWidth: {
    type: 'string' as const,
    css: true,
    description: 'How thick the border is, like 2px.'
  },
  boxShadow: {
    type: 'string' as const,
    css: true,
    description: 'A CSS box-shadow, like 3px 3px 0 #000.'
  },
  fontSize: {
    type: 'string' as const,
    css: true,
    description: 'A CSS font size, like 1.2rem.'
  },
  fontWeight: {
    type: 'string' as const,
    css: true,
    description: 'normal, bold, or a number like 600.'
  },
  fontFamily: {
    type: 'string' as const,
    css: true,
    description: 'A CSS font family, like Georgia, serif.'
  },
  textAlign: {
    type: 'enum' as const,
    css: true,
    values: ['left', 'center', 'right', 'justify'] as const,
    description: 'Lines the text up left, center, right, or to both edges.'
  },
  lineHeight: {
    type: 'string' as const,
    css: true,
    description: 'Space between lines of text, like 1.6.'
  },
  padding: {
    type: 'string' as const,
    css: true,
    description: 'Space inside the edge, like 1rem.'
  },
  margin: {
    type: 'string' as const,
    css: true,
    description: 'Space outside the edge, like 1rem auto.'
  },
  customCSS: {
    type: 'string' as const,
    css: true,
    description: 'Any other CSS, written as JSON, like {"letterSpacing": "2px"}.'
  }
};

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

export type ComponentStyleCategory = 'text' | 'container' | 'media' | 'interactive' | 'decorative';

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

// Legacy prop name mappings for backwards compatibility
const LEGACY_PROP_MAPPINGS: Record<string, keyof UniversalStyleProps> = {
  'backgroundcolor': 'backgroundColor',
  'color': 'textColor',
  'fontsize': 'fontSize',
  'fontweight': 'fontWeight',
  'textalign': 'textAlign',
  'bordercolor': 'borderColor',
  'borderradius': 'borderRadius',
  'textcolor': 'textColor',
  'accentcolor': 'accentColor',
  'borderwidth': 'borderWidth',
  'boxshadow': 'boxShadow',
  'fontfamily': 'fontFamily',
  'lineheight': 'lineHeight',
  'customcss': 'customCSS',
};

/**
 * Migrate legacy props to new universal prop names
 */
function migrateLegacyProps(props: Record<string, unknown>): UniversalStyleProps & Record<string, unknown> {
  const migratedProps = { ...props };

  Object.entries(LEGACY_PROP_MAPPINGS).forEach(([legacyKey, newKey]) => {
    if (props[legacyKey] !== undefined && props[newKey] === undefined) {
      migratedProps[newKey] = props[legacyKey];
    }
  });

  const reverseMappings: Record<keyof UniversalStyleProps, string> = {
    'backgroundColor': 'backgroundcolor',
    'textColor': 'color',
    'borderColor': 'bordercolor',
    'fontFamily': 'fontfamily',
    'fontSize': 'fontsize',
    'fontWeight': 'fontweight',
    'textAlign': 'textalign',
    'borderRadius': 'borderradius',
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
  const migratedProps = migrateLegacyProps(props);
  let processedStyle: React.CSSProperties = existingStyle ? { ...existingStyle } : {};
  const relevantProps = CATEGORY_STYLE_PROPS[category];

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
        (processedStyle as any)['--accent-color'] = value;
        break;
      case 'opacity':
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

  return 'decorative';
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
    props.backgroundColor, props.textColor, props.borderColor, props.accentColor,
    props.opacity, props.borderRadius, props.borderWidth, props.boxShadow,
    props.fontSize, props.fontWeight, props.fontFamily, props.textAlign, props.lineHeight,
    props.padding, props.margin, props.customCSS,
    (props as any).backgroundcolor, (props as any).textcolor, (props as any).bordercolor, (props as any).accentcolor,
    (props as any).borderradius, (props as any).borderwidth, (props as any).boxshadow,
    (props as any).fontsize, (props as any).fontweight, (props as any).fontfamily, (props as any).textalign, (props as any).lineheight,
    (props as any).customcss,
    (props as any).color,
    componentType, existingStyle
  ]);
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
 */
export function separateUniversalStyleProps<T extends Record<string, any>>(
  props: T
): {
  styleProps: Partial<UniversalStyleProps> & Record<string, any>;
  otherProps: Omit<T, keyof UniversalStyleProps | keyof typeof LEGACY_PROP_MAPPINGS>;
} {
  const styleProps: Record<string, any> = {};
  const otherProps: Record<string, any> = {};

  const allStylePropNames = new Set<string>([
    'backgroundColor', 'textColor', 'borderColor', 'accentColor',
    'opacity', 'borderRadius', 'borderWidth', 'boxShadow',
    'fontSize', 'fontWeight', 'fontFamily', 'textAlign', 'lineHeight',
    'padding', 'margin', 'customCSS',
    'backgroundcolor', 'color', 'bordercolor', 'fontsize', 'fontweight',
    'fontfamily', 'textalign', 'borderradius',
    'textcolor', 'accentcolor', 'borderwidth', 'boxshadow',
    'lineheight', 'customcss'
  ]);

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
