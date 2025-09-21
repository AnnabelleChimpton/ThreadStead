/**
 * VISUAL_BUILDER_PROGRESS: Grid Overlay Component
 * Phase 1: Visual Builder Foundation - Grid Visualization
 */

import React, { useMemo } from 'react';
import type { GridSystem, GridPosition } from '@/lib/templates/visual-builder/types';
import { GRID_CONSTANTS } from '@/lib/templates/visual-builder/constants';
import { gridToAbsolutePosition, gridToAbsoluteSize } from '@/lib/templates/visual-builder/grid-utils';

interface GridOverlayProps {
  gridSystem: GridSystem;
  isVisible: boolean;
  activeGridPosition?: GridPosition;
  occupiedPositions?: GridPosition[];
  snapZonePosition?: GridPosition;
  className?: string;
}

/**
 * Visual grid overlay component
 * Shows grid lines, active cells, and snap zones during drag operations
 */
export default function GridOverlay({
  gridSystem,
  isVisible,
  activeGridPosition,
  occupiedPositions = [],
  snapZonePosition,
  className = '',
}: GridOverlayProps) {
  // Calculate grid dimensions
  const gridWidth = useMemo(() => {
    return (gridSystem.columns * gridSystem.cellSize.width) +
           ((gridSystem.columns - 1) * gridSystem.gap);
  }, [gridSystem]);

  const gridHeight = useMemo(() => {
    return (gridSystem.rows * gridSystem.cellSize.height) +
           ((gridSystem.rows - 1) * gridSystem.gap);
  }, [gridSystem]);

  // Generate grid lines
  const gridLines = useMemo(() => {
    if (!isVisible) return null;

    const lines: React.ReactNode[] = [];

    // Vertical lines (columns)
    for (let col = 0; col <= gridSystem.columns; col++) {
      const x = col * (gridSystem.cellSize.width + gridSystem.gap) - gridSystem.gap / 2;

      lines.push(
        <line
          key={`v-${col}`}
          x1={x}
          y1={0}
          x2={x}
          y2={gridHeight}
          stroke={col % 4 === 0 ? GRID_CONSTANTS.GRID_COLORS.MAIN_LINE : GRID_CONSTANTS.GRID_COLORS.SUB_LINE}
          strokeWidth={col % 4 === 0 ? 2 : 1}
        />
      );
    }

    // Horizontal lines (rows)
    for (let row = 0; row <= gridSystem.rows; row++) {
      const y = row * (gridSystem.cellSize.height + gridSystem.gap) - gridSystem.gap / 2;

      lines.push(
        <line
          key={`h-${row}`}
          x1={0}
          y1={y}
          x2={gridWidth}
          y2={y}
          stroke={row % 3 === 0 ? GRID_CONSTANTS.GRID_COLORS.MAIN_LINE : GRID_CONSTANTS.GRID_COLORS.SUB_LINE}
          strokeWidth={row % 3 === 0 ? 2 : 1}
        />
      );
    }

    return lines;
  }, [isVisible, gridSystem, gridWidth, gridHeight]);

  // Generate grid cells for occupied positions
  const occupiedCells = useMemo(() => {
    if (!isVisible || occupiedPositions.length === 0) return null;

    return occupiedPositions.map((position, index) => {
      // gridToAbsolutePosition uses local GridPosition (column, row, span)
      const gridUtilsPosition = {
        column: position.column,
        row: position.row,
        span: position.columnSpan
      };
      // gridToAbsoluteSize uses FullGridPosition (column, row, columnSpan, rowSpan)
      const absolutePos = gridToAbsolutePosition(gridUtilsPosition, gridSystem);
      const absoluteSize = gridToAbsoluteSize(position, gridSystem);

      return (
        <rect
          key={`occupied-${index}`}
          x={absolutePos.x}
          y={absolutePos.y}
          width={absoluteSize.width}
          height={absoluteSize.height}
          fill="rgba(239, 68, 68, 0.1)"
          stroke="rgba(239, 68, 68, 0.3)"
          strokeWidth={1}
          rx={4}
        />
      );
    });
  }, [isVisible, occupiedPositions, gridSystem]);

  // Generate active grid cell
  const activeCell = useMemo(() => {
    if (!isVisible || !activeGridPosition) return null;

    // gridToAbsolutePosition uses local GridPosition (column, row, span)
    const gridUtilsPosition = {
      column: activeGridPosition.column,
      row: activeGridPosition.row,
      span: activeGridPosition.columnSpan
    };
    // gridToAbsoluteSize uses FullGridPosition (column, row, columnSpan, rowSpan)
    const absolutePos = gridToAbsolutePosition(gridUtilsPosition, gridSystem);
    const absoluteSize = gridToAbsoluteSize(activeGridPosition, gridSystem);

    return (
      <rect
        x={absolutePos.x}
        y={absolutePos.y}
        width={absoluteSize.width}
        height={absoluteSize.height}
        fill={GRID_CONSTANTS.GRID_COLORS.ACTIVE_CELL}
        stroke={GRID_CONSTANTS.GRID_COLORS.MAIN_LINE}
        strokeWidth={2}
        rx={4}
        style={{
          filter: 'drop-shadow(0 0 6px rgba(59, 130, 246, 0.3))',
          transition: 'all 0.1s ease-out'
        }}
      />
    );
  }, [isVisible, activeGridPosition, gridSystem]);

  // Generate snap zone
  const snapZone = useMemo(() => {
    if (!isVisible || !snapZonePosition) return null;

    // gridToAbsolutePosition uses local GridPosition (column, row, span)
    const gridUtilsPosition = {
      column: snapZonePosition.column,
      row: snapZonePosition.row,
      span: snapZonePosition.columnSpan
    };
    // gridToAbsoluteSize uses FullGridPosition (column, row, columnSpan, rowSpan)
    const absolutePos = gridToAbsolutePosition(gridUtilsPosition, gridSystem);
    const absoluteSize = gridToAbsoluteSize(snapZonePosition, gridSystem);

    return (
      <rect
        x={absolutePos.x}
        y={absolutePos.y}
        width={absoluteSize.width}
        height={absoluteSize.height}
        fill={GRID_CONSTANTS.GRID_COLORS.SNAP_ZONE}
        stroke="rgba(34, 197, 94, 0.9)"
        strokeWidth={2}
        strokeDasharray="3,3"
        rx={4}
        className="animate-pulse"
        style={{
          filter: 'drop-shadow(0 0 4px rgba(34, 197, 94, 0.4))'
        }}
      />
    );
  }, [isVisible, snapZonePosition, gridSystem]);

  // Generate column and row labels
  const labels = useMemo(() => {
    if (!isVisible) return null;

    const columnLabels: React.ReactNode[] = [];
    const rowLabels: React.ReactNode[] = [];

    // Column labels
    for (let col = 1; col <= gridSystem.columns; col++) {
      const x = (col - 1) * (gridSystem.cellSize.width + gridSystem.gap) + gridSystem.cellSize.width / 2;

      columnLabels.push(
        <text
          key={`col-label-${col}`}
          x={x}
          y={-8}
          textAnchor="middle"
          fontSize="10"
          fill={GRID_CONSTANTS.GRID_COLORS.MAIN_LINE}
          fontFamily="monospace"
        >
          {col}
        </text>
      );
    }

    // Row labels
    for (let row = 1; row <= Math.min(gridSystem.rows, 10); row++) {
      const y = (row - 1) * (gridSystem.cellSize.height + gridSystem.gap) + gridSystem.cellSize.height / 2;

      rowLabels.push(
        <text
          key={`row-label-${row}`}
          x={-8}
          y={y + 3}
          textAnchor="end"
          fontSize="10"
          fill={GRID_CONSTANTS.GRID_COLORS.MAIN_LINE}
          fontFamily="monospace"
        >
          {row}
        </text>
      );
    }

    return [...columnLabels, ...rowLabels];
  }, [isVisible, gridSystem]);

  if (!isVisible) {
    return null;
  }

  return (
    <div
      className={`grid-overlay ${className}`}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: gridWidth,
        height: gridHeight,
        pointerEvents: 'none',
        zIndex: 1,
      }}
    >
      <svg
        width={gridWidth}
        height={gridHeight}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
        }}
      >
        {/* Grid lines */}
        <g className="grid-lines">
          {gridLines}
        </g>

        {/* Labels */}
        <g className="grid-labels">
          {labels}
        </g>

        {/* Occupied cells */}
        <g className="occupied-cells">
          {occupiedCells}
        </g>

        {/* Snap zone */}
        <g className="snap-zone">
          {snapZone}
        </g>

        {/* Active cell */}
        <g className="active-cell">
          {activeCell}
        </g>
      </svg>
    </div>
  );
}

