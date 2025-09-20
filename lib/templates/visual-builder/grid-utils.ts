/**
 * VISUAL_BUILDER_PROGRESS: Grid Utility Functions
 * Phase 1: Visual Builder Foundation - Grid System Utils
 */

import type {
  GridSystem,
  GridPosition,
  ComponentPosition,
  ComponentSize,
} from './types';
import { GRID_CONSTANTS } from './constants';

// Enhanced component size metadata for smart spanning
export interface ComponentSizeMetadata {
  // Default spans for different screen sizes
  desktop: number;    // 24-column grid (large screens)
  tablet: number;     // 12-column grid (medium screens)
  mobile: number;     // 6-column grid (small screens)

  // Aspect ratio preferences
  aspectRatio?: 'square' | 'wide' | 'tall' | 'auto';

  // Minimum height in grid rows
  minRows?: number;

  // Component category for grouping
  category: 'profile' | 'content' | 'layout' | 'interaction' | 'media' | 'text';

  // Whether component can shrink below default size
  flexible: boolean;
}

export interface GridBreakpoint {
  name: string;
  minWidth: number;
  columns: number;
  gap: number;
  containerPadding: number;
  rowHeight: number; // Fixed row height for consistent grid
}

// Responsive breakpoints for grid system with square grid cells
// Optimized for ~60px square cells across all breakpoints
export const GRID_BREAKPOINTS: GridBreakpoint[] = [
  { name: 'mobile', minWidth: 0, columns: 4, gap: 12, containerPadding: 16, rowHeight: 60 }, // ~60px square cells
  { name: 'tablet', minWidth: 768, columns: 8, gap: 12, containerPadding: 24, rowHeight: 60 }, // ~60px square cells
  { name: 'desktop', minWidth: 1024, columns: 16, gap: 12, containerPadding: 32, rowHeight: 60 } // ~60px square cells
];

