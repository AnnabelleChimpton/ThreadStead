/**
 * P2.2: No Positioning Strategy
 *
 * Default fallback strategy that returns elements without positioning.
 * This is the lowest priority strategy (checked last).
 */

import React from 'react';
import type {
  PositioningStrategy,
  PositioningData,
  PositioningContext,
} from './PositioningStrategy';

/**
 * Strategy for components with no positioning data
 *
 * This is the fallback strategy that always returns true for canHandle(),
 * ensuring every component gets processed (even if just returned as-is).
 *
 * Priority: 999 (lowest - checked last)
 */
export class NoPositioningStrategy implements PositioningStrategy {
  readonly name = 'NoPositioning';
  readonly priority = 999;

  /**
   * This strategy handles everything as a fallback
   */
  canHandle(_data: PositioningData): boolean {
    return true; // Always true - this is the catch-all fallback
  }

  /**
   * Return element without modification
   */
  apply(
    element: React.ReactNode,
    _data: PositioningData,
    _context: PositioningContext
  ): React.ReactNode {
    return element;
  }
}
