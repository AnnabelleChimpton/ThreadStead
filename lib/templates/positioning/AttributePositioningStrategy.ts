/**
 * P2.2: Attribute Positioning Strategy
 *
 * Handles data-attribute based positioning for registered components.
 * This is the most complex strategy as it handles legacy attribute formats.
 *
 * Formats handled:
 * 1. `data-positioning-mode="absolute"` with `data-pixel-position` (JSON)
 * 2. `data-positioning-mode="absolute"` with `data-position` ("x,y" format)
 * 3. Includes optional _size width/height
 *
 * Example:
 * ```html
 * <Component
 *   data-positioning-mode="absolute"
 *   data-pixel-position='{"x": 100, "y": 200, "positioning": "absolute"}'
 *   data-size='{"width": "300px", "height": "200px"}'
 * />
 * ```
 */

import React from 'react';
import type {
  PositioningStrategy,
  PositioningData,
  PositioningContext,
  ComponentSize,
} from './PositioningStrategy';
import { shouldApplyPositioning } from './positioning-utils';

/**
 * Pixel position data format
 */
interface PixelPosition {
  x: number;
  y: number;
  positioning?: 'absolute';
}

/**
 * Strategy for attribute-based positioning
 *
 * Priority: 40 (checked fourth, before SizeOnly)
 *
 * NOTE: This strategy is primarily for registered components (not islands)
 * that use data attributes for positioning.
 */
export class AttributePositioningStrategy implements PositioningStrategy {
  readonly name = 'AttributePositioning';
  readonly priority = 40;

  /**
   * Check if component has data-positioning-mode="absolute"
   */
  canHandle(data: PositioningData): boolean {
    // This strategy requires attributes to be passed
    if (!data.attributes) {
      return false;
    }

    const attrs = data.attributes;

    // Check for positioning mode attribute (both formats)
    const positioningMode =
      attrs['data-positioning-mode'] || attrs['dataPositioningMode'];

    if (positioningMode !== 'absolute') {
      return false;
    }

    // Must not be a nested component
    return shouldApplyPositioning(data.isNestedComponent, true);
  }

  /**
   * Apply attribute-based positioning
   */
  apply(
    element: React.ReactNode,
    data: PositioningData,
    context: PositioningContext
  ): React.ReactNode {
    const attrs = data.attributes!;

    // Extract position data
    let pixelPosition: PixelPosition | undefined;

    // Try JSON format first (data-pixel-position)
    const pixelPositionData =
      attrs['data-pixel-position'] || attrs['dataPixelPosition'];

    if (pixelPositionData) {
      try {
        pixelPosition = JSON.parse(String(pixelPositionData));
      } catch (e) {
        // Failed to parse JSON - will try simple format below
      }
    }

    // Fallback to simple "x,y" format (data-position)
    if (!pixelPosition) {
      const positionData = attrs['data-position'] || attrs['dataPosition'];
      if (positionData) {
        const [x, y] = String(positionData).split(',').map(Number);
        if (!isNaN(x) && !isNaN(y)) {
          pixelPosition = { x, y, positioning: 'absolute' };
        }
      }
    }

    // If we don't have valid position data, return element as-is
    if (
      !pixelPosition ||
      typeof pixelPosition.x !== 'number' ||
      typeof pixelPosition.y !== 'number'
    ) {
      return element;
    }

    // Build container style
    const containerStyle: React.CSSProperties = {
      position: 'absolute',
      left: `${pixelPosition.x}px`,
      top: `${pixelPosition.y}px`,
      zIndex: 1,
    };

    // Apply size from context if available
    if (context.size) {
      if (context.size.width && context.size.width !== 'auto') {
        containerStyle.width =
          typeof context.size.width === 'number'
            ? `${context.size.width}px`
            : context.size.width;
      }
      if (context.size.height && context.size.height !== 'auto') {
        containerStyle.height =
          typeof context.size.height === 'number'
            ? `${context.size.height}px`
            : context.size.height;
      }
    }

    // Create wrapper with className from attributes
    const className = attrs.className as string | undefined;

    return React.createElement(
      'div',
      {
        key: context.islandId,
        style: containerStyle,
        className,
      },
      element
    );
  }
}
