/**
 * ResizePreviewOverlay Component
 *
 * Displays a visual overlay during component resize operations showing:
 * - Current dimensions
 * - Constraint warnings (min/max width/height)
 * - Visual feedback for resize state
 *
 * Extracted from CanvasRenderer.tsx Phase 2 Step 3
 */

import type { ComponentItem } from '@/hooks/useCanvasState';
import type { MeasuredDimensions } from '../../ResizableComponent';
import { getComponentResizeConstraints } from '@/lib/templates/visual-builder/resize-utils';
import type { GridBreakpoint } from '@/lib/templates/visual-builder/grid-utils';

export interface ResizePreviewOverlayProps {
  component: ComponentItem;
  resizePreview: {
    width: number;
    height: number;
    x: number;
    y: number;
  };
  currentBreakpoint: GridBreakpoint;
  measuredDimensions?: MeasuredDimensions;
}

export default function ResizePreviewOverlay({
  component,
  resizePreview,
  currentBreakpoint,
  measuredDimensions
}: ResizePreviewOverlayProps) {
  const constraints = getComponentResizeConstraints(component, currentBreakpoint);

  // Use resize preview dimensions directly
  const visualWidth = resizePreview.width;
  const visualHeight = resizePreview.height;

  // Position preview to overlay the component's container area exactly
  const previewStyle = {
    left: -2, // Slight border offset for visual feedback
    top: -2,
    width: visualWidth + 4,
    height: visualHeight + 4
  };

  // Check constraints
  const isAtMinWidth = visualWidth <= (constraints.minWidth || 0);
  const isAtMaxWidth = visualWidth >= (constraints.maxWidth || Infinity);
  const isAtMinHeight = visualHeight <= (constraints.minHeight || 0);
  const isAtMaxHeight = visualHeight >= (constraints.maxHeight || Infinity);

  const hasConstraintWarning = isAtMinWidth || isAtMaxWidth || isAtMinHeight || isAtMaxHeight;

  return (
    <div
      className={`absolute border-2 border-dashed rounded pointer-events-none opacity-80 z-30 ${
        hasConstraintWarning
          ? 'bg-yellow-100 border-yellow-500'
          : 'bg-blue-100 border-blue-500'
      }`}
      style={previewStyle}
    >
      {/* Size display */}
      <div className={`absolute top-1 left-1 text-white text-xs px-2 py-1 rounded font-mono ${
        hasConstraintWarning
          ? 'bg-yellow-600'
          : 'bg-blue-600'
      }`}>
        {Math.round(visualWidth)} × {Math.round(visualHeight)}
        {component.positioningMode === 'grid' && component.gridPosition && (
          <span className="ml-1 opacity-75">
            (span: {component.gridPosition.span})
          </span>
        )}
      </div>

      {/* Constraint warnings */}
      {hasConstraintWarning && (
        <div className="absolute bottom-1 left-1 bg-yellow-600 text-white text-xs px-2 py-1 rounded">
          {isAtMinWidth && 'Min width'}
          {isAtMaxWidth && 'Max width'}
          {isAtMinHeight && 'Min height'}
          {isAtMaxHeight && 'Max height'}
        </div>
      )}
    </div>
  );
}
