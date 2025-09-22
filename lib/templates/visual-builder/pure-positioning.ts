/**
 * Pure Absolute Positioning System
 *
 * This system eliminates the complexity of hybrid grid/absolute positioning
 * by using only absolute coordinates for precise, predictable positioning.
 */

// Standard breakpoints for responsive positioning
export const BREAKPOINTS = {
  mobile: { name: 'mobile', minWidth: 0, maxWidth: 767 },
  tablet: { name: 'tablet', minWidth: 768, maxWidth: 1023 },
  desktop: { name: 'desktop', minWidth: 1024, maxWidth: Infinity }
} as const;

export type BreakpointName = keyof typeof BREAKPOINTS;

/**
 * Absolute position and size for a component at a specific breakpoint
 */
export interface AbsolutePosition {
  x: number;        // Left position in pixels
  y: number;        // Top position in pixels
  width: number;    // Width in pixels
  height: number;   // Height in pixels
  zIndex?: number;  // Stack order (optional)
}

/**
 * Responsive positioning data for a component
 */
export interface ResponsivePosition {
  // Position data for each breakpoint
  breakpoints: {
    desktop: AbsolutePosition;
    tablet: AbsolutePosition;
    mobile: AbsolutePosition;
  };

  // How component should behave when scaling between exact breakpoints
  scalingBehavior: 'fixed' | 'proportional';

  // Minimum constraints (prevents components from becoming too small)
  constraints?: {
    minWidth?: number;
    minHeight?: number;
    maxWidth?: number;
    maxHeight?: number;
  };
}

/**
 * Simple absolute position (for components that don't need responsive behavior)
 */
export interface SimpleAbsolutePosition extends AbsolutePosition {
  // Additional flag to indicate this is a simple position
  isResponsive: false;
}

/**
 * Union type for all positioning data
 */
export type ComponentPositioning = ResponsivePosition | SimpleAbsolutePosition;

/**
 * Canvas container specifications
 */
export interface CanvasContainer {
  // Standard container dimensions
  width: number;    // Canvas width (e.g., 1200px)
  minHeight: number; // Minimum canvas height
  padding: number;  // Container padding

  // Background and styling
  backgroundColor?: string;
  backgroundImage?: string;
}

/**
 * Component with pure absolute positioning
 */
export interface AbsoluteComponent {
  id: string;
  type: string;
  props: Record<string, any>;
  positioning: ComponentPositioning;
  children?: AbsoluteComponent[];

  // Component metadata
  locked?: boolean;
  hidden?: boolean;
  name?: string; // User-friendly name
}

/**
 * Canvas state for pure absolute positioning
 */
export interface AbsoluteCanvasState {
  container: CanvasContainer;
  components: AbsoluteComponent[];

  // Canvas metadata
  version: string; // For migration compatibility
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Helper functions for working with absolute positioning
 */
export class AbsolutePositioningUtils {

  /**
   * Get the current breakpoint based on window width
   */
  static getCurrentBreakpoint(width: number = typeof window !== 'undefined' ? window.innerWidth : 1024): BreakpointName {
    if (width >= BREAKPOINTS.desktop.minWidth) return 'desktop';
    if (width >= BREAKPOINTS.tablet.minWidth) return 'tablet';
    return 'mobile';
  }

  /**
   * Get position for current breakpoint
   */
  static getPositionForBreakpoint(positioning: ComponentPositioning, breakpoint: BreakpointName): AbsolutePosition {
    if ('isResponsive' in positioning && !positioning.isResponsive) {
      // Simple absolute position - return as-is
      return positioning;
    }

    // Responsive position - return specific breakpoint
    const responsivePositioning = positioning as ResponsivePosition;
    return responsivePositioning.breakpoints[breakpoint];
  }

  /**
   * Get position for current window size
   */
  static getCurrentPosition(positioning: ComponentPositioning, windowWidth?: number): AbsolutePosition {
    const breakpoint = this.getCurrentBreakpoint(windowWidth);
    return this.getPositionForBreakpoint(positioning, breakpoint);
  }

  /**
   * Create simple absolute positioning from coordinates
   */
  static createSimplePosition(x: number, y: number, width: number, height: number, zIndex?: number): SimpleAbsolutePosition {
    return {
      x,
      y,
      width,
      height,
      zIndex,
      isResponsive: false
    };
  }

  /**
   * Create responsive positioning with same position across all breakpoints
   */
  static createUniformResponsivePosition(position: AbsolutePosition, scalingBehavior: 'fixed' | 'proportional' = 'fixed'): ResponsivePosition {
    return {
      breakpoints: {
        desktop: { ...position },
        tablet: { ...position },
        mobile: { ...position }
      },
      scalingBehavior
    };
  }

