/**
 * Nested component renderer for container components
 * Renders child components within containers with edit controls
 */

import React from 'react';
import type { ComponentItem } from '@/hooks/useCanvasState';
import { componentRegistry } from '@/lib/templates/core/template-registry';
import { prepareComponentProps } from '../utils/component-props';
import { findParentOfChild } from '../utils/component-hierarchy';
import { isContainerComponent } from '../utils/component-type-checkers';

interface NestedComponentRendererProps {
  child: ComponentItem;
  selectedComponentIds: Set<string>;
  placedComponents: ComponentItem[];
  handleComponentClick: (id: string, e: React.MouseEvent) => void;
  updateChildComponent: (parentId: string, childId: string, updates: any) => void;
  removeChildComponent: (parentId: string, childId: string) => void;
  moveChildToCanvas: (parentId: string, childId: string, position: { x: number; y: number }) => void;
}

/**
 * Recursively renders a nested component inside a container
 */
export default function NestedComponentRenderer({
  child,
  selectedComponentIds,
  placedComponents,
  handleComponentClick,
  updateChildComponent,
  removeChildComponent,
  moveChildToCanvas
}: NestedComponentRendererProps) {
  const childRegistration = componentRegistry.get(child.type);

  if (!childRegistration) {
    return (
      <div key={child.id} className="p-2 border border-red-300 bg-red-50 text-red-600 text-sm rounded">
        Unknown component: {child.type}
      </div>
    );
  }

  const { component: ChildComponent } = childRegistration;
  const isSelected = selectedComponentIds.has(child.id);

  // Content change handler for nested components
  const handleContentChange = (content: string, cssRenderMode?: string) => {
    // Update using new prop structure if available, otherwise fall back to legacy
    if (child.publicProps || child.visualBuilderState) {
      // NEW: Update public props
      const updatedPublicProps = {
        ...child.publicProps,
        content: content
      };
      if (cssRenderMode !== undefined) {
        updatedPublicProps.cssRenderMode = cssRenderMode;
      }
      updateChildComponent(
        findParentOfChild(child.id, placedComponents)?.id || '',
        child.id,
        { publicProps: updatedPublicProps }
      );
    } else {
      // LEGACY: Update old props structure
      const updatedProps: any = {
        ...child.props,
        content: content
      };
      if (cssRenderMode !== undefined) {
        updatedProps.cssRenderMode = cssRenderMode;
      }
      updateChildComponent(
        findParentOfChild(child.id, placedComponents)?.id || '',
        child.id,
        { props: updatedProps }
      );
    }
  };

  return (
    <div
      key={child.id}
      className={`relative group ${isSelected ? 'ring-2 ring-blue-500 ring-opacity-50' : ''} animate-in fade-in duration-300`}
      onClick={(e) => {
        e.stopPropagation();
        handleComponentClick(child.id, e);
      }}
    >
      <ChildComponent
        {...prepareComponentProps(
          child,
          selectedComponentIds.has(child.id),
          handleContentChange,
          true // isNested = true for nested components
        )}
      >
        {/* Recursively render children if this child is also a container */}
        {isContainerComponent(child.type) && child.children?.map((grandChild) => {
          return (
            <NestedComponentRenderer
              key={grandChild.id}
              child={grandChild}
              selectedComponentIds={selectedComponentIds}
              placedComponents={placedComponents}
              handleComponentClick={handleComponentClick}
              updateChildComponent={updateChildComponent}
              removeChildComponent={removeChildComponent}
              moveChildToCanvas={moveChildToCanvas}
            />
          );
        })}
      </ChildComponent>

      {/* Nested child indicator */}
      <div className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
        🔗
      </div>

      {/* Control buttons for nested components - always visible when selected or on hover */}
      <div className={`absolute -top-2 -left-2 flex gap-1 transition-opacity ${
        isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
      }`}>
        {/* Remove from container button */}
        <button
          className="bg-red-500 hover:bg-red-600 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold shadow-lg border border-white"
          onClick={(e) => {
            e.stopPropagation();
            const parentComponent = findParentOfChild(child.id, placedComponents);
            if (parentComponent) {
              removeChildComponent(parentComponent.id, child.id);
            }
          }}
          title="Remove from container"
        >
          ✖
        </button>

        {/* Drag out of container button */}
        <button
          className="bg-orange-500 hover:bg-orange-600 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold shadow-lg border border-white"
          onClick={(e) => {
            e.stopPropagation();
            const parentComponent = findParentOfChild(child.id, placedComponents);
            if (parentComponent) {
              // Move child to canvas at a position near the parent
              const newPosition = {
                x: (parentComponent.position?.x || 0) + 220,
                y: (parentComponent.position?.y || 0)
              };
              moveChildToCanvas(parentComponent.id, child.id, newPosition);
            }
          }}
          title="Move to canvas"
        >
          📤
        </button>
      </div>

      {/* Selection indicator for nested components */}
      {isSelected && (
        <div className="absolute inset-0 border border-blue-400 border-dashed rounded pointer-events-none" />
      )}
    </div>
  );
}
