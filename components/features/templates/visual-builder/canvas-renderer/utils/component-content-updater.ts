/**
 * Utility for updating component content
 * Handles both new and legacy prop structures
 */

import type { ComponentItem } from '@/hooks/useCanvasState';

/**
 * Creates a content update handler that works with both new and legacy prop structures
 */
export function createContentUpdateHandler(
  component: ComponentItem,
  updateComponent: (id: string, updates: Partial<ComponentItem>) => void
) {
  return (content: string, cssRenderMode?: string) => {
    // Update using new prop structure if available, otherwise fall back to legacy
    if (component.publicProps || component.visualBuilderState) {
      // NEW: Update public props
      const updatedPublicProps = {
        ...component.publicProps,
        content: content
      };
      if (cssRenderMode !== undefined) {
        updatedPublicProps.cssRenderMode = cssRenderMode;
      }
      updateComponent(component.id, {
        publicProps: updatedPublicProps
      });
    } else {
      // LEGACY: Update old props structure
      const updatedProps: any = {
        ...component.props,
        content: content
      };
      if (cssRenderMode !== undefined) {
        updatedProps.cssRenderMode = cssRenderMode;
      }
      updateComponent(component.id, {
        props: updatedProps
      });
    }
  };
}
