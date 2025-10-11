/**
 * P2.2: Positioning Strategy Pattern
 *
 * Base interfaces and types for positioning strategies.
 * This pattern eliminates 30+ conditional branches in domToReact by
 * delegating positioning logic to specialized strategy classes.
 */

import React from 'react';
import type { Island } from '@/lib/templates/compilation/compiler';

/**
 * Component size information
 */
export interface ComponentSize {
  width?: string | number;
  height?: string | number;
}

/**
 * Data passed to positioning strategies
 */
export interface PositioningData {
  /** The island component to position */
  island: Island;

  /** Whether this is a nested component (nested components don't get positioned) */
  isNestedComponent: boolean;

  /** Component-specific attributes (for attribute-based positioning) */
  attributes?: Record<string, any>;
}

/**
 * Context information for positioning
 */
export interface PositioningContext {
  /** Component type (lowercase, e.g., 'threadsteadnavigation') */
  componentType: string;

  /** Unique island ID */
  islandId: string;

  /** Optional size information from _size prop */
  size?: ComponentSize;
}

/**
 * Result from applying a positioning strategy
 */
export interface PositioningResult {
  /** The positioned element (may be wrapped) */
  element: React.ReactNode;

  /** Whether positioning was applied */
  positioned: boolean;

  /** Strategy name that was used */
  strategyName: string;
}

/**
 * Base interface for all positioning strategies
 *
 * Each strategy handles a specific positioning format:
 * - ResponsivePositioningStrategy: Breakpoint-based responsive positioning
 * - LegacyAbsolutePositioningStrategy: Old absolute x/y positioning
 * - GridPositioningStrategy: CSS grid positioning
 * - AttributePositioningStrategy: Data-attribute based positioning
 * - SizeOnlyStrategy: Components with _size but no positioning
 * - NoPositioningStrategy: Default passthrough
 */
export interface PositioningStrategy {
  /** Strategy name for debugging */
  readonly name: string;

  /** Priority (lower = higher priority, checked first) */
  readonly priority: number;

  /**
   * Check if this strategy can handle the given positioning data
   *
   * @param data - Positioning data to check
   * @returns true if this strategy can handle this data
   */
  canHandle(data: PositioningData): boolean;

  /**
   * Apply positioning to the element
   *
   * @param element - The React element to position
   * @param data - Positioning data
   * @param context - Positioning context
   * @returns Positioned element (may be wrapped in a container)
   */
  apply(
    element: React.ReactNode,
    data: PositioningData,
    context: PositioningContext
  ): React.ReactNode;
}

/**
 * Registry for managing positioning strategies
 *
 * Strategies are checked in priority order. The first strategy
 * that returns true from canHandle() will be used.
 */
export class PositioningRegistry {
  private strategies: PositioningStrategy[] = [];

  /**
   * Register a positioning strategy
   *
   * @param strategy - Strategy to register
   */
  register(strategy: PositioningStrategy): void {
    this.strategies.push(strategy);
    // Sort by priority (lower number = higher priority)
    this.strategies.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Apply positioning to an element using the appropriate strategy
   *
   * @param element - Element to position
   * @param data - Positioning data
   * @param context - Positioning context
   * @returns Positioned element
   */
  applyPositioning(
    element: React.ReactNode,
    data: PositioningData,
    context: PositioningContext
  ): React.ReactNode {
    // Find first strategy that can handle this data
    for (const strategy of this.strategies) {
      if (strategy.canHandle(data)) {
        return strategy.apply(element, data, context);
      }
    }

    // No strategy found - return element as-is (should never happen with NoPositioningStrategy)
    console.warn('[PositioningRegistry] No strategy found for positioning data:', data);
    return element;
  }

  /**
   * Get all registered strategies (for debugging)
   */
  getStrategies(): ReadonlyArray<PositioningStrategy> {
    return this.strategies;
  }

  /**
   * Clear all registered strategies (for testing)
   */
  clear(): void {
    this.strategies = [];
  }
}
