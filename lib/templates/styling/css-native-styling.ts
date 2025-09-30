/**
 * CSS-Native Styling System
 *
 * Replaces the complex universal styling system with a simple, predictable
 * approach that maps directly to CSS properties. No custom abstractions,
 * no complex mappings - just CSS.
 */

import { CSSProperties } from 'react';
import { StandardComponentProps } from '../core/standard-component-interface';

/**
 * Type for CSS properties that can be passed as props
 * This includes all standard CSS properties plus our advanced css prop
 */
export interface CSSNativeProps {
  // Standard CSS properties as props for convenience
  backgroundColor?: string;
  color?: string;
  fontSize?: string;
  fontFamily?: string;
  fontWeight?: string | number;
  textAlign?: 'left' | 'center' | 'right' | 'justify' | 'start' | 'end';
  lineHeight?: string | number;
  padding?: string;
  margin?: string;
  border?: string;
  borderRadius?: string;
  boxShadow?: string;
  opacity?: string | number;

  // Positioning
  position?: 'static' | 'relative' | 'absolute' | 'fixed' | 'sticky';
  top?: string;
  right?: string;
  bottom?: string;
  left?: string;
  width?: string;
  height?: string;
  minWidth?: string;
  minHeight?: string;
  maxWidth?: string;
  maxHeight?: string;
  zIndex?: number;

  // Layout
  display?: string;
  flexDirection?: 'row' | 'column' | 'row-reverse' | 'column-reverse';
  justifyContent?:
    | 'flex-start'
    | 'flex-end'
    | 'center'
    | 'space-between'
    | 'space-around'
    | 'space-evenly'
    | 'start'
    | 'end';
  alignItems?: 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline' | 'start' | 'end';
  alignContent?: 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'space-between' | 'space-around';
  gap?: string;
  flexWrap?: 'nowrap' | 'wrap' | 'wrap-reverse';
  flex?: string | number;
  flexGrow?: number;
  flexShrink?: number;
  flexBasis?: string;

  // Grid
  gridTemplateColumns?: string;
  gridTemplateRows?: string;
  gridColumn?: string;
  gridRow?: string;
  gridArea?: string;
  gridGap?: string;
  gridColumnGap?: string;
  gridRowGap?: string;

  // Advanced CSS for complex styling
  css?: CSSProperties;
}

/**
 * Extract CSS properties from component props
 * This is the main function that converts props to CSS styles
 */
export function extractCSSFromProps(props: StandardComponentProps): CSSProperties {
  const style: CSSProperties = { ...props.style };

  // Map standard CSS props directly (no complex logic needed!)
  if (props.backgroundColor !== undefined) style.backgroundColor = props.backgroundColor;
  if (props.color !== undefined) style.color = props.color;
  if (props.fontSize !== undefined) style.fontSize = props.fontSize;
  if (props.fontFamily !== undefined) style.fontFamily = props.fontFamily;
  if (props.fontWeight !== undefined) style.fontWeight = props.fontWeight;
  if (props.textAlign !== undefined) style.textAlign = props.textAlign;
  if (props.padding !== undefined) style.padding = props.padding;
  if (props.margin !== undefined) style.margin = props.margin;
  if (props.border !== undefined) style.border = props.border;
  if (props.borderRadius !== undefined) style.borderRadius = props.borderRadius;
  if (props.boxShadow !== undefined) style.boxShadow = props.boxShadow;
  if (props.opacity !== undefined) style.opacity = props.opacity;

  // Positioning
  if (props.position !== undefined) style.position = props.position;
  if (props.top !== undefined) style.top = props.top;
  if (props.right !== undefined) style.right = props.right;
  if (props.bottom !== undefined) style.bottom = props.bottom;
  if (props.left !== undefined) style.left = props.left;
  if (props.width !== undefined) style.width = props.width;
  if (props.height !== undefined) style.height = props.height;
  if (props.minWidth !== undefined) style.minWidth = props.minWidth;
  if (props.minHeight !== undefined) style.minHeight = props.minHeight;
  if (props.maxWidth !== undefined) style.maxWidth = props.maxWidth;
  if (props.maxHeight !== undefined) style.maxHeight = props.maxHeight;
  if (props.zIndex !== undefined) style.zIndex = props.zIndex;

  // Layout
  if (props.display !== undefined) style.display = props.display;
  if (props.flexDirection !== undefined) style.flexDirection = props.flexDirection;
  if (props.justifyContent !== undefined) style.justifyContent = props.justifyContent;
  if (props.alignItems !== undefined) style.alignItems = props.alignItems;
  if (props.gap !== undefined) style.gap = props.gap;
  if (props.gridTemplateColumns !== undefined) style.gridTemplateColumns = props.gridTemplateColumns;
  if (props.gridTemplateRows !== undefined) style.gridTemplateRows = props.gridTemplateRows;
  if (props.gridColumn !== undefined) style.gridColumn = props.gridColumn;
  if (props.gridRow !== undefined) style.gridRow = props.gridRow;

  // Advanced CSS override (applied last to allow overrides)
  if (props.css) {
    Object.assign(style, props.css);
  }

  return style;
}

