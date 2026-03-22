/**
 * Grid Compatibility System
 * Handles component adaptation for CSS Grid layouts
 *
 * Relocated from visual-builder/grid-compatibility.ts — used by
 * template-renderer.tsx and GridCompatibleWrapper.tsx.
 */

export type GridCompatibilityMode =
  | 'grid-native'
  | 'grid-adapted'
  | 'grid-overlay'
  | 'grid-excluded';

export type GridSizingBehavior =
  | 'responsive'
  | 'fixed'
  | 'content'
  | 'aspect-ratio'
  | 'span-based';

export type GridPositioningBehavior =
  | 'grid-item'
  | 'absolute-overlay'
  | 'relative-flow'
  | 'sticky'
  | 'subgrid';

export interface ComponentGridBehavior {
  mode: GridCompatibilityMode;
  sizing: GridSizingBehavior;
  positioning: GridPositioningBehavior;

  preferredSpan?: {
    columns?: number;
    rows?: number;
  };

  constraints?: {
    minSpan?: { columns?: number; rows?: number };
    maxSpan?: { columns?: number; rows?: number };
    aspectRatio?: number;
  };

  responsive?: {
    mobile?: Partial<ComponentGridBehavior>;
    tablet?: Partial<ComponentGridBehavior>;
    desktop?: Partial<ComponentGridBehavior>;
  };

  gridClasses?: string[];
  removeClasses?: string[];
  gridStyles?: React.CSSProperties;
}

export const COMPONENT_GRID_BEHAVIORS: Record<string, ComponentGridBehavior> = {
  ProfilePhoto: {
    mode: 'grid-adapted',
    sizing: 'aspect-ratio',
    positioning: 'grid-item',
    constraints: { aspectRatio: 1 },
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

  RetroTerminal: {
    mode: 'grid-adapted',
    sizing: 'responsive',
    positioning: 'grid-item',
    preferredSpan: { columns: 3, rows: 2 },
    constraints: {
      minSpan: { columns: 2, rows: 1 },
      maxSpan: { columns: 4, rows: 3 }
    },
    gridClasses: ['w-full', 'h-full']
  },

  RevealBox: {
    mode: 'grid-adapted',
    sizing: 'responsive',
    positioning: 'grid-item',
    preferredSpan: { columns: 2, rows: 2 },
    constraints: {
      minSpan: { columns: 1, rows: 1 },
      maxSpan: { columns: 3, rows: 3 }
    },
    gridClasses: ['w-full', 'h-full']
  },

  CenteredBox: {
    mode: 'grid-adapted',
    sizing: 'responsive',
    positioning: 'grid-item',
    preferredSpan: { columns: 3, rows: 2 },
    constraints: {
      minSpan: { columns: 1, rows: 1 },
      maxSpan: { columns: 6, rows: 4 }
    },
    gridClasses: ['w-full', 'h-full']
  },

  GridLayout: {
    mode: 'grid-native',
    sizing: 'responsive',
    positioning: 'subgrid',
    preferredSpan: { columns: 12, rows: 1 }
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

  NeonBorder: {
    mode: 'grid-adapted',
    sizing: 'responsive',
    positioning: 'grid-item',
    preferredSpan: { columns: 2, rows: 2 }
  },

  GradientBox: {
    mode: 'grid-adapted',
    sizing: 'responsive',
    positioning: 'grid-item',
    preferredSpan: { columns: 2, rows: 2 },
    constraints: {
      minSpan: { columns: 1, rows: 1 },
      maxSpan: { columns: 4, rows: 4 }
    },
    gridClasses: ['w-full', 'h-full'],
    removeClasses: ['w-32', 'h-32', 'w-48', 'h-48', 'w-64', 'h-64']
  },

  PolaroidFrame: {
    mode: 'grid-adapted',
    sizing: 'aspect-ratio',
    positioning: 'grid-item',
    constraints: { aspectRatio: 1.2 },
    preferredSpan: { columns: 2, rows: 2 }
  },

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
