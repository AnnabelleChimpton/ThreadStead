/**
 * P2.2: Positioning Utilities
 *
 * Shared helper functions for positioning strategies.
 * Extracted from HTMLIslandHydration.tsx to reduce duplication.
 */

import React from 'react';
import type { ComponentSize } from './PositioningStrategy';
import { getComponentSizingCategory } from '@/lib/templates/visual-builder/grid-utils';

/**
 * Parse position value that can be either a number or a string with 'px' suffix
 *
 * Examples:
 * - 100 → 100
 * - "100px" → 100
 * - "100" → 100
 *
 * @param value - Value to parse
 * @returns Parsed number value
 */
export function parsePositionValue(value: any): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    // Remove 'px' suffix if present and parse as number
    return parseInt(value.replace(/px$/, ''), 10) || 0;
  }
  return 0;
}

/**
 * Create a positioned wrapper element with absolute positioning
 * Uses category-based sizing to match Visual Builder behavior
 *
 * @param element - Element to wrap
 * @param x - X coordinate in pixels
 * @param y - Y coordinate in pixels
 * @param zIndex - Z-index value
 * @param key - React key
 * @param dataAttributes - Additional data attributes
 * @param width - Optional width in pixels or CSS string
 * @param height - Optional height in pixels or CSS string
 * @param componentType - Component type for category-based sizing (e.g., 'Paragraph', 'ThreadsteadNavigation')
 * @returns Wrapped element
 */
export function createAbsoluteWrapper(
  element: React.ReactNode,
  x: number,
  y: number,
  zIndex: number,
  key: string,
  dataAttributes?: Record<string, string>,
  width?: number | string,
  height?: number | string,
  componentType?: string
): React.ReactNode {
  // Determine component category for sizing strategy
  const category = componentType ? getComponentSizingCategory(componentType) : 'fixed';
  const isNavigation = componentType?.toLowerCase().includes('navigation') || false;

  const containerStyle: React.CSSProperties = {
    position: 'absolute',
    top: `${y}px`,
    zIndex,
  };

  // Apply category-based sizing (matches Visual Builder logic)
  if (category === 'full-width' || isNavigation) {
    // Full-width components like ThreadsteadNavigation
    containerStyle.left = 0; // Always left-aligned
    containerStyle.width = '100%';
    containerStyle.height = 'auto';
    containerStyle.minHeight = '70px';
    containerStyle.maxHeight = '100px';
    // Override zIndex for navigation to ensure it stays on top
    if (isNavigation) {
      containerStyle.zIndex = 100;
    }
  } else if (category === 'content-driven') {
    // Content-driven components (Paragraph, TextElement, ProfileHero) use flexible sizing
    containerStyle.left = `${x}px`;

    // Parse width/height to numbers
    const widthNum = typeof width === 'number' ? width : (width ? parseInt(String(width).replace(/px$/, ''), 10) : 200);
    const heightNum = typeof height === 'number' ? height : (height ? parseInt(String(height).replace(/px$/, ''), 10) : 150);

    containerStyle.width = 'fit-content';
    containerStyle.height = 'fit-content';
    containerStyle.minWidth = `${widthNum}px`;
    containerStyle.minHeight = `${heightNum}px`;
    containerStyle.maxWidth = `${Math.min(Math.max(widthNum * 1.5, 400), 600)}px`;
  } else if (category === 'auto-size' || category === 'square') {
    // Auto-size and square components (ProfilePhoto, etc.) use natural sizing
    // NO width/height constraints - let component render at its natural size
    containerStyle.left = `${x}px`;
    // Don't set width or height - component determines its own size
  } else {
    // Fixed sizing for other components (Button, Card, etc.)
    containerStyle.left = `${x}px`;

    if (width !== undefined) {
      containerStyle.width = typeof width === 'number' ? `${width}px` : width;
    }
    if (height !== undefined) {
      containerStyle.height = typeof height === 'number' ? `${height}px` : height;
    }
  }

  return React.createElement(
    'div',
    {
      key,
      style: containerStyle,
      ...dataAttributes,
    },
    element
  );
}

/**
 * Create a grid-positioned wrapper element
 *
 * @param element - Element to wrap
 * @param column - Grid column start
 * @param row - Grid row start
 * @param span - Column span (default 1)
 * @param zIndex - Z-index value (default 1)
 * @param key - React key
 * @param dataAttributes - Additional data attributes
 * @returns Wrapped element
 */
export function createGridWrapper(
  element: React.ReactNode,
  column: number,
  row: number,
  span: number = 1,
  zIndex: number = 1,
  key: string,
  dataAttributes?: Record<string, string>
): React.ReactNode {
  const gridStyle: React.CSSProperties = {
    gridColumn: `${column} / span ${span}`,
    gridRow: `${row} / span 1`,
    zIndex,
  };

  return React.createElement(
    'div',
    {
      key,
      style: gridStyle,
      ...dataAttributes,
    },
    element
  );
}

/**
 * Create a size-only wrapper (width/height without positioning)
 *
 * @param element - Element to wrap
 * @param size - Component size
 * @param key - React key
 * @returns Wrapped element or original element if no size
 */
export function createSizeWrapper(
  element: React.ReactNode,
  size: ComponentSize | undefined,
  key: string
): React.ReactNode {
  if (!size) return element;

  const containerStyle: React.CSSProperties = {};

  if (size.width && size.width !== 'auto') {
    containerStyle.width = typeof size.width === 'number' ? `${size.width}px` : size.width;
  }
  if (size.height && size.height !== 'auto') {
    containerStyle.height = typeof size.height === 'number' ? `${size.height}px` : size.height;
  }

  // Only create wrapper if we have styles to apply
  if (Object.keys(containerStyle).length === 0) {
    return element;
  }

  return React.createElement('div', { key, style: containerStyle }, element);
}

/**
 * Get special z-index for specific component types
 *
 * Some components require specific z-index values:
 * - ThreadsteadNavigation: 999998 (highest, so dropdowns render above everything)
 *
 * @param componentType - Component type (lowercase)
 * @param defaultZIndex - Default z-index if no special case
 * @returns Z-index value
 */
export function getComponentZIndex(componentType: string, defaultZIndex: number = 1): number {
  const normalizedType = componentType.toLowerCase();

  // ThreadsteadNavigation gets highest z-index so dropdowns render above other components
  if (normalizedType === 'threadsteadnavigation') {
    return 999998;
  }

  return defaultZIndex;
}

/**
 * Check if a component should be positioned (not nested)
 *
 * Nested components should render naturally within their parent containers
 * without positioning wrappers.
 *
 * @param isNestedComponent - Whether component is nested
 * @param hasPositioningData - Whether component has positioning data
 * @returns true if positioning should be applied
 */
export function shouldApplyPositioning(
  isNestedComponent: boolean,
  hasPositioningData: boolean
): boolean {
  return !isNestedComponent && hasPositioningData;
}

/**
 * Parse style string into React CSSProperties object
 * Extracted from DOMConversionUtils for consistency
 *
 * @param styleString - CSS style string
 * @returns React CSSProperties object
 */
export function parseStyleString(styleString: string): React.CSSProperties {
  const styles: React.CSSProperties = {};

  if (!styleString) return styles;

  const declarations = styleString.split(';');
  for (const declaration of declarations) {
    const [property, value] = declaration.split(':').map((s) => s.trim());
    if (property && value) {
      // Convert kebab-case to camelCase
      const camelProperty = property.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
      (styles as any)[camelProperty] = value;
    }
  }

  return styles;
}
