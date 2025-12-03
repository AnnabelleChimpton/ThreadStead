/**
 * Decoration Grid System for Pixel Home Canvas
 * Adapted from visual builder grid utilities for decoration placement
 */

export interface DecorationGridConfig {
  cellSize: number;        // Size of each grid cell in pixels
  snapDistance: number;    // Distance for magnetic snapping
  showGrid: boolean;       // Whether to show grid overlay
  magneticSnapping: boolean; // Enable magnetic snapping to grid
  canvasWidth: number;     // Canvas width in pixels
  canvasHeight: number;    // Canvas height in pixels
}

// Default grid configuration for decoration canvas
export const DEFAULT_DECORATION_GRID: DecorationGridConfig = {
  cellSize: 16,              // 16px grid cells (standard pixel art tile size)
  snapDistance: 8,           // 8px magnetic snap zone
  showGrid: true,            // Enabled by default
  magneticSnapping: true,    // Enabled by default
  canvasWidth: 500,          // Standard canvas width
  canvasHeight: 350          // Standard canvas height
}

export interface GridPosition {
  gridX: number;    // Grid column (0-based)
  gridY: number;    // Grid row (0-based)
  pixelX: number;   // Exact pixel position
  pixelY: number;   // Exact pixel position
}

export interface SnapResult {
  position: GridPosition;
  snapped: boolean;
  snapType: 'grid' | 'decoration' | 'spacing' | 'none';
  snapTarget?: string; // ID of decoration snapped to
}

/**
 * Convert pixel coordinates to grid position
 */
export function pixelToGrid(
  pixelX: number,
  pixelY: number,
  config: DecorationGridConfig = DEFAULT_DECORATION_GRID
): GridPosition {
  const gridX = Math.floor(pixelX / config.cellSize);
  const gridY = Math.floor(pixelY / config.cellSize);

  return {
    gridX: Math.max(0, Math.min(gridX, Math.floor(config.canvasWidth / config.cellSize) - 1)),
    gridY: Math.max(0, Math.min(gridY, Math.floor(config.canvasHeight / config.cellSize) - 1)),
    pixelX: gridX * config.cellSize,
    pixelY: gridY * config.cellSize
  };
}

/**
 * Convert grid coordinates to pixel position
 */
export function gridToPixel(
  gridX: number,
  gridY: number,
  config: DecorationGridConfig = DEFAULT_DECORATION_GRID
): GridPosition {
  const pixelX = gridX * config.cellSize;
  const pixelY = gridY * config.cellSize;

  return {
    gridX: Math.max(0, Math.min(gridX, Math.floor(config.canvasWidth / config.cellSize) - 1)),
    gridY: Math.max(0, Math.min(gridY, Math.floor(config.canvasHeight / config.cellSize) - 1)),
    pixelX: Math.max(0, Math.min(pixelX, config.canvasWidth - config.cellSize)),
    pixelY: Math.max(0, Math.min(pixelY, config.canvasHeight - config.cellSize))
  };
}

/**
 * Snap pixel coordinates to grid with magnetic attraction
 */
export function snapToGrid(
  pixelX: number,
  pixelY: number,
  config: DecorationGridConfig = DEFAULT_DECORATION_GRID
): SnapResult {
  if (!config.magneticSnapping) {
    return {
      position: { gridX: 0, gridY: 0, pixelX, pixelY },
      snapped: false,
      snapType: 'none'
    };
  }

  // Calculate nearest grid position
  const nearestGridX = Math.round(pixelX / config.cellSize);
  const nearestGridY = Math.round(pixelY / config.cellSize);

  const gridPixelX = nearestGridX * config.cellSize;
  const gridPixelY = nearestGridY * config.cellSize;

  // Check if within snap distance
  const distanceX = Math.abs(pixelX - gridPixelX);
  const distanceY = Math.abs(pixelY - gridPixelY);
  const totalDistance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);

  const shouldSnap = totalDistance <= config.snapDistance;

  if (shouldSnap) {
    const gridPos = gridToPixel(nearestGridX, nearestGridY, config);
    return {
      position: gridPos,
      snapped: true,
      snapType: 'grid'
    };
  }

  return {
    position: { gridX: nearestGridX, gridY: nearestGridY, pixelX, pixelY },
    snapped: false,
    snapType: 'none'
  };
}

/**
 * Generate grid lines for overlay display
 */
export function generateGridLines(config: DecorationGridConfig = DEFAULT_DECORATION_GRID) {
  const verticalLines: Array<{ x: number; y1: number; y2: number }> = [];
  const horizontalLines: Array<{ y: number; x1: number; x2: number }> = [];

  // Generate vertical lines
  for (let x = 0; x <= config.canvasWidth; x += config.cellSize) {
    verticalLines.push({
      x,
      y1: 0,
      y2: config.canvasHeight
    });
  }

  // Generate horizontal lines
  for (let y = 0; y <= config.canvasHeight; y += config.cellSize) {
    horizontalLines.push({
      y,
      x1: 0,
      x2: config.canvasWidth
    });
  }

  return { verticalLines, horizontalLines };
}

