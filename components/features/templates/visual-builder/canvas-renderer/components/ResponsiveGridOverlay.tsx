/**
 * Responsive grid overlay component for visual builder canvas
 * Shows column and row grid lines with configurable spacing
 */

import React from 'react';
import type { GridConfig } from '@/hooks/useCanvasState';

interface ResponsiveGridOverlayProps {
  gridConfig: GridConfig;
  canvasWidth: number;
  canvasHeight: number;
}

export default function ResponsiveGridOverlay({
  gridConfig,
  canvasWidth,
  canvasHeight
}: ResponsiveGridOverlayProps) {
  if (!gridConfig.enabled || !gridConfig.showGrid) {
    return null;
  }

  const { columns, rowHeight, gap } = gridConfig;

  // Calculate column width - canvas now has padding applied
  const effectiveWidth = canvasWidth - (gridConfig.currentBreakpoint.containerPadding * 2);
  const columnWidth = (effectiveWidth - (columns + 1) * gap) / columns;

  const gridLines = [];

  // Vertical lines (columns) - start from gap since canvas has padding
  for (let i = 0; i <= columns; i++) {
    const x = (i * (columnWidth + gap)) + gap;
    gridLines.push(
      <line
        key={`col-${i}`}
        x1={x}
        y1={0}
        x2={x}
        y2={canvasHeight}
        stroke="rgba(59, 130, 246, 0.4)"
        strokeWidth="1"
        strokeDasharray="2,2"
      />
    );
  }

  // Show regular grid with fixed row heights
  const rows = Math.ceil((canvasHeight - gap) / (rowHeight + gap));
  for (let i = 0; i <= rows; i++) {
    const y = i * (rowHeight + gap) + gap;
    if (y <= canvasHeight) {
      gridLines.push(
        <line
          key={`row-${i}`}
          x1={0}
          y1={y}
          x2={canvasWidth}
          y2={y}
          stroke="rgba(59, 130, 246, 0.4)"
          strokeWidth="1"
          strokeDasharray="2,2"
        />
      );
    }
  }

  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      width={canvasWidth}
      height={canvasHeight}
      style={{ zIndex: 1 }}
    >
      {gridLines}
      <text
        x={10}
        y={20}
        fill="rgba(59, 130, 246, 0.6)"
        fontSize="12"
        fontFamily="monospace"
      >
        {columns} cols × {gap}px gap × {rowHeight}px rows
      </text>
    </svg>
  );
}
