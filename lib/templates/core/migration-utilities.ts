/**
 * Migration Utilities for Template Component Standardization
 *
 * This module provides utilities to migrate from the old prop system
 * to the new web-standard component interfaces.
 */

import React, { CSSProperties } from 'react';
import { StandardComponentProps, VisualBuilderContext } from './standard-component-interface';

/**
 * Legacy prop mappings from the old universal styling system
 */
const LEGACY_PROP_MAPPINGS: Record<string, keyof StandardComponentProps> = {
  // Universal styling legacy props
  'backgroundcolor': 'backgroundColor',
  'textcolor': 'color',
  'fontsize': 'fontSize',
  'fontweight': 'fontWeight',
  'fontfamily': 'fontFamily',
  'lineheight': 'lineHeight',
  'textalign': 'textAlign',
  'bordercolor': 'border', // Will need special handling
  'borderradius': 'borderRadius',
  'boxshadow': 'boxShadow',

  // HTML attribute lowercase variants (remove duplicates)
  'accentcolor': 'backgroundColor', // Map to backgroundColor for now
  'borderwidth': 'border', // Will need special handling
  'customcss': 'css',

  // Legacy color mapping
  'color': 'color',
};

/**
 * FlexContainer legacy prop mappings
 */
const FLEX_CONTAINER_MAPPINGS = {
  'direction': 'flexDirection',
  'align': 'alignItems',
  'justify': 'justifyContent',
} as const;

/**
 * Convert legacy gap values to CSS values
 */
function convertLegacyGap(gap: string): string {
  const gapMap: Record<string, string> = {
    'xs': '0.25rem',
    'sm': '0.5rem',
    'md': '1rem',
    'lg': '1.5rem',
    'xl': '2rem',
  };

  return gapMap[gap] || gap;
}

/**
 * Convert legacy align values to CSS align-items values
 */
function convertLegacyAlign(align: string): 'start' | 'end' | 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline' {
  const alignMap: Record<string, 'start' | 'end' | 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline'> = {
    'start': 'start', // CSS Grid/Flexbox modern syntax
    'center': 'center',
    'end': 'end', // CSS Grid/Flexbox modern syntax
    'stretch': 'stretch',
    'baseline': 'baseline',
    'flex-start': 'flex-start',
    'flex-end': 'flex-end',
  };

  return alignMap[align] || 'stretch'; // Default to stretch if unknown
}

/**
 * Convert legacy justify values to CSS justify-content values
 */
function convertLegacyJustify(justify: string): 'start' | 'end' | 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around' | 'space-evenly' | 'stretch' {
  const justifyMap: Record<string, 'start' | 'end' | 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around' | 'space-evenly' | 'stretch'> = {
    'start': 'start', // CSS Grid/Flexbox modern syntax
    'center': 'center',
    'end': 'end', // CSS Grid/Flexbox modern syntax
    'between': 'space-between',
    'around': 'space-around',
    'evenly': 'space-evenly',
    'flex-start': 'flex-start',
    'flex-end': 'flex-end',
    'stretch': 'stretch',
  };

  return justifyMap[justify] || 'start'; // Default to start if unknown
}

/**
 * Extract visual builder context from legacy props
 */
function extractVisualBuilderContext(props: any): VisualBuilderContext | undefined {
  const {
    _isInVisualBuilder,
    _onContentChange,
    _onPropsChange,
    _positioningMode,
    _size,
    _isSelected,
    _isHovered,
  } = props;

  if (!_isInVisualBuilder) {
    return undefined;
  }

  return {
    isInVisualBuilder: _isInVisualBuilder,
    onContentChange: _onContentChange,
    onPropsChange: _onPropsChange,
    positioningMode: _positioningMode === 'absolute' ? 'absolute' :
                   _positioningMode === 'grid' ? 'grid' : 'normal',
    size: _size,
    isSelected: _isSelected,
    isHovered: _isHovered,
  };
}

