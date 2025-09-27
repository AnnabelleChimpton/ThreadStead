import { useState, useCallback, useMemo } from 'react'
import {
  snapToGrid,
  findNearestValidPosition,
  getDecorationGridSize,
  calculateSpacingSuggestions,
  DecorationGridConfig,
  DEFAULT_DECORATION_GRID,
  GridPosition,
  SnapResult
} from '@/lib/pixel-homes/decoration-grid-utils'

interface DecorationItem {
  id: string
  type: 'plant' | 'path' | 'feature' | 'seasonal' | 'furniture' | 'lighting' | 'water' | 'structure'
  zone: 'front_yard' | 'house_facade' | 'background'
  position: { x: number; y: number; layer?: number }
  variant?: string
  size?: 'small' | 'medium' | 'large'
  gridPosition?: { gridX: number; gridY: number; width: number; height: number }
}

interface SnapPreview {
  position: GridPosition
  valid: boolean
  snapType: 'grid' | 'decoration' | 'spacing' | 'none'
  snapTarget?: string
  suggestions?: Array<{ gridX: number; gridY: number; score: number }>
}

interface UseDecorationSnappingProps {
  gridConfig?: DecorationGridConfig
  decorations: DecorationItem[]
  enableSnapping?: boolean
  enableSpacingSuggestions?: boolean
}