// Component size metadata mapping
export const COMPONENT_SIZE_METADATA: Record<string, ComponentSizeMetadata> = {
  // Profile Components - Small & Personal
  'ProfilePhoto': {
    desktop: 2, tablet: 2, mobile: 2,
    aspectRatio: 'square',
    minRows: 2,
    category: 'profile',
    flexible: false
  },
  'DisplayName': {
    desktop: 3, tablet: 3, mobile: 3,
    aspectRatio: 'wide',
    minRows: 1,
    category: 'profile',
    flexible: true
  },
  'Bio': {
    desktop: 6, tablet: 4, mobile: 4,
    aspectRatio: 'auto',
    minRows: 2,
    category: 'profile',
    flexible: true
  },
  'FollowButton': {
    desktop: 2, tablet: 2, mobile: 2,
    aspectRatio: 'wide',
    minRows: 1,
    category: 'interaction',
    flexible: false
  },
  'FriendBadge': {
    desktop: 2, tablet: 2, mobile: 2,
    aspectRatio: 'square',
    minRows: 1,
    category: 'interaction',
    flexible: false
  },
  'FloatingBadge': {
    desktop: 2, tablet: 2, mobile: 2,
    aspectRatio: 'square',
    minRows: 1,
    category: 'interaction',
    flexible: false
  },

  // Content Components - Medium Size
  'ContactCard': {
    desktop: 5, tablet: 4, mobile: 4,
    aspectRatio: 'auto',
    minRows: 3,
    category: 'content',
    flexible: true
  },
  'ProfileBadges': {
    desktop: 6, tablet: 4, mobile: 4,
    aspectRatio: 'wide',
    minRows: 2,
    category: 'content',
    flexible: true
  },
  'MutualFriends': {
    desktop: 5, tablet: 4, mobile: 4,
    aspectRatio: 'auto',
    minRows: 2,
    category: 'content',
    flexible: true
  },
  'WebsiteDisplay': {
    desktop: 4, tablet: 3, mobile: 3,
    aspectRatio: 'wide',
    minRows: 1,
    category: 'content',
    flexible: true
  },
  'NotificationBell': {
    desktop: 2, tablet: 2, mobile: 2,
    aspectRatio: 'square',
    minRows: 1,
    category: 'interaction',
    flexible: false
  },

  // Large Content Components
  'BlogPosts': {
    desktop: 8, tablet: 6, mobile: 4,
    aspectRatio: 'auto',
    minRows: 4,
    category: 'content',
    flexible: true
  },
  'Guestbook': {
    desktop: 10, tablet: 6, mobile: 6,
    aspectRatio: 'auto',
    minRows: 4,
    category: 'content',
    flexible: true
  },
  'MediaGrid': {
    desktop: 8, tablet: 6, mobile: 6,
    aspectRatio: 'auto',
    minRows: 3,
    category: 'media',
    flexible: true
  },
  'ImageCarousel': {
    desktop: 10, tablet: 8, mobile: 6,
    aspectRatio: 'wide',
    minRows: 3,
    category: 'media',
    flexible: true
  },
  'NotificationCenter': {
    desktop: 8, tablet: 6, mobile: 6,
    aspectRatio: 'auto',
    minRows: 4,
    category: 'content',
    flexible: true
  },

  // Layout Components - Flexible
  'FlexContainer': {
    desktop: 12, tablet: 8, mobile: 6,
    aspectRatio: 'auto',
    minRows: 2,
    category: 'layout',
    flexible: true
  },
  'GridLayout': {
    desktop: 12, tablet: 8, mobile: 6,
    aspectRatio: 'auto',
    minRows: 3,
    category: 'layout',
    flexible: true
  },
  'SplitLayout': {
    desktop: 12, tablet: 8, mobile: 6,
    aspectRatio: 'wide',
    minRows: 2,
    category: 'layout',
    flexible: true
  },
  'CenteredBox': {
    desktop: 6, tablet: 4, mobile: 4,
    aspectRatio: 'auto',
    minRows: 2,
    category: 'layout',
    flexible: true
  },

  // Special Effect Components
  'GradientBox': {
    desktop: 4, tablet: 3, mobile: 3,
    aspectRatio: 'auto',
    minRows: 2,
    category: 'layout',
    flexible: true
  },
  'NeonBorder': {
    desktop: 4, tablet: 3, mobile: 3,
    aspectRatio: 'auto',
    minRows: 2,
    category: 'layout',
    flexible: true
  },
  'RetroTerminal': {
    desktop: 8, tablet: 6, mobile: 6,
    aspectRatio: 'auto',
    minRows: 3,
    category: 'content',
    flexible: true
  },
  'PolaroidFrame': {
    desktop: 4, tablet: 3, mobile: 3,
    aspectRatio: 'square',
    minRows: 3,
    category: 'media',
    flexible: false
  },
  'StickyNote': {
    desktop: 3, tablet: 3, mobile: 3,
    aspectRatio: 'square',
    minRows: 2,
    category: 'content',
    flexible: false
  },
  'RevealBox': {
    desktop: 4, tablet: 3, mobile: 3,
    aspectRatio: 'auto',
    minRows: 2,
    category: 'interaction',
    flexible: true
  },

  // Text Components
  'WaveText': {
    desktop: 6, tablet: 4, mobile: 4,
    aspectRatio: 'wide',
    minRows: 1,
    category: 'text',
    flexible: true
  },
  'GlitchText': {
    desktop: 6, tablet: 4, mobile: 4,
    aspectRatio: 'wide',
    minRows: 1,
    category: 'text',
    flexible: true
  },

  // Complex Components
  'Tabs': {
    desktop: 12, tablet: 8, mobile: 6,
    aspectRatio: 'auto',
    minRows: 4,
    category: 'layout',
    flexible: true
  },
  'ProfileHero': {
    desktop: 16, tablet: 10, mobile: 6,
    aspectRatio: 'wide',
    minRows: 4,
    category: 'profile',
    flexible: true
  },
  'ProfileHeader': {
    desktop: 12, tablet: 8, mobile: 6,
    aspectRatio: 'wide',
    minRows: 3,
    category: 'profile',
    flexible: true
  },
  'SkillChart': {
    desktop: 8, tablet: 6, mobile: 6,
    aspectRatio: 'auto',
    minRows: 3,
    category: 'content',
    flexible: true
  },
  'ProgressTracker': {
    desktop: 6, tablet: 4, mobile: 4,
    aspectRatio: 'auto',
    minRows: 3,
    category: 'content',
    flexible: true
  },

  // Account & System Components
  'UserAccount': {
    desktop: 4, tablet: 3, mobile: 3,
    aspectRatio: 'wide',
    minRows: 2,
    category: 'interaction',
    flexible: true
  },
  'SiteBranding': {
    desktop: 4, tablet: 3, mobile: 3,
    aspectRatio: 'wide',
    minRows: 1,
    category: 'content',
    flexible: true
  },
  'Breadcrumb': {
    desktop: 8, tablet: 6, mobile: 6,
    aspectRatio: 'wide',
    minRows: 1,
    category: 'content',
    flexible: true
  }
};

