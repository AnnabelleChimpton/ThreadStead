/**
 * P2.2: Responsive Positioning Strategy
 *
 * Handles breakpoint-based responsive positioning.
 * Currently uses desktop breakpoint, but designed for future full responsive support.
 *
 * Format:
 * ```typescript
 * island.props._positioning = {
 *   breakpoints: {
 *     desktop: { x: 100, y: 200, zIndex: 5 },
 *     tablet: { x: 50, y: 100, zIndex: 5 },
 *     mobile: { x: 10, y: 20, zIndex: 5 }
 *   }
 * }
 * ```
 */

import React from 'react';
import type {
  PositioningStrategy,
  PositioningData,
  PositioningContext,
} from './PositioningStrategy';
import {
  parsePositionValue,
  createAbsoluteWrapper,
  getComponentZIndex,
  shouldApplyPositioning,
} from './positioning-utils';

/**
 * Breakpoint data format
 */
interface BreakpointData {
  x: number | string;
  y: number | string;
  zIndex?: number;
  width?: number;
  height?: number;
}

/**
 * Responsive positioning data format
 */
interface ResponsivePositioningData {
  breakpoints: {
    desktop: BreakpointData;
    tablet?: BreakpointData;
    mobile?: BreakpointData;
  };
}

/**
 * Strategy for breakpoint-based responsive positioning
 *
 * Priority: 10 (highest - checked first)
 */
export class ResponsivePositioningStrategy implements PositioningStrategy {
  readonly name = 'ResponsivePositioning';
  readonly priority = 10;

  /**
   * Check if island has responsive positioning data (breakpoints property)
   */
  canHandle(data: PositioningData): boolean {
    const positioningData = data.island.props._positioning;

    // Must have positioning data with breakpoints
    if (!positioningData || typeof positioningData !== 'object') {
      return false;
    }

    // Check for breakpoints property
    const hasBreakpoints = 'breakpoints' in positioningData;
    if (!hasBreakpoints) {
      return false;
    }

    // Must not be a nested component (nested components don't get positioned)
    return shouldApplyPositioning(data.isNestedComponent, true);
  }

  /**
   * Apply responsive positioning
   *
   * Currently uses desktop breakpoint. Future enhancement will use
   * CSS media queries or client-side breakpoint detection for true
   * responsive positioning.
   */
  apply(
    element: React.ReactNode,
    data: PositioningData,
    context: PositioningContext
  ): React.ReactNode {
    const positioningData = data.island.props._positioning as ResponsivePositioningData;

    // Extract desktop breakpoint data (Phase 4.2: Future - use current breakpoint)
    const breakpointData = positioningData.breakpoints.desktop;

    // Parse position values (handles both numbers and "123px" strings)
    const x = parsePositionValue(breakpointData.x);
    const y = parsePositionValue(breakpointData.y);

    // Get z-index with component-specific special cases
    const baseZIndex = breakpointData.zIndex || 1;
    const zIndex = getComponentZIndex(context.componentType, baseZIndex);

    // Extract width/height if available (from Visual Builder)
    const width = breakpointData.width;
    const height = breakpointData.height;

    // Create absolute positioned wrapper with dimensions
    // Pass componentType for category-based sizing (matches Visual Builder)
    return createAbsoluteWrapper(
      element,
      x,
      y,
      zIndex,
      data.island.id,
      { 'data-component-id': data.island.id },
      width,
      height,
      data.island.component // Pass component type for sizing category
    );
  }
}
