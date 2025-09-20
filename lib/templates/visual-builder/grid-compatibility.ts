/**
 * Grid Compatibility System
 * Handles component adaptation for CSS Grid layouts
 */

export type GridCompatibilityMode =
  | 'grid-native'    // Designed specifically for grid layouts
  | 'grid-adapted'   // Existing component with grid-aware behavior
  | 'grid-overlay'   // Positioned absolutely over grid (e.g., FloatingBadge)
  | 'grid-excluded'; // Not suitable for grid, use flow layout

export type GridSizingBehavior =
  | 'responsive'     // Adapts to grid cell size
  | 'fixed'          // Maintains fixed size regardless of grid
  | 'content'        // Sizes based on content
  | 'aspect-ratio'   // Maintains aspect ratio while adapting width/height
  | 'span-based';    // Uses grid span for sizing

export type GridPositioningBehavior =
  | 'grid-item'      // Normal grid item behavior
  | 'absolute-overlay' // Positioned absolutely over grid
  | 'relative-flow'  // Positioned relative within grid cell
  | 'sticky'         // Sticky positioning within grid
  | 'subgrid';       // Creates subgrid for children

export interface ComponentGridBehavior {
  mode: GridCompatibilityMode;
  sizing: GridSizingBehavior;
  positioning: GridPositioningBehavior;

  // Optional configuration
  preferredSpan?: {
    columns?: number;
    rows?: number;
  };

  // Minimum/maximum constraints
  constraints?: {
    minSpan?: { columns?: number; rows?: number };
    maxSpan?: { columns?: number; rows?: number };
    aspectRatio?: number; // width/height ratio
  };

  // Responsive behavior
  responsive?: {
    mobile?: Partial<ComponentGridBehavior>;
    tablet?: Partial<ComponentGridBehavior>;
    desktop?: Partial<ComponentGridBehavior>;
  };

  // CSS classes to apply in grid context
  gridClasses?: string[];

  // CSS classes to remove in grid context
  removeClasses?: string[];

  // Custom grid styles
  gridStyles?: React.CSSProperties;
}

/**
 * Component grid compatibility registry
 * Maps component names to their grid behavior
 */