/**
 * Convert mouse coordinates to grid position
 */
export function mouseToGridPosition(
  mouseX: number,
  mouseY: number,
  gridSystem: GridSystem,
  containerOffset: { x: number; y: number } = { x: 0, y: 0 }
): GridPosition {
  // Adjust for container offset (e.g., canvas padding)
  const adjustedX = mouseX - containerOffset.x;
  const adjustedY = mouseY - containerOffset.y;

  // Calculate cell dimensions including gap
  const cellWidth = gridSystem.cellSize.width + gridSystem.gap;
  const cellHeight = gridSystem.cellSize.height + gridSystem.gap;

  // Calculate raw grid position (0-based)
  const rawColumn = adjustedX / cellWidth;
  const rawRow = adjustedY / cellHeight;

  // Apply smarter snapping logic that feels more natural
  // Snap to nearest grid position instead of always ceiling
  const column = Math.max(1, Math.round(rawColumn + 0.5)); // 1-based, round to nearest
  const row = Math.max(1, Math.round(rawRow + 0.5));       // 1-based, round to nearest

  // Constrain to grid bounds
  const constrainedColumn = Math.min(column, gridSystem.columns);
  const constrainedRow = Math.min(row, gridSystem.rows);

  return {
    column: constrainedColumn,
    row: constrainedRow,
    columnSpan: 1, // Default span
    rowSpan: 1,    // Default span
  };
}

/**
 * Convert grid position to absolute coordinates
 */
export function gridToAbsolutePosition(
  gridPosition: GridPosition,
  gridSystem: GridSystem
): ComponentPosition {
  // Calculate cell dimensions including gap
  const cellWidth = gridSystem.cellSize.width + gridSystem.gap;
  const cellHeight = gridSystem.cellSize.height + gridSystem.gap;

  // Convert to 0-based for calculation
  const columnIndex = gridPosition.column - 1;
  const rowIndex = gridPosition.row - 1;

  // Calculate absolute position
  const x = columnIndex * cellWidth;
  const y = rowIndex * cellHeight;

  return { x, y };
}

/**
 * Calculate the size a component should have based on its grid span
 */
export function gridToAbsoluteSize(
  gridPosition: GridPosition,
  gridSystem: GridSystem
): ComponentSize {
  // Calculate total width including gaps
  const width =
    (gridPosition.columnSpan * gridSystem.cellSize.width) +
    ((gridPosition.columnSpan - 1) * gridSystem.gap);

  // Calculate total height including gaps
  const height =
    (gridPosition.rowSpan * gridSystem.cellSize.height) +
    ((gridPosition.rowSpan - 1) * gridSystem.gap);

  return { width, height };
}

/**
 * Check if a mouse position is close enough to snap to a grid position
 */