/**
 * Grid cell indicator component for individual cells
 */
interface GridCellIndicatorProps {
  gridPosition: GridPosition;
  gridSystem: GridSystem;
  type: 'active' | 'occupied' | 'available' | 'snap';
  className?: string;
}

export function GridCellIndicator({
  gridPosition,
  gridSystem,
  type,
  className = '',
}: GridCellIndicatorProps) {
  // gridToAbsolutePosition uses local GridPosition (column, row, span)
  const gridUtilsPosition = {
    column: gridPosition.column,
    row: gridPosition.row,
    span: gridPosition.columnSpan
  };
  // gridToAbsoluteSize uses FullGridPosition (column, row, columnSpan, rowSpan)
  const absolutePos = gridToAbsolutePosition(gridUtilsPosition, gridSystem);
  const absoluteSize = gridToAbsoluteSize(gridPosition, gridSystem);

  const getStyles = () => {
    switch (type) {
      case 'active':
        return {
          backgroundColor: GRID_CONSTANTS.GRID_COLORS.ACTIVE_CELL,
          border: `2px solid ${GRID_CONSTANTS.GRID_COLORS.MAIN_LINE}`,
        };
      case 'occupied':
        return {
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
        };
      case 'snap':
        return {
          backgroundColor: GRID_CONSTANTS.GRID_COLORS.SNAP_ZONE,
          border: '3px dashed rgba(34, 197, 94, 0.8)',
        };
      case 'available':
      default:
        return {
          backgroundColor: 'rgba(156, 163, 175, 0.05)',
          border: '1px solid rgba(156, 163, 175, 0.2)',
        };
    }
  };

  return (
    <div
      className={`grid-cell-indicator grid-cell-indicator--${type} ${className}`}
      style={{
        position: 'absolute',
        left: absolutePos.x,
        top: absolutePos.y,
        width: absoluteSize.width,
        height: absoluteSize.height,
        borderRadius: '4px',
        pointerEvents: 'none',
        transition: 'all 0.2s ease-in-out',
        ...getStyles(),
      }}
    />
  );
}