/**
 * Migrate legacy positioning props to CSS positioning
 */
function migrateLegacyPositioning(props: any): Partial<StandardComponentProps> {
  const cssProps: Partial<StandardComponentProps> = {};

  // Handle legacy absolute positioning
  if (props._positioningMode === 'absolute') {
    cssProps.position = 'absolute';

    if (props.position) {
      cssProps.left = `${props.position.x}px`;
      cssProps.top = `${props.position.y}px`;
    }

    if (props._size) {
      cssProps.width = props._size.width;
      cssProps.height = props._size.height;
    }

    if (props.position?.z !== undefined) {
      cssProps.zIndex = props.position.z;
    }
  }

  // Handle legacy grid positioning
  if (props._positioningMode === 'grid' && props.gridPosition) {
    cssProps.gridColumn = `${props.gridPosition.column} / span ${props.gridPosition.span || 1}`;
    cssProps.gridRow = `${props.gridPosition.row}`;
  }

  return cssProps;
}

/**
 * Migrate legacy universal styling props to standard CSS props
 */
function migrateLegacyUniversalStyling(props: any): Partial<StandardComponentProps> {
  const cssProps: Partial<StandardComponentProps> = {};

  // Apply legacy prop mappings
  Object.entries(LEGACY_PROP_MAPPINGS).forEach(([legacyKey, newKey]) => {
    if (props[legacyKey] !== undefined) {
      // Special handling for complex props
      if (legacyKey === 'borderwidth' && props.bordercolor) {
        cssProps.border = `${props[legacyKey]} solid ${props.bordercolor}`;
      } else if (legacyKey === 'bordercolor' && props.borderwidth) {
        cssProps.border = `${props.borderwidth} solid ${props[legacyKey]}`;
      } else if (legacyKey === 'customcss') {
        try {
          cssProps.css = JSON.parse(props[legacyKey]);
        } catch {
          // Invalid JSON, ignore
        }
      } else {
        (cssProps as any)[newKey] = props[legacyKey];
      }
    }
  });

  return cssProps;
}

/**
 * Migrate FlexContainer-specific legacy props
 */
function migrateFlexContainerProps(props: any): Partial<StandardComponentProps> {
  const cssProps: Partial<StandardComponentProps> = {};

  // Set display to flex
  cssProps.display = 'flex';

  // Map legacy props to CSS properties
  if (props.direction) {
    cssProps.flexDirection = props.direction;
  }

  if (props.align) {
    cssProps.alignItems = convertLegacyAlign(props.align);
  }

  if (props.justify) {
    cssProps.justifyContent = convertLegacyJustify(props.justify);
  }

  if (props.gap) {
    cssProps.gap = convertLegacyGap(props.gap);
  }

  if (props.wrap) {
    cssProps.css = { ...cssProps.css, flexWrap: 'wrap' };
  }

  // Handle responsive behavior
  if (props.responsive && (props.direction === 'row' || props.direction === 'row-reverse')) {
    cssProps.css = {
      ...cssProps.css,
      '@media (max-width: 768px)': {
        flexDirection: 'column',
      },
    } as any; // Cast to any for CSS-in-JS features like media queries
  }

  return cssProps;
}

/**
 * Main migration function for general component props
 */
