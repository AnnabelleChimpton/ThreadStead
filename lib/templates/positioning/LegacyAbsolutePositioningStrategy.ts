/**
 * P2.2: Legacy Absolute Positioning Strategy
 *
 * Handles old absolute positioning format with direct x, y, zIndex properties.
 *
 * Formats handled:
 * 1. `mode: 'absolute'` with x, y, zIndex
 * 2. `isResponsive: false` with x, y, zIndex
 *
 * Example:
 * ```typescript
 * island.props._positioning = {
 *   mode: 'absolute',
 *   x: 100,
 *   y: 200,
 *   zIndex: 5
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
 * Legacy absolute positioning data format
 */
interface LegacyAbsolutePositioningData {
  mode?: 'absolute';
  isResponsive?: false;
  x: number | string;
  y: number | string;
  zIndex?: number;
  width?: number;
  height?: number;
}

/**
 * Strategy for legacy absolute positioning
 *
 * Priority: 20 (checked second, after responsive)
 */
export class LegacyAbsolutePositioningStrategy implements PositioningStrategy {
  readonly name = 'LegacyAbsolutePositioning';
  readonly priority = 20;

  /**
   * Check if island has legacy absolute positioning
   *
   * Returns true if:
   * - Has _positioning.mode === 'absolute', OR
   * - Has _positioning.isResponsive === false
   */
  canHandle(data: PositioningData): boolean {
    const positioningData = data.island.props._positioning;

    // Must have positioning data
    if (!positioningData || typeof positioningData !== 'object') {
      return false;
    }

    // Don't handle if it has breakpoints (that's ResponsivePositioningStrategy)
    if ('breakpoints' in positioningData) {
      return false;
    }

    // Check for legacy formats
    const hasAbsoluteMode = positioningData.mode === 'absolute';
    const isNonResponsive = positioningData.isResponsive === false;

    if (!hasAbsoluteMode && !isNonResponsive) {
      return false;
    }

    // Must have x and y coordinates
    const hasCoordinates = 'x' in positioningData && 'y' in positioningData;
    if (!hasCoordinates) {
      return false;
    }

    // Must not be a nested component
    return shouldApplyPositioning(data.isNestedComponent, true);
  }

  /**
   * Apply legacy absolute positioning
   */
  apply(
    element: React.ReactNode,
    data: PositioningData,
    context: PositioningContext
  ): React.ReactNode {
    const positioningData = data.island.props._positioning as LegacyAbsolutePositioningData;

    // Parse position values (handles both numbers and "123px" strings)
    const x = parsePositionValue(positioningData.x);
    const y = parsePositionValue(positioningData.y);

    // Get z-index with component-specific special cases
    const baseZIndex = positioningData.zIndex || 1;
    const zIndex = getComponentZIndex(context.componentType, baseZIndex);

    // Extract width/height if available (from Visual Builder)
    const width = positioningData.width;
    const height = positioningData.height;

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
