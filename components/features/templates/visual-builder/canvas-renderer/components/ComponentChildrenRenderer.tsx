/**
 * Renders children of a component, handling special cases like ContactMethod
 */

import React from 'react';
import type { ComponentItem } from '@/hooks/useCanvasState';
import NestedComponentRenderer from './NestedComponentRenderer';
import { isContainerComponent } from '../utils/component-type-checkers';

interface ComponentChildrenRendererProps {
  component: ComponentItem;
  selectedComponentIds: Set<string>;
  placedComponents: ComponentItem[];
  handleComponentClick: (componentId: string, event: React.MouseEvent) => void;
  updateChildComponent: (parentId: string, childId: string, updates: Partial<ComponentItem>) => void;
  removeChildComponent: (parentId: string, childId: string) => void;
  moveChildToCanvas: (parentId: string, childId: string, position: { x: number; y: number }) => void;
}

export default function ComponentChildrenRenderer({
  component,
  selectedComponentIds,
  placedComponents,
  handleComponentClick,
  updateChildComponent,
  removeChildComponent,
  moveChildToCanvas,
}: ComponentChildrenRendererProps) {
  return (
    <>
      {/* Render children based on component type */}
      {component.children?.map((child) => {
        // For ContactMethod children, use data attributes that ContactCard expects
        if (child.type === 'ContactMethod') {
          return (
            <div
              key={child.id}
              data-contact-type={child.props?.type || 'email'}
              data-contact-value={child.props?.value || ''}
              data-contact-label={child.props?.label || ''}
              data-contact-icon={child.props?.icon || ''}
              data-contact-copyable={child.props?.copyable !== false}
              data-contact-priority={child.props?.priority || 5}
            />
          );
        }

        // Render nested components as actual React components
        return (
          <NestedComponentRenderer
            key={child.id}
            child={child}
            selectedComponentIds={selectedComponentIds}
            placedComponents={placedComponents}
            handleComponentClick={handleComponentClick}
            updateChildComponent={updateChildComponent}
            removeChildComponent={removeChildComponent}
            moveChildToCanvas={moveChildToCanvas}
          />
        );
      })}

      {/* Empty state for container components with no children */}
      {isContainerComponent(component.type) && (!component.children || component.children.length === 0) && (
        <div className="flex items-center justify-center text-gray-400 text-sm border-2 border-dashed border-gray-300 rounded-lg m-2 h-full min-h-20">
          <div className="text-center">
            <div className="text-2xl mb-1">📦</div>
            <div>Drop components here</div>
          </div>
        </div>
      )}
    </>
  );
}