export const COMPONENT_GRID_BEHAVIORS: Record<string, ComponentGridBehavior> = {
  // Fixed-size components that need adaptation
  ProfilePhoto: {
    mode: 'grid-adapted',
    sizing: 'aspect-ratio',
    positioning: 'grid-item',
    constraints: { aspectRatio: 1 }, // Square
    preferredSpan: { columns: 1, rows: 1 },
    gridClasses: ['w-full', 'h-full', 'object-cover'],
    removeClasses: ['w-8', 'h-8', 'w-16', 'h-16', 'w-32', 'h-32', 'w-48', 'h-48']
  },

  UserImage: {
    mode: 'grid-adapted',
    sizing: 'aspect-ratio',
    positioning: 'grid-item',
    constraints: { aspectRatio: 1 },
    preferredSpan: { columns: 1, rows: 1 },
    gridClasses: ['w-full', 'h-full', 'object-cover'],
    removeClasses: ['w-8', 'h-8', 'w-16', 'h-16', 'w-32', 'h-32', 'w-48', 'h-48']
  },

  // Overlay components that break grid flow
  FloatingBadge: {
    mode: 'grid-overlay',
    sizing: 'fixed',
    positioning: 'absolute-overlay',
    gridStyles: { position: 'absolute', zIndex: 10 }
  },

  StickyNote: {
    mode: 'grid-adapted',
    sizing: 'responsive',
    positioning: 'grid-item',
    preferredSpan: { columns: 2, rows: 2 },
    constraints: {
      minSpan: { columns: 1, rows: 1 },
      maxSpan: { columns: 3, rows: 3 },
      aspectRatio: 1
    },
    gridClasses: ['w-full', 'h-full'],
    removeClasses: ['w-32', 'h-32', 'w-48', 'h-48', 'w-64', 'h-64']
  },

  // Layout containers that create subgrids
  GridLayout: {
    mode: 'grid-native',
    sizing: 'responsive',
    positioning: 'subgrid',
    preferredSpan: { columns: 12, rows: 1 } // Full width by default
  },

  ContactCard: {
    mode: 'grid-adapted',
    sizing: 'content',
    positioning: 'grid-item',
    preferredSpan: { columns: 2, rows: 1 },
    constraints: {
      minSpan: { columns: 1, rows: 1 },
      maxSpan: { columns: 4, rows: 3 }
    }
  },

  FlexContainer: {
    mode: 'grid-adapted',
    sizing: 'responsive',
    positioning: 'grid-item',
    preferredSpan: { columns: 3, rows: 1 }
  },

  SplitLayout: {
    mode: 'grid-adapted',
    sizing: 'responsive',
    positioning: 'grid-item',
    preferredSpan: { columns: 6, rows: 2 }
  },

  // Content components
  DisplayName: {
    mode: 'grid-adapted',
    sizing: 'content',
    positioning: 'grid-item',
    preferredSpan: { columns: 2, rows: 1 }
  },

  Bio: {
    mode: 'grid-adapted',
    sizing: 'content',
    positioning: 'grid-item',
    preferredSpan: { columns: 3, rows: 2 }
  },

  // Visual effects
  NeonBorder: {
    mode: 'grid-adapted',
    sizing: 'responsive',
    positioning: 'grid-item',
    preferredSpan: { columns: 2, rows: 2 }
  },

  PolaroidFrame: {
    mode: 'grid-adapted',
    sizing: 'aspect-ratio',
    positioning: 'grid-item',
    constraints: { aspectRatio: 1.2 }, // Polaroid aspect ratio
    preferredSpan: { columns: 2, rows: 2 }
  },

  // Interactive components
  Tabs: {
    mode: 'grid-native',
    sizing: 'responsive',
    positioning: 'grid-item',
    preferredSpan: { columns: 4, rows: 3 }
  },

  ImageCarousel: {
    mode: 'grid-adapted',
    sizing: 'responsive',
    positioning: 'grid-item',
    preferredSpan: { columns: 4, rows: 3 },
    constraints: {
      minSpan: { columns: 2, rows: 2 }
    }
  }
};

/**
 * Get grid behavior for a component
 */
export function getComponentGridBehavior(componentType: string): ComponentGridBehavior | null {
  return COMPONENT_GRID_BEHAVIORS[componentType] || null;
}

/**
 * Check if a component is grid-compatible
 */
export function isGridCompatible(componentType: string): boolean {
  const behavior = getComponentGridBehavior(componentType);
  return behavior !== null && behavior.mode !== 'grid-excluded';
}

/**
 * Get preferred grid span for a component
 */
export function getPreferredSpan(componentType: string): { columns: number; rows: number } {
  const behavior = getComponentGridBehavior(componentType);
  return {
    columns: behavior?.preferredSpan?.columns || 1,
    rows: behavior?.preferredSpan?.rows || 1
  };
}

/**
 * Determine if component should use absolute positioning overlay
 */
export function isGridOverlay(componentType: string): boolean {
  const behavior = getComponentGridBehavior(componentType);
  return behavior?.mode === 'grid-overlay';
}

/**
 * Get CSS classes to apply/remove for grid context
 */
export function getGridClassModifications(componentType: string): {
  add: string[];
  remove: string[];
} {
  const behavior = getComponentGridBehavior(componentType);
  return {
    add: behavior?.gridClasses || [],
    remove: behavior?.removeClasses || []
  };
}

/**
 * Get custom grid styles for a component
 */
export function getGridStyles(componentType: string): React.CSSProperties {
  const behavior = getComponentGridBehavior(componentType);
  return behavior?.gridStyles || {};
}