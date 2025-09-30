/**
 * CSS Grid Overlay Component
 * Phase 4.3: Grid System Integration
 *
 * Visualizes CSS Grid structure in the Visual Builder
 * Shows grid tracks, lines, and areas
 */

import React, { useMemo } from 'react';
import type { ComponentItem } from '@/hooks/useCanvasState';

interface CSSGridOverlayProps {
  gridComponents: ComponentItem[];
  canvasWidth: number;
  canvasHeight: number;
  className?: string;
}

interface GridTrack {
  size: number;
  type: 'fr' | 'px' | 'auto' | '%' | 'minmax';
  value: string;
}

interface GridLinePosition {
  position: number;
  lineNumber: number;
  isImplicit: boolean;
}

/**
 * Parse CSS Grid template value into tracks
 * Supports: repeat(), fr units, px, auto, %
 */
function parseCSSGridTemplate(template: string | undefined): GridTrack[] {
  if (!template) return [{ size: 1, type: 'fr', value: '1fr' }];

  const tracks: GridTrack[] = [];

  // Handle repeat() syntax
  if (template.includes('repeat(')) {
    const repeatMatch = template.match(/repeat\((\d+),\s*([^)]+)\)/);
    if (repeatMatch) {
      const count = parseInt(repeatMatch[1], 10);
      const trackValue = repeatMatch[2].trim();

      for (let i = 0; i < count; i++) {
        tracks.push(parseTrackValue(trackValue));
      }
      return tracks;
    }
  }

  // Split by spaces (simple case)
  const parts = template.split(/\s+/);
  return parts.map(part => parseTrackValue(part));
}

/**
 * Parse individual track value
 */
function parseTrackValue(value: string): GridTrack {
  if (value.endsWith('fr')) {
    return {
      size: parseFloat(value),
      type: 'fr',
      value
    };
  }

  if (value.endsWith('px')) {
    return {
      size: parseInt(value, 10),
      type: 'px',
      value
    };
  }

  if (value.endsWith('%')) {
    return {
      size: parseInt(value, 10),
      type: '%',
      value
    };
  }

  if (value === 'auto') {
    return {
      size: 100, // Default size for auto
      type: 'auto',
      value
    };
  }

  // Default fallback
  return {
    size: 1,
    type: 'fr',
    value: '1fr'
  };
}

/**
 * Calculate pixel positions for grid tracks
 */
function calculateTrackPositions(
  tracks: GridTrack[],
  containerSize: number,
  gap: number
): GridLinePosition[] {
  const positions: GridLinePosition[] = [{ position: 0, lineNumber: 1, isImplicit: false }];

  // Calculate total fr units
  const totalFr = tracks
    .filter(t => t.type === 'fr')
    .reduce((sum, t) => sum + t.size, 0);

  // Calculate fixed space (px, %, auto)
  const totalGaps = (tracks.length - 1) * gap;
  let fixedSpace = totalGaps;

  tracks.forEach(track => {
    if (track.type === 'px') {
      fixedSpace += track.size;
    } else if (track.type === '%') {
      fixedSpace += (track.size / 100) * containerSize;
    } else if (track.type === 'auto') {
      fixedSpace += 100; // Estimated auto size
    }
  });

  // Remaining space for fr units
  const frSpace = Math.max(0, containerSize - fixedSpace);
  const frUnitSize = totalFr > 0 ? frSpace / totalFr : 0;

  // Calculate each track position
  let currentPosition = 0;

  tracks.forEach((track, index) => {
    let trackSize = 0;

    switch (track.type) {
      case 'fr':
        trackSize = track.size * frUnitSize;
        break;
      case 'px':
        trackSize = track.size;
        break;
      case '%':
        trackSize = (track.size / 100) * containerSize;
        break;
      case 'auto':
        trackSize = 100; // Estimated
        break;
    }

    currentPosition += trackSize;
    if (index < tracks.length - 1) {
      currentPosition += gap;
    }

    positions.push({
      position: currentPosition,
      lineNumber: index + 2,
      isImplicit: false
    });
  });

  return positions;
}

/**
 * CSS Grid Overlay Component
 */
