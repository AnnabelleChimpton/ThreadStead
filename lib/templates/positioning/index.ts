/**
 * P2.2: Positioning Strategy Pattern - Main Entry Point
 *
 * This file exports all positioning strategies and provides a singleton
 * registry for applying positioning strategies to components.
 *
 * Usage:
 * ```typescript
 * import { positioningRegistry } from '@/lib/templates/positioning';
 *
 * const positioned = positioningRegistry.applyPositioning(
 *   element,
 *   { island, isNestedComponent },
 *   { componentType, islandId }
 * );
 * ```
 */

// Export core types and interfaces
export type {
  PositioningStrategy,
  PositioningData,
  PositioningContext,
  PositioningResult,
  ComponentSize,
} from './PositioningStrategy';

export { PositioningRegistry } from './PositioningStrategy';

// Export utility functions
export * from './positioning-utils';

// Export strategies
export { NoPositioningStrategy } from './NoPositioningStrategy';
export { ResponsivePositioningStrategy } from './ResponsivePositioningStrategy';
export { LegacyAbsolutePositioningStrategy } from './LegacyAbsolutePositioningStrategy';
export { GridPositioningStrategy } from './GridPositioningStrategy';
export { AttributePositioningStrategy } from './AttributePositioningStrategy';
export { SizeOnlyStrategy } from './SizeOnlyStrategy';

// Create and configure singleton registry
import { PositioningRegistry } from './PositioningStrategy';
import { NoPositioningStrategy } from './NoPositioningStrategy';
import { ResponsivePositioningStrategy } from './ResponsivePositioningStrategy';
import { LegacyAbsolutePositioningStrategy } from './LegacyAbsolutePositioningStrategy';
import { GridPositioningStrategy } from './GridPositioningStrategy';
import { AttributePositioningStrategy } from './AttributePositioningStrategy';
import { SizeOnlyStrategy } from './SizeOnlyStrategy';

/**
 * Singleton positioning registry
 *
 * Pre-configured with all positioning strategies in priority order.
 * Strategies are checked from highest priority (lowest number) to lowest.
 *
 * Current strategy order:
 * 1. ResponsivePositioningStrategy (priority 10) - Breakpoint-based positioning
 * 2. LegacyAbsolutePositioningStrategy (priority 20) - Old absolute format
 * 3. GridPositioningStrategy (priority 30) - CSS grid positioning
 * 4. AttributePositioningStrategy (priority 40) - Data-attribute format
 * 5. SizeOnlyStrategy (priority 50) - Components with _size only
 * 6. NoPositioningStrategy (priority 999) - Default fallback
 */
export const positioningRegistry = new PositioningRegistry();

// Register strategies in priority order (sorted automatically by priority number)
positioningRegistry.register(new ResponsivePositioningStrategy());
positioningRegistry.register(new LegacyAbsolutePositioningStrategy());
positioningRegistry.register(new GridPositioningStrategy());
positioningRegistry.register(new AttributePositioningStrategy());
positioningRegistry.register(new SizeOnlyStrategy());
positioningRegistry.register(new NoPositioningStrategy());
