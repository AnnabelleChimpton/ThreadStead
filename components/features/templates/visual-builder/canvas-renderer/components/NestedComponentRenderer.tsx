/**
 * Nested component renderer for container components
 * Renders child components within containers with edit controls
 */

import React from 'react';
import { createPortal } from 'react-dom';
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
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const [portalTarget, setPortalTarget] = React.useState<HTMLElement | null>(null);

  // Set up portal target on mount (document.body for control buttons)
  React.useEffect(() => {
    setPortalTarget(document.body);
  }, []);

  if (!childRegistration) {
    return (
      <div key={child.id} className="p-2 border border-red-300 bg-red-50 text-red-600 text-sm rounded">
        Unknown component: {child.type}
      </div>
    );
  }

  const { component: ChildComponent } = childRegistration;
  const isSelected = selectedComponentIds.has(child.id);

  // Check if this is an interactive component that shouldn't have nested buttons
  const isInteractiveComponent = ['Button', 'ArcadeButton'].includes(child.type);

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

  // Render control buttons
  const controlButtons = portalTarget && (
    <ControlButtons
      wrapperRef={wrapperRef}
      child={child}
      isSelected={isSelected}
      placedComponents={placedComponents}
      removeChildComponent={removeChildComponent}
      moveChildToCanvas={moveChildToCanvas}
    />
  );

  return (
    <div
      key={child.id}
      ref={wrapperRef}
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

      {/* Control buttons - use portal for interactive components to avoid nesting */}
      {isInteractiveComponent ? (
        portalTarget && createPortal(controlButtons, portalTarget)
      ) : (
        controlButtons
      )}

      {/* Selection indicator for nested components */}
      {isSelected && (
        <div className="absolute inset-0 border border-blue-400 border-dashed rounded pointer-events-none" />
      )}
    </div>
  );
}

/**
 * Control buttons component - separated to allow portal rendering
 */
function ControlButtons({
  wrapperRef,
  child,
  isSelected,
  placedComponents,
  removeChildComponent,
  moveChildToCanvas
}: {
  wrapperRef: React.RefObject<HTMLDivElement | null>;
  child: ComponentItem;
  isSelected: boolean;
  placedComponents: ComponentItem[];
  removeChildComponent: (parentId: string, childId: string) => void;
  moveChildToCanvas: (parentId: string, childId: string, position: { x: number; y: number }) => void;
}) {
  const [position, setPosition] = React.useState({ top: 0, left: 0 });
  const [isHovered, setIsHovered] = React.useState(false);

  // Update position when wrapper moves or when visibility changes
  React.useEffect(() => {
    if (!wrapperRef.current) return;

    const updatePosition = () => {
      const rect = wrapperRef.current?.getBoundingClientRect();
      if (rect) {
        setPosition({
          top: rect.top + window.scrollY - 8,
          left: rect.left + window.scrollX - 8
        });
      }
    };

    updatePosition();

    // Track hover state on the wrapper element
    const handleMouseEnter = () => setIsHovered(true);
    const handleMouseLeave = () => setIsHovered(false);

    wrapperRef.current.addEventListener('mouseenter', handleMouseEnter);
    wrapperRef.current.addEventListener('mouseleave', handleMouseLeave);

    // Update on scroll and resize
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);

    const currentWrapper = wrapperRef.current;

    return () => {
      if (currentWrapper) {
        currentWrapper.removeEventListener('mouseenter', handleMouseEnter);
        currentWrapper.removeEventListener('mouseleave', handleMouseLeave);
      }
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [wrapperRef, isSelected]);

  return (
    <div
      className={`fixed flex gap-1 transition-opacity z-50 ${
        isSelected || isHovered ? 'opacity-100' : 'opacity-0'
      }`}
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
    >
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
  );
}
