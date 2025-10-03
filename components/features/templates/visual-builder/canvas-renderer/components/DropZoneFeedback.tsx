/**
 * Drop zone feedback for visual builder drag operations
 *
 * Displays visual feedback when dragging components:
 * - Parent component highlights
 * - Container drop zone indicators
 * - Drop action text labels
 *
 * Usage:
 * ```typescript
 * <DropZoneFeedback
 *   previewPosition={previewPosition}
 *   dropZoneState={dragAndDrop.dropZoneState}
 *   draggedComponent={draggedComponent}
 * />
 * ```
 */

import React from 'react';
import type { ComponentItem } from '@/hooks/useCanvasState';
import { componentRegistry } from '@/lib/templates/core/template-registry';

export interface DropZoneState {
  dropAction: 'invalid' | 'normal' | 'add-to-parent' | 'add-to-container' | 'create-parent';
  parentComponent?: ComponentItem | null;
  targetContainer?: ComponentItem | null;
}

export interface DropZoneFeedbackProps {
  /**
   * Current preview position
   */
  previewPosition: { x: number; y: number } | null;

  /**
   * Drop zone state from drag and drop hook
   */
  dropZoneState: DropZoneState;

  /**
   * Component being dragged
   */
  draggedComponent: ComponentItem | null;
}

/**
 * Renders drop zone visual feedback
 */
export default function DropZoneFeedback({
  previewPosition,
  dropZoneState,
  draggedComponent
}: DropZoneFeedbackProps) {
  if (!previewPosition || dropZoneState.dropAction === 'invalid') return null;

  const feedbackElements = [];

  // Highlight parent component if adding to existing parent
  if (dropZoneState.dropAction === 'add-to-parent' && dropZoneState.parentComponent) {
    feedbackElements.push(
      <div
        key="parent-highlight"
        className="absolute pointer-events-none border-4 border-green-400 bg-green-100 bg-opacity-20 rounded-lg"
        style={{
          left: dropZoneState.parentComponent.position?.x || 0,
          top: dropZoneState.parentComponent.position?.y || 0,
          width: 'auto', // Let component determine its width
          height: 'auto', // Let component determine its height
          zIndex: 999,
        }}
      />
    );
  }

  // Highlight container component if adding to existing container
  if (dropZoneState.dropAction === 'add-to-container' && dropZoneState.targetContainer) {
    feedbackElements.push(
      <div
        key="container-highlight"
        className="absolute pointer-events-none border-4 border-blue-400 bg-blue-100 bg-opacity-30 rounded-lg animate-pulse"
        style={{
          left: dropZoneState.targetContainer.position?.x || 0,
          top: dropZoneState.targetContainer.position?.y || 0,
          width: 'auto', // Let component determine its width
          height: 'auto', // Let component determine its height
          zIndex: 999,
        }}
      >
        {/* Drop zone indicator */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-blue-500 text-white px-2 py-1 rounded text-xs font-semibold">
            📦 Drop Zone
          </div>
        </div>
      </div>
    );
  }

  // Drop action indicator
  let actionText = '';
  let actionColor = 'bg-blue-500';

  switch (dropZoneState.dropAction) {
    case 'add-to-parent':
      actionText = `Add to ${dropZoneState.parentComponent?.type}`;
      actionColor = 'bg-green-500';
      break;
    case 'add-to-container':
      actionText = `Add inside ${dropZoneState.targetContainer?.type}`;
      actionColor = 'bg-blue-500';
      break;
    case 'create-parent':
      const relationship = draggedComponent ? componentRegistry.get(draggedComponent.type)?.relationship : undefined;
      const parentType = Array.isArray(relationship?.requiresParent)
        ? relationship.requiresParent[0]
        : relationship?.requiresParent;
      actionText = `Create ${parentType} container`;
      actionColor = 'bg-purple-500';
      break;
    case 'normal':
      actionText = 'Place component';
      actionColor = 'bg-gray-500';
      break;
  }

  if (actionText) {
    feedbackElements.push(
      <div
        key="action-indicator"
        className={`absolute pointer-events-none ${actionColor} text-white text-xs px-2 py-1 rounded shadow-lg`}
        style={{
          left: previewPosition.x,
          top: previewPosition.y - 30,
          zIndex: 1001,
        }}
      >
        {actionText}
      </div>
    );
  }

  return <>{feedbackElements}</>;
}
