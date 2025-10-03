/**
 * Drag preview component for canvas components being dragged
 *
 * Shows a semi-transparent ghost of the component being dragged
 * with a pulsing blue border for visual feedback.
 *
 * Usage:
 * ```typescript
 * <DragPreview
 *   draggedComponent={draggedComponent}
 *   previewPosition={previewPosition}
 * />
 * ```
 */

import React from 'react';
import type { ComponentItem } from '@/hooks/useCanvasState';
import { componentRegistry } from '@/lib/templates/core/template-registry';

export interface DragPreviewProps {
  /**
   * The component being dragged
   */
  draggedComponent: ComponentItem | null;

  /**
   * Preview position on the canvas
   */
  previewPosition: { x: number; y: number } | null;
}

/**
 * Renders a preview of the component being dragged
 */
export default function DragPreview({
  draggedComponent,
  previewPosition
}: DragPreviewProps) {
  if (!previewPosition || !draggedComponent) return null;

  const componentRegistration = componentRegistry.get(draggedComponent.type);
  if (!componentRegistration) return null;

  const { component: Component } = componentRegistration;

  return (
    <div
      className="absolute pointer-events-none opacity-70"
      style={{
        left: previewPosition.x,
        top: previewPosition.y,
        zIndex: 1000,
      }}
    >
      <Component {...(draggedComponent.props || {})} />
      <div className="absolute inset-0 border-2 border-blue-400 border-dashed rounded animate-pulse" />
    </div>
  );
}
