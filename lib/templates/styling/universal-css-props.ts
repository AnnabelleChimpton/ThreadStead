/**
 * Universal CSS Properties Interface
 *
 * Provides a standard way for all template components (legacy and new) to accept
 * and apply CSS styling properties from the Visual Builder PropertyPanel.
 */

import React from 'react';

/**
 * Universal CSS properties that all components should accept
 * These map directly to CSS property names and values
 */
export interface UniversalCSSProps {
  // Colors
  backgroundColor?: string;
  color?: string;
  textColor?: string; // Alias for color
  borderColor?: string;
  accentColor?: string; // For highlights, buttons, etc.

  // Typography
  fontSize?: string;
  fontFamily?: string;
  fontWeight?: string | number;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  lineHeight?: string | number;

  // Spacing
  padding?: string;
  margin?: string;
  gap?: string; // For flex/grid layouts

  // Layout & Sizing
  width?: string;
  height?: string;
  minWidth?: string;
  minHeight?: string;
  maxWidth?: string;
  maxHeight?: string;

  // Borders & Effects
  border?: string;
  borderRadius?: string;
  borderWidth?: string;
  boxShadow?: string;
  opacity?: string | number;

  // Positioning
  position?: 'static' | 'relative' | 'absolute' | 'fixed' | 'sticky';
  top?: string;
  right?: string;
  bottom?: string;
  left?: string;
  zIndex?: string | number;

  // Flexbox Properties
  display?: string;
  flexDirection?: 'row' | 'column' | 'row-reverse' | 'column-reverse';
  justifyContent?: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around' | 'space-evenly';
  alignItems?: 'flex-start' | 'center' | 'flex-end' | 'stretch' | 'baseline';
  alignSelf?: 'auto' | 'flex-start' | 'center' | 'flex-end' | 'stretch' | 'baseline';

  // Grid Properties
  gridTemplateColumns?: string;
  gridTemplateRows?: string;
  gridColumn?: string;
  gridRow?: string;
  gridArea?: string;
  gridAutoColumns?: string;
  gridAutoRows?: string;
  gridAutoFlow?: string;
  rowGap?: string;
  columnGap?: string;

  // Overflow
  overflow?: 'visible' | 'hidden' | 'scroll' | 'auto';
  overflowX?: 'visible' | 'hidden' | 'scroll' | 'auto';
  overflowY?: 'visible' | 'hidden' | 'scroll' | 'auto';

  // Custom CSS as JSON string (fallback for advanced styling)
  customCSS?: string;
}

/**
 * Convert universal CSS props to React inline styles
 * Handles prop name mapping and value validation
 */