export function migrateComponentProps(
  oldProps: any,
  componentType?: string
): {
  standardProps: StandardComponentProps;
  visualBuilderContext?: VisualBuilderContext;
} {
  const standardProps: StandardComponentProps = {};

  // Extract basic props that don't need migration
  const {
    className,
    style,
    children,
    id,
    title,
    role,
    'aria-label': ariaLabel,
    'aria-labelledby': ariaLabelledby,
    'aria-describedby': ariaDescribedby,
  } = oldProps;

  // Copy standard props directly
  if (className) standardProps.className = className;
  if (style) standardProps.style = style;
  if (children) standardProps.children = children;
  if (id) standardProps.id = id;
  if (title) standardProps.title = title;
  if (role) standardProps.role = role;
  if (ariaLabel) standardProps['aria-label'] = ariaLabel;
  if (ariaLabelledby) standardProps['aria-labelledby'] = ariaLabelledby;
  if (ariaDescribedby) standardProps['aria-describedby'] = ariaDescribedby;

  // Migrate positioning props
  Object.assign(standardProps, migrateLegacyPositioning(oldProps));

  // Migrate universal styling props
  Object.assign(standardProps, migrateLegacyUniversalStyling(oldProps));

  // Component-specific migrations
  if (componentType === 'FlexContainer') {
    Object.assign(standardProps, migrateFlexContainerProps(oldProps));
  }

  // Extract visual builder context
  const visualBuilderContext = extractVisualBuilderContext(oldProps);

  return {
    standardProps,
    visualBuilderContext,
  };
}

/**
 * Higher-order component to provide backward compatibility
 * during the migration period
 */
export function withMigrationSupport<T extends StandardComponentProps>(
  NewComponent: React.ComponentType<T>,
  componentType?: string
) {
  return function MigratedComponent(props: any) {
    const { standardProps, visualBuilderContext } = migrateComponentProps(props, componentType);

    // Merge visual builder context into props if it exists
    const finalProps = visualBuilderContext
      ? { ...standardProps, __visualBuilder: visualBuilderContext }
      : standardProps;

    return React.createElement(NewComponent, finalProps as T);
  };
}

/**
 * Utility to clean props for DOM elements
 * Removes React-specific and custom props that shouldn't be on DOM elements
 */
export function cleanPropsForDOM(props: StandardComponentProps): Record<string, any> {
  const {
    // React-specific props
    children,
    content,
    tagName,
    as,
    size,
    shape,
    colors,
    direction,
    css,
    cssRenderMode,

    // CSS props that need to be in style, not attributes
    backgroundColor,
    color,
    fontSize,
    fontFamily,
    fontWeight,
    lineHeight,
    textAlign,
    textIndent,
    whiteSpace,
    wordBreak,
    overflowWrap,
    padding,
    paddingTop,
    paddingRight,
    paddingBottom,
    paddingLeft,
    margin,
    marginTop,
    marginRight,
    marginBottom,
    marginLeft,
    border,
    borderRadius,
    borderColor,
    borderWidth,
    boxShadow,
    opacity,
    blur,
    position,
    top,
    right,
    bottom,
    left,
    width,
    height,
    minWidth,
    minHeight,
    maxWidth,
    maxHeight,
    zIndex,
    display,
    flexDirection,
    justifyContent,
    alignItems,
    alignContent,
    flexWrap,
    gap,
    rowGap,
    columnGap,
    gridTemplateColumns,
    gridTemplateRows,
    gridTemplateAreas,
    gridAutoColumns,
    gridAutoRows,
    gridAutoFlow,
    gridColumn,
    gridRow,
    gridArea,
    justifyItems,
    justifySelf,
    alignSelf,

    // Internal props
    __visualBuilder,

    ...domProps
  } = props;

  return domProps;
}

/**
 * Debug utility to compare old vs new prop structures
 * Useful during migration to verify props are correctly transformed
 */
export function debugPropMigration(oldProps: any, componentType?: string) {
  const { standardProps, visualBuilderContext } = migrateComponentProps(oldProps, componentType);

  console.group(`🔄 Prop Migration Debug: ${componentType || 'Unknown'}`);
  console.log('📥 Old Props:', oldProps);
  console.log('📤 New Standard Props:', standardProps);
  console.log('🎛️ Visual Builder Context:', visualBuilderContext);
  console.log('🧹 DOM Props:', cleanPropsForDOM(standardProps));
  console.groupEnd();

  return { standardProps, visualBuilderContext };
}