/**
 * P2.2: Grid Positioning Strategy
 *
 * Handles CSS grid-based positioning with column, row, and span values.
 *
 * Format:
 * ```typescript
 * island.props._positioning = {
 *   mode: 'grid',
 *   column: 2,
 *   row: 3,
 *   span: 4
 * }
 * ```
 */

import React from 'react';
import type {
  PositioningStrategy,
  PositioningData,
  PositioningContext,
} from './PositioningStrategy';
import { createGridWrapper, shouldApplyPositioning } from './positioning-utils';

/**
 * Grid positioning data format
 */
interface GridPositioningData {
  mode: 'grid';
  column: number;
  row: number;
  span?: number;
}

/**
 * Strategy for CSS grid positioning
 *
 * Priority: 30 (checked third)
 */
export class GridPositioningStrategy implements PositioningStrategy {
  readonly name = 'GridPositioning';
  readonly priority = 30;

  /**
   * Check if island has grid positioning
   *
   * Returns true if:
   * - Has _positioning.mode === 'grid'
   * - Has column and row properties
   */
  canHandle(data: PositioningData): boolean {
    const positioningData = data.island.props._positioning;

    // Must have positioning data
    if (!positioningData || typeof positioningData !== 'object') {
      return false;
    }

    // Check for grid mode
    if (positioningData.mode !== 'grid') {
      return false;
    }

    // Must have column and row
    const hasGridCoordinates = 'column' in positioningData && 'row' in positioningData;
    if (!hasGridCoordinates) {
      return false;
    }

    // Must not be a nested component
    return shouldApplyPositioning(data.isNestedComponent, true);
  }

  /**
   * Apply grid positioning
   */
  apply(
    element: React.ReactNode,
    data: PositioningData,
    _context: PositioningContext
  ): React.ReactNode {
    const positioningData = data.island.props._positioning as GridPositioningData;

    const column = positioningData.column;
    const row = positioningData.row;
    const span = positioningData.span || 1;

    // Create grid positioned wrapper
    return createGridWrapper(
      element,
      column,
      row,
      span,
      1, // Default z-index for grid items
      data.island.id,
      { 'data-component-id': data.island.id }
    );
  }
}