export function shouldSnapToGrid(
  mouseX: number,
  mouseY: number,
  gridPosition: GridPosition,
  gridSystem: GridSystem,
  containerOffset: { x: number; y: number } = { x: 0, y: 0 }
): boolean {
  const absolutePos = gridToAbsolutePosition(gridPosition, gridSystem);

  // Adjust for container offset
  const adjustedMouseX = mouseX - containerOffset.x;
  const adjustedMouseY = mouseY - containerOffset.y;

  // Calculate distance from grid position
  const deltaX = Math.abs(adjustedMouseX - absolutePos.x);
  const deltaY = Math.abs(adjustedMouseY - absolutePos.y);

  // Check if within snap threshold
  return deltaX <= gridSystem.snapThreshold && deltaY <= gridSystem.snapThreshold;
}

/**
 * Find the nearest grid position for snapping with magnetic feel
 */
export function findNearestGridPosition(
  mouseX: number,
  mouseY: number,
  gridSystem: GridSystem,
  containerOffset: { x: number; y: number } = { x: 0, y: 0 }
): GridPosition {
  // Adjust for container offset
  const adjustedX = mouseX - containerOffset.x;
  const adjustedY = mouseY - containerOffset.y;

  // Calculate cell dimensions
  const cellWidth = gridSystem.cellSize.width + gridSystem.gap;
  const cellHeight = gridSystem.cellSize.height + gridSystem.gap;

  // Calculate exact position within grid (0-based)
  const exactColumn = adjustedX / cellWidth;
  const exactRow = adjustedY / cellHeight;

  // Use a more natural snapping that snaps to the center of cells
  // when you're close enough, creating a "magnetic" effect
  let snapColumn: number;
  let snapRow: number;

  // Calculate distance to nearest grid centers
  const nearestColumnCenter = Math.round(exactColumn);
  const nearestRowCenter = Math.round(exactRow);

  const columnDistance = Math.abs(exactColumn - nearestColumnCenter);
  const rowDistance = Math.abs(exactRow - nearestRowCenter);

  // Apply magnetic snapping when close to centers
  if (columnDistance <= GRID_CONSTANTS.SNAP_ZONES.COLUMN) {
    snapColumn = nearestColumnCenter + 1; // Convert to 1-based
  } else {
    // Default behavior when not in snap zone
    snapColumn = Math.max(1, Math.round(exactColumn + 0.5));
  }

  if (rowDistance <= GRID_CONSTANTS.SNAP_ZONES.ROW) {
    snapRow = nearestRowCenter + 1; // Convert to 1-based
  } else {
    // Default behavior when not in snap zone
    snapRow = Math.max(1, Math.round(exactRow + 0.5));
  }

  // Constrain to grid bounds
  snapColumn = Math.max(1, Math.min(snapColumn, gridSystem.columns));
  snapRow = Math.max(1, Math.min(snapRow, gridSystem.rows));

  return {
    column: snapColumn,
    row: snapRow,
    columnSpan: 1,
    rowSpan: 1,
  };
}

/**
 * Check if a grid position is valid
 */
export function isValidGridPosition(
  gridPosition: GridPosition,
  gridSystem: GridSystem
): boolean {
  // Check bounds
  if (gridPosition.column < 1 || gridPosition.row < 1) {
    return false;
  }

  if (gridPosition.column > gridSystem.columns || gridPosition.row > gridSystem.rows) {
    return false;
  }

  // Check span bounds
  if (gridPosition.columnSpan < GRID_CONSTANTS.MIN_COLUMN_SPAN ||
      gridPosition.columnSpan > GRID_CONSTANTS.MAX_COLUMN_SPAN) {
    return false;
  }

  if (gridPosition.rowSpan < GRID_CONSTANTS.MIN_ROW_SPAN ||
      gridPosition.rowSpan > GRID_CONSTANTS.MAX_ROW_SPAN) {
    return false;
  }

  // Check if span extends beyond grid
  if ((gridPosition.column + gridPosition.columnSpan - 1) > gridSystem.columns) {
    return false;
  }

  if ((gridPosition.row + gridPosition.rowSpan - 1) > gridSystem.rows) {
    return false;
  }

  return true;
}