/**
 * Hook for components to easily get CSS styles from props
 * This is the main hook components should use
 */
export function useCSSNativeStyles(props: StandardComponentProps): CSSProperties {
  return extractCSSFromProps(props);
}

/**
 * Utility to validate CSS values
 * Helps catch common mistakes during development
 */
export function validateCSSValue(property: string, value: any): boolean {
  if (value === undefined || value === null) return true;

  // Common validations
  switch (property) {
    case 'opacity':
      const opacity = typeof value === 'string' ? parseFloat(value) : value;
      return opacity >= 0 && opacity <= 1;

    case 'zIndex':
      return Number.isInteger(value);

    case 'fontSize':
    case 'padding':
    case 'margin':
    case 'width':
    case 'height':
      // Should be a valid CSS length value
      if (typeof value === 'string') {
        return /^(\d+(\.\d+)?(px|em|rem|%|vh|vw|ch|ex|cm|mm|in|pt|pc)|0|auto|inherit|initial|unset)$/.test(value);
      }
      return false;

    case 'color':
    case 'backgroundColor':
      // Should be a valid CSS color value
      if (typeof value === 'string') {
        return /^(#[0-9a-fA-F]{3,8}|rgb\(|rgba\(|hsl\(|hsla\(|[a-zA-Z]+|transparent|currentColor|inherit|initial|unset)/.test(value);
      }
      return false;

    default:
      return true; // Allow other values through
  }
}

/**
 * Development helper to validate all CSS props
 * Only runs in development mode
 */
export function validateCSSProps(props: StandardComponentProps): void {
  if (process.env.NODE_ENV !== 'development') return;

  const cssProps: Array<keyof StandardComponentProps> = [
    'backgroundColor', 'color', 'fontSize', 'fontFamily', 'fontWeight',
    'textAlign', 'padding', 'margin', 'border', 'borderRadius',
    'boxShadow', 'opacity', 'position', 'top', 'right', 'bottom',
    'left', 'width', 'height', 'minWidth', 'minHeight', 'maxWidth',
    'maxHeight', 'zIndex', 'display', 'flexDirection', 'justifyContent',
    'alignItems', 'gap', 'gridTemplateColumns', 'gridTemplateRows',
    'gridColumn', 'gridRow'
  ];

  cssProps.forEach(prop => {
    const value = props[prop];
    if (value !== undefined && !validateCSSValue(prop, value)) {
      console.warn(`⚠️ Invalid CSS value for ${prop}: ${value}`);
    }
  });
}

/**
 * Utility to create responsive styles using CSS-in-JS
 * Provides a simple way to create media queries
 */
export function createResponsiveStyles(
  breakpoints: Record<string, CSSProperties>
): CSSProperties {
  const responsiveCSS: CSSProperties = {};

  Object.entries(breakpoints).forEach(([breakpoint, styles]) => {
    switch (breakpoint) {
      case 'mobile':
        Object.assign(responsiveCSS, {
          '@media (max-width: 767px)': styles
        } as any);
        break;

      case 'tablet':
        Object.assign(responsiveCSS, {
          '@media (min-width: 768px) and (max-width: 1023px)': styles
        } as any);
        break;

      case 'desktop':
        Object.assign(responsiveCSS, {
          '@media (min-width: 1024px)': styles
        } as any);
        break;

      default:
        // Custom breakpoint
        Object.assign(responsiveCSS, {
          [`@media ${breakpoint}`]: styles
        } as any);
        break;
    }
  });

  return responsiveCSS;
}

/**
 * Pre-built responsive helper for common patterns
 */
export function responsive(styles: {
  mobile?: CSSProperties;
  tablet?: CSSProperties;
  desktop?: CSSProperties;
  base?: CSSProperties;
}): CSSProperties {
  const { base = {}, ...breakpointStyles } = styles;

  return {
    ...base,
    ...createResponsiveStyles(breakpointStyles)
  };
}

/**
 * Utility for creating Tailwind-style spacing values
 * Maps numeric values to rem units for consistency
 */
export function spacing(value: number | string): string {
  if (typeof value === 'string') return value;

  // Convert numeric values to rem (1 = 0.25rem, like Tailwind)
  return `${value * 0.25}rem`;
}

/**
 * Color utility functions for common color manipulations
 */
export const colorUtils = {
  /**
   * Convert hex to rgba with opacity
   */
  hexToRgba(hex: string, opacity: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  },

  /**
   * Lighten a hex color
   */
  lighten(hex: string, amount: number): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * amount);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
      (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
  },

  /**
   * Darken a hex color
   */
  darken(hex: string, amount: number): string {
    return this.lighten(hex, -amount);
  }
};

/**
 * Export everything for easy importing
 */
export {
  extractCSSFromProps as processCSSNativeStyles, // Alias for backward compatibility
};