export function applyCSSProps(cssProps: Partial<UniversalCSSProps>): React.CSSProperties {
  const styles: React.CSSProperties = {};

  // Color properties
  if (cssProps.backgroundColor) styles.backgroundColor = cssProps.backgroundColor;
  if (cssProps.color) styles.color = cssProps.color;
  if (cssProps.textColor) styles.color = cssProps.textColor; // textColor is alias for color
  if (cssProps.borderColor) styles.borderColor = cssProps.borderColor;

  // Typography
  if (cssProps.fontSize) styles.fontSize = cssProps.fontSize;
  if (cssProps.fontFamily) styles.fontFamily = cssProps.fontFamily;
  if (cssProps.fontWeight) styles.fontWeight = cssProps.fontWeight;
  if (cssProps.textAlign) styles.textAlign = cssProps.textAlign;
  if (cssProps.lineHeight) styles.lineHeight = cssProps.lineHeight;

  // Spacing
  if (cssProps.padding) styles.padding = cssProps.padding;
  if (cssProps.margin) styles.margin = cssProps.margin;
  if (cssProps.gap) styles.gap = cssProps.gap;

  // Layout & Sizing
  if (cssProps.width) styles.width = cssProps.width;
  if (cssProps.height) styles.height = cssProps.height;
  if (cssProps.minWidth) styles.minWidth = cssProps.minWidth;
  if (cssProps.minHeight) styles.minHeight = cssProps.minHeight;
  if (cssProps.maxWidth) styles.maxWidth = cssProps.maxWidth;
  if (cssProps.maxHeight) styles.maxHeight = cssProps.maxHeight;

  // Borders & Effects
  if (cssProps.border) styles.border = cssProps.border;
  if (cssProps.borderRadius) styles.borderRadius = cssProps.borderRadius;
  if (cssProps.borderWidth) styles.borderWidth = cssProps.borderWidth;
  if (cssProps.boxShadow) styles.boxShadow = cssProps.boxShadow;
  if (cssProps.opacity !== undefined) styles.opacity = cssProps.opacity;

  // Positioning
  if (cssProps.position) styles.position = cssProps.position;
  if (cssProps.top) styles.top = cssProps.top;
  if (cssProps.right) styles.right = cssProps.right;
  if (cssProps.bottom) styles.bottom = cssProps.bottom;
  if (cssProps.left) styles.left = cssProps.left;
  if (cssProps.zIndex !== undefined) styles.zIndex = cssProps.zIndex;

  // Flexbox
  if (cssProps.display) styles.display = cssProps.display;
  if (cssProps.flexDirection) styles.flexDirection = cssProps.flexDirection;
  if (cssProps.justifyContent) styles.justifyContent = cssProps.justifyContent;
  if (cssProps.alignItems) styles.alignItems = cssProps.alignItems;
  if (cssProps.alignSelf) styles.alignSelf = cssProps.alignSelf;

  // Grid
  if (cssProps.gridTemplateColumns) styles.gridTemplateColumns = cssProps.gridTemplateColumns;
  if (cssProps.gridTemplateRows) styles.gridTemplateRows = cssProps.gridTemplateRows;
  if (cssProps.gridColumn) styles.gridColumn = cssProps.gridColumn;
  if (cssProps.gridRow) styles.gridRow = cssProps.gridRow;
  if (cssProps.gridArea) styles.gridArea = cssProps.gridArea;
  if (cssProps.gridAutoColumns) styles.gridAutoColumns = cssProps.gridAutoColumns;
  if (cssProps.gridAutoRows) styles.gridAutoRows = cssProps.gridAutoRows;
  if (cssProps.gridAutoFlow) styles.gridAutoFlow = cssProps.gridAutoFlow;
  if (cssProps.rowGap) styles.rowGap = cssProps.rowGap;
  if (cssProps.columnGap) styles.columnGap = cssProps.columnGap;

  // Overflow
  if (cssProps.overflow) styles.overflow = cssProps.overflow;
  if (cssProps.overflowX) styles.overflowX = cssProps.overflowX;
  if (cssProps.overflowY) styles.overflowY = cssProps.overflowY;

  // Custom CSS (parse JSON string)
  if (cssProps.customCSS) {
    try {
      const customStyles = JSON.parse(cssProps.customCSS);
      Object.assign(styles, customStyles);
    } catch (error) {
      console.warn('Invalid custom CSS JSON:', cssProps.customCSS, error);
    }
  }

  return styles;
}

/**
 * Parse inline style string (e.g., "position: absolute; left: 10px; top: 20px")
 * into a React.CSSProperties object
 */
function parseInlineStyleString(styleString: string): React.CSSProperties {
  const styles: React.CSSProperties = {};

  // Split by semicolons and parse each declaration
  const declarations = styleString.split(';').map(d => d.trim()).filter(Boolean);

  for (const declaration of declarations) {
    const colonIndex = declaration.indexOf(':');
    if (colonIndex === -1) continue;

    const property = declaration.substring(0, colonIndex).trim();
    const value = declaration.substring(colonIndex + 1).trim();

    // Convert CSS property name (kebab-case) to camelCase for React
    const camelCaseProperty = property.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());

    // Set the style property
    (styles as any)[camelCaseProperty] = value;
  }

  return styles;
}

/**
 * Separate CSS props from component-specific props
 * Useful for components that need to extract styling props from their full prop set
 */
export function separateCSSProps<T extends Record<string, any>>(
  props: T & Partial<UniversalCSSProps>
): { cssProps: Partial<UniversalCSSProps>; componentProps: Omit<T, keyof UniversalCSSProps> } {
  const cssPropertyNames: (keyof UniversalCSSProps)[] = [
    'backgroundColor', 'color', 'textColor', 'borderColor', 'accentColor',
    'fontSize', 'fontFamily', 'fontWeight', 'textAlign', 'lineHeight',
    'padding', 'margin', 'gap',
    'width', 'height', 'minWidth', 'minHeight', 'maxWidth', 'maxHeight',
    'border', 'borderRadius', 'borderWidth', 'boxShadow', 'opacity',
    'position', 'top', 'right', 'bottom', 'left', 'zIndex',
    'display', 'flexDirection', 'justifyContent', 'alignItems', 'alignSelf',
    'gridTemplateColumns', 'gridTemplateRows', 'gridColumn', 'gridRow', 'gridArea',
    'gridAutoColumns', 'gridAutoRows', 'gridAutoFlow', 'rowGap', 'columnGap',
    'overflow', 'overflowX', 'overflowY', 'customCSS'
  ];

  const cssProps: Partial<UniversalCSSProps> = {};
  const componentProps = { ...props } as any;

  for (const propName of cssPropertyNames) {
    if (propName in props) {
      (cssProps as any)[propName] = props[propName];
      delete componentProps[propName];
    }
  }

  // Handle inline style prop if present (from HTML generation)
  // This preserves positioning styles generated by pure-html-generator.ts
  if ('style' in props && props.style) {
    const styleValue = props.style;

    // If style is a string (from HTML attribute), parse it
    if (typeof styleValue === 'string') {
      const parsedStyles = parseInlineStyleString(styleValue);
      // Merge parsed styles into cssProps (they will override individual props)
      Object.assign(cssProps, parsedStyles);
    } else if (typeof styleValue === 'object') {
      // If style is already an object, merge it directly
      Object.assign(cssProps, styleValue);
    }

    // Remove style from componentProps since we've extracted it
    delete componentProps.style;
  }

  return { cssProps, componentProps };
}