/**
 * Check if two grid positions overlap
 */
export function gridPositionsOverlap(
  pos1: GridPosition,
  pos2: GridPosition
): boolean {
  // Calculate bounds for position 1
  const pos1Left = pos1.column;
  const pos1Right = pos1.column + pos1.columnSpan - 1;
  const pos1Top = pos1.row;
  const pos1Bottom = pos1.row + pos1.rowSpan - 1;

  // Calculate bounds for position 2
  const pos2Left = pos2.column;
  const pos2Right = pos2.column + pos2.columnSpan - 1;
  const pos2Top = pos2.row;
  const pos2Bottom = pos2.row + pos2.rowSpan - 1;

  // Check for overlap
  const horizontalOverlap = pos1Left <= pos2Right && pos1Right >= pos2Left;
  const verticalOverlap = pos1Top <= pos2Bottom && pos1Bottom >= pos2Top;

  return horizontalOverlap && verticalOverlap;
}

/**
 * Find an available grid position near the desired position
 */
export function findAvailableGridPosition(
  desiredPosition: GridPosition,
  occupiedPositions: GridPosition[],
  gridSystem: GridSystem
): GridPosition | null {
  // Check if desired position is available
  if (isValidGridPosition(desiredPosition, gridSystem)) {
    const hasCollision = occupiedPositions.some(pos =>
      gridPositionsOverlap(desiredPosition, pos)
    );

    if (!hasCollision) {
      return desiredPosition;
    }
  }

  // Search for alternative positions in expanding spiral
  const maxSearchRadius = Math.max(gridSystem.columns, gridSystem.rows);

  for (let radius = 1; radius <= maxSearchRadius; radius++) {
    // Try positions around the desired position
    for (let deltaRow = -radius; deltaRow <= radius; deltaRow++) {
      for (let deltaCol = -radius; deltaCol <= radius; deltaCol++) {
        // Skip positions not on the current radius edge
        if (Math.abs(deltaRow) !== radius && Math.abs(deltaCol) !== radius) {
          continue;
        }

        const candidatePosition: GridPosition = {
          column: desiredPosition.column + deltaCol,
          row: desiredPosition.row + deltaRow,
          columnSpan: desiredPosition.columnSpan,
          rowSpan: desiredPosition.rowSpan,
        };

        if (isValidGridPosition(candidatePosition, gridSystem)) {
          const hasCollision = occupiedPositions.some(pos =>
            gridPositionsOverlap(candidatePosition, pos)
          );

          if (!hasCollision) {
            return candidatePosition;
          }
        }
      }
    }
  }

  return null; // No available position found
}

/**
 * Sort grid positions by visual order (top-to-bottom, left-to-right)
 */
export function sortGridPositionsByVisualOrder(positions: GridPosition[]): GridPosition[] {
  return [...positions].sort((a, b) => {
    // First sort by row (top to bottom)
    if (a.row !== b.row) {
      return a.row - b.row;
    }

    // Then sort by column (left to right)
    return a.column - b.column;
  });
}

/**
 * Calculate the total grid area needed for a set of components
 */
export function calculateRequiredGridArea(positions: GridPosition[]): {
  minColumns: number;
  minRows: number;
} {
  if (positions.length === 0) {
    return { minColumns: 1, minRows: 1 };
  }

  let maxColumn = 0;
  let maxRow = 0;

  positions.forEach(pos => {
    const rightEdge = pos.column + pos.columnSpan - 1;
    const bottomEdge = pos.row + pos.rowSpan - 1;

    maxColumn = Math.max(maxColumn, rightEdge);
    maxRow = Math.max(maxRow, bottomEdge);
  });

  return {
    minColumns: maxColumn,
    minRows: maxRow,
  };
}

// Smart spanning utility functions

/**
 * Get current breakpoint based on window width
 */