export default function useDecorationSnapping({
  gridConfig = DEFAULT_DECORATION_GRID,
  decorations,
  enableSnapping = true,
  enableSpacingSuggestions = true
}: UseDecorationSnappingProps) {
  const [previewPosition, setPreviewPosition] = useState<SnapPreview | null>(null)
  const [isSnapping, setIsSnapping] = useState(enableSnapping)

  // Convert decorations to grid positions for collision detection
  const gridDecorations = useMemo(() => {
    return decorations.map(decoration => {
      const size = getDecorationGridSize(decoration.type, decoration.id.split('_')[0], decoration.size);
      const gridX = Math.floor(decoration.position.x / gridConfig.cellSize);
      const gridY = Math.floor(decoration.position.y / gridConfig.cellSize);

      return {
        ...decoration,
        gridPosition: {
          gridX,
          gridY,
          width: size.width,
          height: size.height
        }
      };
    });
  }, [decorations, gridConfig.cellSize]);

  // Calculate spacing suggestions based on existing decorations
  const spacingSuggestions = useMemo(() => {
    if (!enableSpacingSuggestions || gridDecorations.length === 0) {
      return [];
    }

    return calculateSpacingSuggestions(
      gridDecorations.map(d => d.gridPosition!)
    );
  }, [gridDecorations, enableSpacingSuggestions]);

  /**
   * Snap decoration to grid or other decorations
   */
  const snapDecoration = useCallback((
    pixelX: number,
    pixelY: number,
    decorationType: string,
    decorationId: string,
    size: 'small' | 'medium' | 'large' = 'medium',
    excludeId?: string
  ): SnapResult => {
    if (!isSnapping) {
      return {
        position: { gridX: 0, gridY: 0, pixelX, pixelY },
        snapped: false,
        snapType: 'none'
      };
    }

    // Get decoration size in grid cells
    const decorationSize = getDecorationGridSize(decorationType, decorationId, size);

    // Try grid snapping first
    const gridSnap = snapToGrid(pixelX, pixelY, gridConfig);

    if (gridSnap.snapped) {
      // Check if grid position is valid (no collisions)
      const existingDecorations = gridDecorations
        .filter(d => d.id !== excludeId)
        .map(d => d.gridPosition!);

      const isValid = findNearestValidPosition(
        gridSnap.position.gridX,
        gridSnap.position.gridY,
        decorationSize,
        gridConfig,
        existingDecorations
      );

      if (isValid) {
        return gridSnap;
      }

      // If grid position is invalid, find nearest valid position
      const nearestValid = findNearestValidPosition(
        gridSnap.position.gridX,
        gridSnap.position.gridY,
        decorationSize,
        gridConfig,
        existingDecorations
      );

      if (nearestValid) {
        return {
          position: nearestValid,
          snapped: true,
          snapType: 'grid'
        };
      }
    }

    // Try spacing-based snapping
    if (enableSpacingSuggestions && spacingSuggestions.length > 0) {
      const targetGridX = Math.round(pixelX / gridConfig.cellSize);
      const targetGridY = Math.round(pixelY / gridConfig.cellSize);

      // Find closest spacing suggestion
      const closestSuggestion = spacingSuggestions.reduce((closest, suggestion) => {
        const distance = Math.sqrt(
          Math.pow(suggestion.gridX - targetGridX, 2) +
          Math.pow(suggestion.gridY - targetGridY, 2)
        );

        if (!closest || distance < closest.distance) {
          return { ...suggestion, distance };
        }

        return closest;
      }, null as any);

      if (closestSuggestion && closestSuggestion.distance <= 2) {
        const existingDecorations = gridDecorations
          .filter(d => d.id !== excludeId)
          .map(d => d.gridPosition!);

        const spacingPosition = findNearestValidPosition(
          closestSuggestion.gridX,
          closestSuggestion.gridY,
          decorationSize,
          gridConfig,
          existingDecorations
        );

        if (spacingPosition) {
          return {
            position: spacingPosition,
            snapped: true,
            snapType: 'spacing'
          };
        }
      }
    }

    // No snapping - return original position
    return {
      position: { gridX: 0, gridY: 0, pixelX, pixelY },
      snapped: false,
      snapType: 'none'
    };
  }, [isSnapping, gridConfig, gridDecorations, spacingSuggestions, enableSpacingSuggestions]);

  /**
   * Update preview position while dragging/placing
   */
  const updatePreview = useCallback((
    pixelX: number,
    pixelY: number,
    decorationType: string,
    decorationId: string,
    size: 'small' | 'medium' | 'large' = 'medium',
    excludeId?: string
  ) => {
    const snapResult = snapDecoration(pixelX, pixelY, decorationType, decorationId, size, excludeId);

    const decorationSize = getDecorationGridSize(decorationType, decorationId, size);
    const existingDecorations = gridDecorations
      .filter(d => d.id !== excludeId)
      .map(d => d.gridPosition!);

    const isValid = findNearestValidPosition(
      snapResult.position.gridX,
      snapResult.position.gridY,
      decorationSize,
      gridConfig,
      existingDecorations
    ) !== null;

    setPreviewPosition({
      position: snapResult.position,
      valid: isValid,
      snapType: snapResult.snapType,
      snapTarget: snapResult.snapTarget,
      suggestions: enableSpacingSuggestions ? spacingSuggestions : undefined
    });
  }, [snapDecoration, gridDecorations, gridConfig, enableSpacingSuggestions, spacingSuggestions]);

  /**
   * Clear preview position
   */
  const clearPreview = useCallback(() => {
    setPreviewPosition(null);
  }, []);

  /**
   * Toggle snapping on/off
   */
  const toggleSnapping = useCallback(() => {
    setIsSnapping(prev => !prev);
  }, []);

  /**
   * Get valid drop zones for a decoration
   */
  const getValidDropZones = useCallback((
    decorationType: string,
    decorationId: string,
    size: 'small' | 'medium' | 'large' = 'medium'
  ) => {
    const decorationSize = getDecorationGridSize(decorationType, decorationId, size);
    const existingDecorations = gridDecorations.map(d => d.gridPosition!);
    const validZones: Array<{ gridX: number; gridY: number; score: number }> = [];

    const maxGridX = Math.floor(gridConfig.canvasWidth / gridConfig.cellSize);
    const maxGridY = Math.floor(gridConfig.canvasHeight / gridConfig.cellSize);

    // Check all possible positions
    for (let gridX = 0; gridX <= maxGridX - decorationSize.width; gridX++) {
      for (let gridY = 0; gridY <= maxGridY - decorationSize.height; gridY++) {
        const isValid = findNearestValidPosition(
          gridX,
          gridY,
          decorationSize,
          gridConfig,
          existingDecorations
        ) !== null;

        if (isValid) {
          // Calculate score based on proximity to other decorations and spacing
          let score = 0;

          // Prefer positions with good spacing
          const spacingSuggestion = spacingSuggestions.find(s => s.gridX === gridX && s.gridY === gridY);
          if (spacingSuggestion) {
            score += spacingSuggestion.score * 10;
          }

          // Prefer positions not too isolated
          const nearbyDecorations = existingDecorations.filter(d =>
            Math.abs(d.gridX - gridX) <= 3 && Math.abs(d.gridY - gridY) <= 3
          );
          score += nearbyDecorations.length * 2;

          validZones.push({ gridX, gridY, score });
        }
      }
    }

    return validZones.sort((a, b) => b.score - a.score);
  }, [gridDecorations, gridConfig, spacingSuggestions]);

  return {
    // State
    previewPosition,
    isSnapping,
    spacingSuggestions,
    gridDecorations,

    // Actions
    snapDecoration,
    updatePreview,
    clearPreview,
    toggleSnapping,
    getValidDropZones,

    // Config
    gridConfig
  };
}