  /**
   * Convert legacy grid position to absolute position
   */
  static convertGridToAbsolute(
    column: number,
    row: number,
    span: number,
    containerWidth: number = 1200,
    containerPadding: number = 32,
    gap: number = 12,
    rowHeight: number = 60
  ): AbsolutePosition {
    const columns = 16; // Standard grid columns
    const availableWidth = containerWidth - (containerPadding * 2);
    const columnWidth = (availableWidth - (gap * (columns - 1))) / columns;

    const x = containerPadding + ((column - 1) * (columnWidth + gap));
    const y = containerPadding + ((row - 1) * (rowHeight + gap));
    const width = (span * columnWidth) + ((span - 1) * gap);
    const height = rowHeight;

    return { x, y, width, height };
  }

  /**
   * Check if two positioned components overlap
   */
  static checkOverlap(pos1: AbsolutePosition, pos2: AbsolutePosition): boolean {
    return !(
      pos1.x + pos1.width <= pos2.x ||
      pos2.x + pos2.width <= pos1.x ||
      pos1.y + pos1.height <= pos2.y ||
      pos2.y + pos2.height <= pos1.y
    );
  }

  /**
   * Generate CSS styles for absolute positioning
   */
  static generateCSS(position: AbsolutePosition): React.CSSProperties {
    return {
      position: 'absolute',
      left: `${position.x}px`,
      top: `${position.y}px`,
      width: `${position.width}px`,
      height: `${position.height}px`,
      zIndex: position.zIndex || 1
    };
  }

  /**
   * Generate media query CSS for responsive positioning
   */
  static generateResponsiveCSS(positioning: ResponsivePosition, selector: string): string {
    const { desktop, tablet, mobile } = positioning.breakpoints;

    return `
      /* Desktop */
      @media (min-width: ${BREAKPOINTS.desktop.minWidth}px) {
        ${selector} {
          left: ${desktop.x}px;
          top: ${desktop.y}px;
          width: ${desktop.width}px;
          height: ${desktop.height}px;
          z-index: ${desktop.zIndex || 1};
        }
      }

      /* Tablet */
      @media (min-width: ${BREAKPOINTS.tablet.minWidth}px) and (max-width: ${BREAKPOINTS.tablet.maxWidth}px) {
        ${selector} {
          left: ${tablet.x}px;
          top: ${tablet.y}px;
          width: ${tablet.width}px;
          height: ${tablet.height}px;
          z-index: ${tablet.zIndex || 1};
        }
      }

      /* Mobile */
      @media (max-width: ${BREAKPOINTS.mobile.maxWidth}px) {
        ${selector} {
          left: ${mobile.x}px;
          top: ${mobile.y}px;
          width: ${mobile.width}px;
          height: ${mobile.height}px;
          z-index: ${mobile.zIndex || 1};
        }
      }
    `;
  }
}

/**
 * Default canvas container settings
 */
export const DEFAULT_CANVAS_CONTAINER: CanvasContainer = {
  width: 1200,
  minHeight: 800,
  padding: 32,
  backgroundColor: '#ffffff'
};

/**
 * Migration helpers for converting from old positioning system
 */
export class PositioningMigration {

  /**
   * Convert legacy ComponentItem to AbsoluteComponent
   */
  static convertLegacyComponent(legacyComponent: any): AbsoluteComponent {
    let positioning: ComponentPositioning;

    if (legacyComponent.positioningMode === 'absolute' && legacyComponent.position) {
      // Convert legacy absolute positioning
      const size = legacyComponent.props?._size || { width: 200, height: 150 };
      positioning = AbsolutePositioningUtils.createSimplePosition(
        legacyComponent.position.x,
        legacyComponent.position.y,
        size.width,
        size.height
      );
    } else if (legacyComponent.positioningMode === 'grid' && legacyComponent.gridPosition) {
      // Convert legacy grid positioning to absolute
      const absolutePos = AbsolutePositioningUtils.convertGridToAbsolute(
        legacyComponent.gridPosition.column,
        legacyComponent.gridPosition.row,
        legacyComponent.gridPosition.span || 1
      );
      positioning = AbsolutePositioningUtils.createSimplePosition(
        absolutePos.x,
        absolutePos.y,
        absolutePos.width,
        absolutePos.height
      );
    } else {
      // Fallback for unknown positioning
      positioning = AbsolutePositioningUtils.createSimplePosition(0, 0, 200, 150);
    }

    return {
      id: legacyComponent.id,
      type: legacyComponent.type,
      props: legacyComponent.props || {},
      positioning,
      children: legacyComponent.children?.map(this.convertLegacyComponent) || [],
      locked: legacyComponent.props?._locked,
      hidden: legacyComponent.props?._hidden
    };
  }
}