/**
 * Remove Tailwind utility classes that conflict with CSS props
 * USER STYLING IS ALWAYS QUEEN - CSS props override Tailwind defaults
 *
 * @param baseClasses - String of Tailwind classes (space-separated)
 * @param cssProps - CSS properties that may override Tailwind
 * @returns Filtered class string with conflicting Tailwind classes removed
 */
export function removeTailwindConflicts(
  baseClasses: string,
  cssProps: Partial<UniversalCSSProps>
): string {
  const classes = baseClasses.split(' ').filter(Boolean);
  const filteredClasses: string[] = [];

  for (const className of classes) {
    let shouldKeep = true;

    // CRITICAL: When absolutely positioned, remove layout classes that conflict
    // Absolute positioning takes the element out of normal flow, making margin/flex irrelevant
    if (cssProps.position === 'absolute' || cssProps.position === 'fixed') {
      // Remove margin classes (they don't affect absolutely positioned elements)
      if (className.match(/^-?m[trblxy]?-/)) {
        shouldKeep = false;
      }
      // Remove flex parent classes that don't apply when absolutely positioned
      if (className.match(/^(flex-col|flex-row|items-|justify-|gap-)/)) {
        shouldKeep = false;
      }
    }

    // Color conflicts - remove Tailwind color if CSS color provided
    if (cssProps.color || cssProps.textColor) {
      if (className.startsWith('text-') && !className.startsWith('text-[') &&
          !className.match(/^text-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl)$/)) {
        shouldKeep = false; // Remove Tailwind text color classes
      }
    }

    // Background color conflicts
    if (cssProps.backgroundColor) {
      if (className.startsWith('bg-') && !className.startsWith('bg-[')) {
        shouldKeep = false; // Remove Tailwind bg color classes
      }
    }

    // Border color conflicts
    if (cssProps.borderColor) {
      if (className.startsWith('border-') && !className.match(/^border-(0|[1-8]|t-|r-|b-|l-)/) && !className.startsWith('border-[')) {
        shouldKeep = false; // Remove Tailwind border color classes
      }
    }

    // Padding conflicts
    if (cssProps.padding) {
      if (className.match(/^p[trblxy]?-/) && !className.startsWith('p-[')) {
        shouldKeep = false; // Remove all Tailwind padding classes
      }
    }

    // Margin conflicts
    if (cssProps.margin) {
      if (className.match(/^-?m[trblxy]?-/) && !className.startsWith('m-[')) {
        shouldKeep = false; // Remove all Tailwind margin classes
      }
    }

    // Width conflicts
    if (cssProps.width) {
      if (className.startsWith('w-') && !className.startsWith('w-[')) {
        shouldKeep = false;
      }
    }

    // Height conflicts
    if (cssProps.height) {
      if (className.startsWith('h-') && !className.startsWith('h-[')) {
        shouldKeep = false;
      }
    }

    // Border radius conflicts
    if (cssProps.borderRadius) {
      if (className.match(/^rounded/) && !className.startsWith('rounded-[')) {
        shouldKeep = false;
      }
    }

    // Font size conflicts
    if (cssProps.fontSize) {
      if (className.match(/^text-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl)$/)) {
        shouldKeep = false;
      }
    }

    // Font weight conflicts
    if (cssProps.fontWeight) {
      if (className.match(/^font-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black)$/)) {
        shouldKeep = false;
      }
    }

    // Opacity conflicts
    if (cssProps.opacity !== undefined) {
      if (className.match(/^opacity-/)) {
        shouldKeep = false;
      }
    }

    if (shouldKeep) {
      filteredClasses.push(className);
    }
  }

  return filteredClasses.join(' ');
}

/**
 * Merge default component styles with CSS props
 * Useful for components that have default styling that should be overridable
 */
export function mergeWithDefaults(
  defaultStyles: React.CSSProperties,
  cssProps: Partial<UniversalCSSProps>
): React.CSSProperties {
  return {
    ...defaultStyles,
    ...applyCSSProps(cssProps)
  };
}