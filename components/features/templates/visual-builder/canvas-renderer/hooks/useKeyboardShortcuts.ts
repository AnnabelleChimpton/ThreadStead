/**
 * Keyboard shortcuts hook for canvas
 * Handles resize operations and snapping controls via keyboard
 */

import { useEffect } from 'react';
import type { ComponentItem } from '@/hooks/useCanvasState';
import { getCurrentBreakpoint } from '@/lib/templates/visual-builder/grid-utils';
import { getComponentResizeCapability, getComponentCurrentSize } from '@/lib/templates/visual-builder/resize-utils';

/**
 * Hook for keyboard shortcuts in the visual builder canvas
 */
export function useKeyboardShortcuts(
  selectedComponentIds: Set<string>,
  draggedComponentId: string | null,
  resizingComponentId: string | null,
  placedComponents: ComponentItem[],
  canvasWidth: number,
  updateComponentSize: (id: string, size: { width: number; height: number }) => void,
  setSnapConfig: (updater: (prev: any) => any) => void
): void {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Snapping toggle shortcuts (Alt + key)
      if (event.altKey && !event.ctrlKey && !event.metaKey) {
        let handled = false;

        if (event.key === 'c' || event.key === 'C') {
          // Alt + C: Toggle component snapping
          setSnapConfig(prev => ({ ...prev, componentSnapping: !prev.componentSnapping }));
          handled = true;
        } else if (event.key === 'h' || event.key === 'H') {
          // Alt + H: Toggle guides visibility
          setSnapConfig(prev => ({ ...prev, showGuides: !prev.showGuides }));
          handled = true;
        }

        if (handled) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
      }

      // Only handle resize shortcuts if a component is selected and not being dragged
      if (selectedComponentIds.size !== 1 || draggedComponentId || resizingComponentId) {
        return;
      }

      const selectedId = Array.from(selectedComponentIds)[0];
      const component = placedComponents.find(comp => comp.id === selectedId);
      if (!component) return;

      const resizeCapability = getComponentResizeCapability(component.type);
      if (!resizeCapability.canResize) return;

      const currentBreakpoint = getCurrentBreakpoint(canvasWidth);
      let handled = false;

      // Resize with Ctrl/Cmd + Arrow keys - unified pixel-based resizing
      if (event.ctrlKey || event.metaKey) {
        const step = event.shiftKey ? 10 : 1; // Larger steps with Shift

        // All components now use pixel-based resizing
        const currentSize = getComponentCurrentSize(component, currentBreakpoint);
        let newWidth = currentSize.width;
        let newHeight = currentSize.height;

        if (event.key === 'ArrowRight' && resizeCapability.canResizeWidth) {
          newWidth += step;
          handled = true;
        } else if (event.key === 'ArrowLeft' && resizeCapability.canResizeWidth) {
          newWidth = Math.max(50, newWidth - step);
          handled = true;
        } else if (event.key === 'ArrowDown' && resizeCapability.canResizeHeight) {
          newHeight += step;
          handled = true;
        } else if (event.key === 'ArrowUp' && resizeCapability.canResizeHeight) {
          newHeight = Math.max(30, newHeight - step);
          handled = true;
        }

        if (handled) {
          updateComponentSize(selectedId, { width: newWidth, height: newHeight });
        }

        if (handled) {
          event.preventDefault();
          event.stopPropagation();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedComponentIds, draggedComponentId, resizingComponentId, placedComponents, canvasWidth, updateComponentSize, setSnapConfig]);
}