export function getCurrentBreakpoint(width: number = typeof window !== 'undefined' ? window.innerWidth : 1024): GridBreakpoint {
  const breakpoint = GRID_BREAKPOINTS
    .slice()
    .reverse()
    .find(bp => width >= bp.minWidth);

  return breakpoint || GRID_BREAKPOINTS[GRID_BREAKPOINTS.length - 1];
}

/**
 * Get optimal span for component at current breakpoint
 */
export function getOptimalSpan(
  componentType: string,
  breakpointName: string = 'desktop',
  availableColumns?: number
): number {
  const metadata = COMPONENT_SIZE_METADATA[componentType];

  if (!metadata) {
    // Default for unknown components
    return breakpointName === 'mobile' ? 2 : breakpointName === 'tablet' ? 3 : 4;
  }

  let span: number;
  switch (breakpointName) {
    case 'mobile': span = metadata.mobile; break;
    case 'tablet': span = metadata.tablet; break;
    default: span = metadata.desktop; break;
  }

  // Constrain to available columns if specified
  if (availableColumns && span > availableColumns) {
    return metadata.flexible ? availableColumns : Math.min(span, availableColumns);
  }

  return span;
}

/**
 * Check if components can be grouped together efficiently
 */
export function suggestComponentGrouping(
  components: Array<{ type: string; id: string }>,
  breakpointName: string = 'desktop'
): Array<Array<{ type: string; id: string; suggestedSpan: number }>> {
  const breakpoint = GRID_BREAKPOINTS.find(bp => bp.name === breakpointName) || GRID_BREAKPOINTS[2];
  const maxColumns = breakpoint.columns;

  const groups: Array<Array<{ type: string; id: string; suggestedSpan: number }>> = [];
  let currentGroup: Array<{ type: string; id: string; suggestedSpan: number }> = [];
  let currentRowUsed = 0;

  for (const component of components) {
    const suggestedSpan = getOptimalSpan(component.type, breakpointName);

    // If adding this component would exceed row, start new group
    if (currentRowUsed + suggestedSpan > maxColumns && currentGroup.length > 0) {
      groups.push(currentGroup);
      currentGroup = [];
      currentRowUsed = 0;
    }

    currentGroup.push({ ...component, suggestedSpan });
    currentRowUsed += suggestedSpan;

    // If component takes full width or more, close the group
    if (suggestedSpan >= maxColumns) {
      groups.push(currentGroup);
      currentGroup = [];
      currentRowUsed = 0;
    }
  }

  // Add remaining components
  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }

  return groups;
}

/**
 * Calculate responsive grid container styles
 */
export function getResponsiveGridStyles(
  hasGridContent: boolean,
  breakpointName: string = 'desktop'
): React.CSSProperties {
  if (!hasGridContent) {
    return {};
  }

  const breakpoint = GRID_BREAKPOINTS.find(bp => bp.name === breakpointName) || GRID_BREAKPOINTS[2];

  return {
    display: 'grid',
    gridTemplateColumns: `repeat(${breakpoint.columns}, 1fr)`,
    gap: `${breakpoint.gap}px`,
    width: '100%',
    maxWidth: '100vw',
    minHeight: '100vh',
    padding: `${breakpoint.containerPadding}px`,
    boxSizing: 'border-box'
  };
}

/**
 * Generate media queries for responsive grid
 */
export function generateResponsiveGridCSS(): string {
  const css = GRID_BREAKPOINTS.map(breakpoint => {
    const mediaQuery = breakpoint.minWidth > 0 ? `@media (min-width: ${breakpoint.minWidth}px)` : '';

    const rules = `
      .advanced-template-container.grid-enabled {
        display: grid;
        grid-template-columns: repeat(${breakpoint.columns}, 1fr);
        gap: ${breakpoint.gap}px;
        padding: ${breakpoint.containerPadding}px;
        width: 100%;
        max-width: 100vw;
        min-height: 100vh;
        box-sizing: border-box;
      }
    `;

    return mediaQuery ? `${mediaQuery} {\n${rules}\n}` : rules;
  }).join('\n');

  return css;
}