export default function CSSGridOverlay({
  gridComponents,
  canvasWidth,
  canvasHeight,
  className = '',
}: CSSGridOverlayProps) {
  // Render overlay for each Grid component
  const gridOverlays = useMemo(() => {
    return gridComponents.map(gridComponent => {
      const props: any = gridComponent.publicProps || gridComponent.props || {};

      // Get grid template values
      const gridTemplateColumns = props.gridTemplateColumns as string ||
                                   (props.columns ? `repeat(${props.columns}, 1fr)` : 'repeat(3, 1fr)');
      const gridTemplateRows = props.gridTemplateRows as string || 'auto';
      const gap = parseInt((props.gap as string) || '1rem', 10) || 16;

      // Parse grid tracks
      const columnTracks = parseCSSGridTemplate(gridTemplateColumns);
      const rowTracks = parseCSSGridTemplate(gridTemplateRows);

      // Get grid position (from visualBuilderState or position)
      const position = gridComponent.position || { x: 0, y: 0 };
      const size = (gridComponent.visualBuilderState?.size || gridComponent.props?._size) ||
                   { width: canvasWidth * 0.8, height: 400 };

      // Calculate track positions
      const columnPositions = calculateTrackPositions(columnTracks, size.width, gap);
      const rowPositions = calculateTrackPositions(rowTracks, size.height, gap);

      return {
        id: gridComponent.id,
        x: position.x,
        y: position.y,
        width: size.width,
        height: size.height,
        columnPositions,
        rowPositions,
        columnCount: columnTracks.length,
        rowCount: rowTracks.length
      };
    });
  }, [gridComponents, canvasWidth, canvasHeight]);

  if (gridComponents.length === 0) {
    return null;
  }

  return (
    <div
      className={`css-grid-overlay ${className}`}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: canvasWidth,
        height: canvasHeight,
        pointerEvents: 'none',
        zIndex: 5,
      }}
    >
      {gridOverlays.map(grid => (
        <svg
          key={grid.id}
          width={grid.width}
          height={grid.height}
          style={{
            position: 'absolute',
            left: grid.x,
            top: grid.y,
          }}
        >
          {/* Column lines */}
          <g className="grid-column-lines">
            {grid.columnPositions.map((pos, index) => (
              <line
                key={`col-${index}`}
                x1={pos.position}
                y1={0}
                x2={pos.position}
                y2={grid.height}
                stroke={index === 0 || index === grid.columnPositions.length - 1
                  ? 'rgba(34, 197, 94, 0.6)'
                  : 'rgba(34, 197, 94, 0.3)'}
                strokeWidth={index === 0 || index === grid.columnPositions.length - 1 ? 2 : 1}
                strokeDasharray="4,4"
              />
            ))}
          </g>

          {/* Row lines */}
          <g className="grid-row-lines">
            {grid.rowPositions.map((pos, index) => (
              <line
                key={`row-${index}`}
                x1={0}
                y1={pos.position}
                x2={grid.width}
                y2={pos.position}
                stroke={index === 0 || index === grid.rowPositions.length - 1
                  ? 'rgba(34, 197, 94, 0.6)'
                  : 'rgba(34, 197, 94, 0.3)'}
                strokeWidth={index === 0 || index === grid.rowPositions.length - 1 ? 2 : 1}
                strokeDasharray="4,4"
              />
            ))}
          </g>

          {/* Grid line numbers */}
          <g className="grid-line-numbers">
            {/* Column numbers */}
            {grid.columnPositions.map((pos, index) => (
              <text
                key={`col-num-${index}`}
                x={pos.position}
                y={-4}
                textAnchor="middle"
                fontSize="10"
                fill="rgba(34, 197, 94, 0.8)"
                fontFamily="monospace"
                fontWeight="600"
              >
                {pos.lineNumber}
              </text>
            ))}

            {/* Row numbers */}
            {grid.rowPositions.map((pos, index) => (
              <text
                key={`row-num-${index}`}
                x={-4}
                y={pos.position + 3}
                textAnchor="end"
                fontSize="10"
                fill="rgba(34, 197, 94, 0.8)"
                fontFamily="monospace"
                fontWeight="600"
              >
                {pos.lineNumber}
              </text>
            ))}
          </g>

          {/* Grid label */}
          <g className="grid-label">
            <text
              x={8}
              y={20}
              fontSize="11"
              fill="rgba(34, 197, 94, 0.9)"
              fontFamily="sans-serif"
              fontWeight="600"
            >
              CSS Grid ({grid.columnCount}×{grid.rowCount})
            </text>
          </g>
        </svg>
      ))}
    </div>
  );
}

/**
 * Grid Cell Highlight Component
 * Shows where a component will be placed in the grid
 */
interface GridCellHighlightProps {
  gridComponent: ComponentItem;
  column: number;
  row: number;
  colSpan?: number;
  rowSpan?: number;
}

export function GridCellHighlight({
  gridComponent,
  column,
  row,
  colSpan = 1,
  rowSpan = 1,
}: GridCellHighlightProps) {
  const props: any = gridComponent.publicProps || gridComponent.props || {};

  // Parse grid to find cell position
  const gridTemplateColumns = props.gridTemplateColumns as string ||
                               (props.columns ? `repeat(${props.columns}, 1fr)` : 'repeat(3, 1fr)');
  const gridTemplateRows = props.gridTemplateRows as string || 'auto';
  const gap = parseInt((props.gap as string) || '1rem', 10) || 16;

  const position = gridComponent.position || { x: 0, y: 0 };
  const size = (gridComponent.visualBuilderState?.size || gridComponent.props?._size) ||
               { width: 800, height: 400 };

  const columnTracks = parseCSSGridTemplate(gridTemplateColumns);
  const rowTracks = parseCSSGridTemplate(gridTemplateRows);

  const columnPositions = calculateTrackPositions(columnTracks, size.width, gap);
  const rowPositions = calculateTrackPositions(rowTracks, size.height, gap);

  // Calculate cell bounds
  const startCol = Math.min(column - 1, columnPositions.length - 1);
  const endCol = Math.min(column - 1 + colSpan, columnPositions.length - 1);
  const startRow = Math.min(row - 1, rowPositions.length - 1);
  const endRow = Math.min(row - 1 + rowSpan, rowPositions.length - 1);

  const x = columnPositions[startCol]?.position || 0;
  const y = rowPositions[startRow]?.position || 0;
  const width = (columnPositions[endCol]?.position || size.width) - x;
  const height = (rowPositions[endRow]?.position || size.height) - y;

  return (
    <div
      className="grid-cell-highlight"
      style={{
        position: 'absolute',
        left: position.x + x,
        top: position.y + y,
        width,
        height,
        backgroundColor: 'rgba(34, 197, 94, 0.15)',
        border: '2px solid rgba(34, 197, 94, 0.6)',
        borderRadius: '4px',
        pointerEvents: 'none',
        zIndex: 10,
        animation: 'pulse 1.5s infinite',
      }}
    />
  );
}