/**
 * Calculate decoration size in grid cells
 */
export function getDecorationGridSize(
  decorationType: string,
  decorationId: string,
  size: 'small' | 'medium' | 'large' = 'medium'
): { width: number; height: number } {
  // Base sizes for different decoration types
  const baseSizes: Record<string, { width: number; height: number }> = {
    'plant': { width: 1, height: 1 },
    'path': { width: 2, height: 1 },
    'feature': { width: 1, height: 2 },
    'seasonal': { width: 1, height: 1 },
    'furniture': { width: 2, height: 1 },
    'lighting': { width: 1, height: 1 },
    'water': { width: 2, height: 2 },
    'structure': { width: 3, height: 3 }
  };

  const baseSize = baseSizes[decorationType] || { width: 1, height: 1 };

  // Special cases for specific items
  if (decorationId.startsWith('sign_post')) {
    return { width: 1, height: 1 };
  }

  // Scale multipliers for size variants
  const sizeMultipliers = {
    small: 0.8,
    medium: 1.0,
    large: 1.3
  };

  const multiplier = sizeMultipliers[size];

  return {
    width: Math.max(1, Math.round(baseSize.width * multiplier)),
    height: Math.max(1, Math.round(baseSize.height * multiplier))
  };
}

/**
 * Check if position is valid for decoration placement
 */
export function isValidGridPosition(
  gridX: number,
  gridY: number,
  decorationSize: { width: number; height: number },
  config: DecorationGridConfig = DEFAULT_DECORATION_GRID,
  existingDecorations: Array<{ gridX: number; gridY: number; width: number; height: number }> = []
): boolean {
  const maxGridX = Math.floor(config.canvasWidth / config.cellSize);
  const maxGridY = Math.floor(config.canvasHeight / config.cellSize);

  // Check bounds
  if (gridX < 0 || gridY < 0 ||
    gridX + decorationSize.width > maxGridX ||
    gridY + decorationSize.height > maxGridY) {
    return false;
  }

  // Check collision with existing decorations
  for (const existing of existingDecorations) {
    if (gridX < existing.gridX + existing.width &&
      gridX + decorationSize.width > existing.gridX &&
      gridY < existing.gridY + existing.height &&
      gridY + decorationSize.height > existing.gridY) {
      return false;
    }
  }

  return true;
}

/**
 * Find the nearest valid grid position for decoration placement
 */
export function findNearestValidPosition(
  targetGridX: number,
  targetGridY: number,
  decorationSize: { width: number; height: number },
  config: DecorationGridConfig = DEFAULT_DECORATION_GRID,
  existingDecorations: Array<{ gridX: number; gridY: number; width: number; height: number }> = []
): GridPosition | null {
  // Try the target position first
  if (isValidGridPosition(targetGridX, targetGridY, decorationSize, config, existingDecorations)) {
    return gridToPixel(targetGridX, targetGridY, config);
  }

  // Search in expanding spiral pattern
  const maxDistance = Math.max(
    Math.floor(config.canvasWidth / config.cellSize),
    Math.floor(config.canvasHeight / config.cellSize)
  );

  for (let distance = 1; distance <= maxDistance; distance++) {
    for (let dx = -distance; dx <= distance; dx++) {
      for (let dy = -distance; dy <= distance; dy++) {
        // Only check positions on the edge of the current distance
        if (Math.abs(dx) !== distance && Math.abs(dy) !== distance) continue;

        const testX = targetGridX + dx;
        const testY = targetGridY + dy;

        if (isValidGridPosition(testX, testY, decorationSize, config, existingDecorations)) {
          return gridToPixel(testX, testY, config);
        }
      }
    }
  }

  return null; // No valid position found
}

/**
 * Calculate smart spacing suggestions between decorations
 */
export function calculateSpacingSuggestions(
  decorations: Array<{ gridX: number; gridY: number; width: number; height: number }>
): Array<{ gridX: number; gridY: number; score: number }> {
  const suggestions: Array<{ gridX: number; gridY: number; score: number }> = [];

  // Common spacing patterns (in grid cells)
  const spacingPatterns = [1, 2, 3]; // 1, 2, or 3 cell spacing

  decorations.forEach(decoration => {
    spacingPatterns.forEach(spacing => {
      // Suggest positions around each decoration
      const positions = [
        { gridX: decoration.gridX + decoration.width + spacing, gridY: decoration.gridY }, // Right
        { gridX: decoration.gridX - spacing - 1, gridY: decoration.gridY }, // Left
        { gridX: decoration.gridX, gridY: decoration.gridY + decoration.height + spacing }, // Below
        { gridX: decoration.gridX, gridY: decoration.gridY - spacing - 1 }, // Above
      ];

      positions.forEach(pos => {
        // Score based on spacing (smaller spacing = higher score)
        const score = 1 / spacing;
        suggestions.push({ ...pos, score });
      });
    });
  });

  return suggestions;
}