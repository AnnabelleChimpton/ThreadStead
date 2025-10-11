/**
 * P2.2: Size-Only Strategy
 *
 * Handles components that have size information (_size prop) but no positioning data.
 * Creates a wrapper with width/height styles without absolute/grid positioning.
 *
 * Format:
 * ```typescript
 * island.props._size = {
 *   width: '300px',  // or number
 *   height: '200px'  // or number
 * }
 * ```
 */

import React from 'react';
import type {
  PositioningStrategy,
  PositioningData,
  PositioningContext,
  ComponentSize,
} from './PositioningStrategy';
import { createSizeWrapper } from './positioning-utils';

/**
 * Strategy for components with size but no positioning
 *
 * Priority: 50 (checked after all positioning strategies)
 */
export class SizeOnlyStrategy implements PositioningStrategy {
  readonly name = 'SizeOnly';
  readonly priority = 50;

  /**
   * Check if island has _size but no positioning data
   *
   * Returns true if:
   * - Has _size prop with width or height
   * - Does NOT have _positioning data
   */
  canHandle(data: PositioningData): boolean {
    const { island } = data;

    // Must have _size
    if (!island.props._size || typeof island.props._size !== 'object') {
      return false;
    }

    // Must NOT have _positioning (that's handled by other strategies)
    if (island.props._positioning) {
      return false;
    }

    // Check if _size has width or height
    const size = island.props._size as ComponentSize;
    const hasSize = size.width !== undefined || size.height !== undefined;

    return hasSize;
  }

  /**
   * Apply size-only wrapper
   */
  apply(
    element: React.ReactNode,
    data: PositioningData,
    _context: PositioningContext
  ): React.ReactNode {
    const size = data.island.props._size as ComponentSize;

    // Create wrapper with size styles
    return createSizeWrapper(element, size, data.island.id);
  }
}
