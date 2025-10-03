import React, { useRef, useCallback, useState, useEffect, useMemo } from 'react';
import type { ComponentItem, UseCanvasStateResult } from '@/hooks/useCanvasState';
import { componentRegistry } from '@/lib/templates/core/template-registry';
import type { ResidentData } from '@/components/features/templates/ResidentDataProvider';
import { ResidentDataProvider } from '@/components/features/templates/ResidentDataProvider';
import {
  getCurrentBreakpoint,
  getComponentSizingCategory,
} from '@/lib/templates/visual-builder/grid-utils';
import ResizableComponent from './ResizableComponent';
import SmartAlignment from './SmartAlignment';
import type { MeasuredDimensions } from './ResizableComponent';
import { SmartSnapping, type SnapResult } from '@/lib/templates/visual-builder/snapping-utils';
import AlignmentGuides, { useAlignmentGuides } from './AlignmentGuides';
import PositionIndicator, { usePositionIndicator } from './PositionIndicator';
import { generateCSSFromGlobalSettings } from '@/lib/templates/visual-builder/css-class-generator';
import CSSGridOverlay, { GridCellHighlight } from './CSSGridOverlay';

// Extracted canvas renderer modules
import { useCanvasSize, type ResponsiveBreakpoint } from './canvas-renderer/hooks/useCanvasSize';
import { useGridConfig } from './canvas-renderer/hooks/useGridConfig';
import { useComponentSelection } from './canvas-renderer/hooks/useComponentSelection';
import { useKeyboardShortcuts } from './canvas-renderer/hooks/useKeyboardShortcuts';
import { useDragAndDrop } from './canvas-renderer/hooks/useDragAndDrop';
import { useComponentResize } from './canvas-renderer/hooks/useComponentResize';
import { useComponentAnimations } from './canvas-renderer/hooks/useComponentAnimations';
import ResponsiveGridOverlay from './canvas-renderer/components/ResponsiveGridOverlay';
import RubberBandSelection from './canvas-renderer/components/RubberBandSelection';
import ResizePreviewOverlay from './canvas-renderer/components/ResizePreviewOverlay';
import DragPreview from './canvas-renderer/components/DragPreview';
import DropZoneFeedback from './canvas-renderer/components/DropZoneFeedback';
import CanvasAnimations from './canvas-renderer/styles/CanvasAnimations';
import { prepareComponentProps } from './canvas-renderer/utils/component-props';
import { isTextComponent } from './canvas-renderer/utils/component-type-checkers';
import { generateGlobalCSSProperties } from './canvas-renderer/utils/css-utilities';
import { calculateComponentStyles } from './canvas-renderer/utils/component-styling';
import { createContentUpdateHandler } from './canvas-renderer/utils/component-content-updater';
import ComponentIndicators from './canvas-renderer/components/ComponentIndicators';
import ComponentChildrenRenderer from './canvas-renderer/components/ComponentChildrenRenderer';
import { UnknownComponentFallback } from './canvas-renderer/components/InvalidComponentFallback';
import EmptyCanvasMessage from './canvas-renderer/components/EmptyCanvasMessage';
import SnappingControlsPanel from './canvas-renderer/components/SnappingControlsPanel';

interface CanvasRendererProps {
  canvasState: UseCanvasStateResult;
  residentData: ResidentData;
  className?: string;
  activeBreakpoint?: ResponsiveBreakpoint; // For responsive preview controls
}

/**
 * Main canvas area where components are rendered and edited - simplified like pixel homes
 */
export default function CanvasRenderer({
  canvasState,
  residentData,
  className = '',
  activeBreakpoint = 'desktop',
}: CanvasRendererProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Extract global settings from canvas state
  const { globalSettings } = canvasState;

  // Generate CSS classes for global settings
  const globalCSS = useMemo(() => {
    if (!globalSettings) return { css: '', classNames: [] };
    return generateCSSFromGlobalSettings(globalSettings);
  }, [globalSettings]);

  // Inject CSS into document head for visual builder
  useEffect(() => {
    if (!globalCSS.css) return;

    const styleId = 'visual-builder-global-css';
    let styleElement = document.getElementById(styleId) as HTMLStyleElement;

    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = styleId;
      document.head.appendChild(styleElement);
    }

    styleElement.textContent = globalCSS.css;

    return () => {
      // Clean up the style element when component unmounts
      const existingStyle = document.getElementById(styleId);
      if (existingStyle && existingStyle.parentNode) {
        existingStyle.parentNode.removeChild(existingStyle);
      }
    };
  }, [globalCSS.css]);

  // Full-screen responsive canvas sizing using extracted hook
  const canvasSize = useCanvasSize(activeBreakpoint);

  const {
    placedComponents,
    selectedComponentIds,
    draggedComponent,
    isDragging,
    previewPosition,
    gridConfig,
    setGridConfig,
    componentGroups,
    selectedGroupId,
    getComponentGroup,
    addComponent,
    addChildComponent,
    removeChildComponent,
    updateChildComponent,
    removeComponent,
    moveChildToCanvas,
    selectComponent,
    clearSelection,
    updateComponent,
    updateComponentPosition,
    updatePositionForActiveBreakpoint, // PHASE 4.2
    updateComponentSize,
    snapToGrid,
    startDrag,
    setPreviewPosition,
    endDrag,
  } = canvasState;

  // Sync gridConfig with activeBreakpoint selection using extracted hook
  useGridConfig(activeBreakpoint, setGridConfig);

  // Multi-select and rubber band selection using extracted hook
  const selection = useComponentSelection(
    placedComponents,
    selectedComponentIds,
    selectComponent,
    clearSelection,
    draggedComponent,
    isDragging
  );

  // Note: Auto-expand canvas height was removed during refactoring
  // The canvas now has a fixed height based on viewport/breakpoint
  // If auto-expand is needed, it should be added to useCanvasSize hook

  // Removed: handleComponentMouseDown, handleDragOver, handleDrop - now in useDragAndDrop hook
  // Removed: dropZoneState - now in useDragAndDrop hook

  // PHASE 4.3: CSS Grid cell highlight state
  const [gridCellHighlight, setGridCellHighlight] = useState<{
    gridComponent: ComponentItem | null;
    column: number;
    row: number;
    colSpan?: number;
    rowSpan?: number;
  } | null>(null);

  // Component lifecycle animations using extracted hook
  const { newlyAddedComponents, removingComponents } = useComponentAnimations(placedComponents);

  // Removed: handleDragOverWithPreview, handleDragLeave - now in useDragAndDrop hook
  // Removed: resizingComponentId, resizePreview state - now in useComponentResize hook

  // Snapping configuration state - unified smart snapping only
  const [snapConfig, setSnapConfig] = useState({
    componentSnapping: true,
    showGuides: true
  });

  // Smart snapping and alignment state - unified pixel-based snapping
  const smartSnapping = useMemo(() => new SmartSnapping({
    enabled: true,
    snapDistance: 8,
    componentSnapping: snapConfig.componentSnapping,
    gridSnapping: false, // Always disabled - using smart snapping only
    gridSize: gridConfig.gap || 20, // Keep for spacing reference
    showGuides: snapConfig.showGuides,
    showSnapDistance: true,

    // Enhanced magnetic snapping
    magneticZoneEnabled: true,
    magneticZoneRadius: 24,
    magneticStrength: 0.6,

    // Smart spacing detection
    spacingDetection: true,
    commonSpacings: [8, 12, 16, 20, 24, 32, 48],
    spacingTolerance: 4
  }), [snapConfig, gridConfig.gap]);

  const alignmentGuides = useAlignmentGuides();
  const positionIndicator = usePositionIndicator();
  const [snapResult, setSnapResult] = useState<SnapResult | null>(null);

  // Drag and drop operations using extracted hook
  const dragAndDrop = useDragAndDrop({
    // From canvasState
    draggedComponent,
    isDragging,
    placedComponents,
    addComponent,
    addChildComponent,
    removeComponent,
    endDrag,
    updatePositionForActiveBreakpoint,
    selectedComponentIds,
    selectComponent,
    // From CanvasRenderer
    canvasRef,
    canvasSize,
    activeBreakpoint: activeBreakpoint as "desktop" | "tablet" | "mobile",
    snapToGrid,
    smartSnapping,
    alignmentGuides,
    positionIndicator,
    setPreviewPosition,
    getEffectivePosition: (componentId: string, breakpoint: string) => {
      const comp = placedComponents.find(c => c.id === componentId);
      if (!comp) return { x: 0, y: 0, width: 200, height: 150 };
      return canvasState.getEffectivePosition(comp, breakpoint as "desktop" | "tablet" | "mobile");
    }
  });

  // Measured dimensions for accurate selection indicators
  const [componentDimensions, setComponentDimensions] = useState<Map<string, MeasuredDimensions>>(new Map());

  // Component resize operations using extracted hook
  const resize = useComponentResize({
    placedComponents,
    updateComponent,
    canvasWidth: canvasSize.width,
    componentDimensions,
    positionIndicator
  });

  // Handle measured dimensions updates
  const handleMeasuredDimensions = useCallback((componentId: string, dimensions: MeasuredDimensions | null) => {
    setComponentDimensions(prev => {
      const current = prev.get(componentId);

      // Only update if dimensions actually changed
      if (dimensions) {
        if (!current ||
            current.width !== dimensions.width ||
            current.height !== dimensions.height ||
            current.offsetX !== dimensions.offsetX ||
            current.offsetY !== dimensions.offsetY ||
            current.containerWidth !== dimensions.containerWidth ||
            current.containerHeight !== dimensions.containerHeight) {
          const newMap = new Map(prev);
          newMap.set(componentId, dimensions);
          return newMap;
        }
      } else if (current) {
        const newMap = new Map(prev);
        newMap.delete(componentId);
        return newMap;
      }

      return prev; // No change needed
    });
  }, []);

  // Create a stable callback that can be reused
  const handleMeasuredDimensionsWithId = useCallback((componentId: string, dimensions: MeasuredDimensions | null) => {
    handleMeasuredDimensions(componentId, dimensions);
  }, [handleMeasuredDimensions]);

  // Removed: handleComponentMouseDown, handleComponentMouseMove, handleComponentMouseUp - now in useDragAndDrop hook
  // Removed: handleResizeStart, handleResize, handleResizeEnd - now in useComponentResize hook
  // Removed: Mouse event listeners useEffect - now in useDragAndDrop hook

  // Keyboard shortcuts for resize operations and snapping controls using extracted hook
  useKeyboardShortcuts(
    selectedComponentIds,
    dragAndDrop.draggedComponentId,
    resize.resizingComponentId,
    placedComponents,
    canvasSize.width,
    updateComponentSize,
    setSnapConfig
  );


  // Enhanced visual feedback state
  const [hoveredComponentId, setHoveredComponentId] = useState<string | null>(null);
  const [showAlignmentGuides, setShowAlignmentGuides] = useState(false);

  // Helper to get CSS property for indicators
  const getCSSProp = useCallback((component: ComponentItem, key: string) => {
    if (component.publicProps && component.publicProps[key as keyof typeof component.publicProps] !== undefined) {
      return component.publicProps[key as keyof typeof component.publicProps];
    }
    if (component.props && component.props[key] !== undefined) {
      return component.props[key];
    }
    return undefined;
  }, []);

  // Direct component rendering (no template transformation)
  const renderComponent = useCallback((component: ComponentItem) => {
    // Safety check for invalid components
    if (!component || !component.id || !component.type) {
      console.error('Invalid component:', component);
      return null;
    }

    // PHASE 4.2: Use responsive position based on active breakpoint
    const effectivePos = canvasState.getEffectivePosition(component, activeBreakpoint);
    const currentPosition = { x: effectivePos.x, y: effectivePos.y };
    const currentSize = { width: effectivePos.width, height: effectivePos.height };

    const componentRegistration = componentRegistry.get(component.type);
    if (!componentRegistration) {
      console.warn('Component type not found in registry:', component.type);
      return (
        <UnknownComponentFallback
          key={component.id}
          componentId={component.id}
          componentType={component.type}
          currentPosition={currentPosition}
          onComponentClick={selection.handleComponentClick}
          onComponentMouseDown={dragAndDrop.handleComponentMouseDown}
        />
      );
    }

    const { component: Component } = componentRegistration;
    const isSelected = selectedComponentIds.has(component.id);

    try {
      // Calculate component styles using extracted utility
      const isNewlyAdded = newlyAddedComponents.has(component.id);
      const isRemoving = removingComponents.has(component.id);

      const { componentStyle, wrapperStyle } = calculateComponentStyles({
        component,
        currentPosition,
        isSelected,
        isDragging: dragAndDrop.draggedComponentId === component.id,
        isNewlyAdded,
        isRemoving
      });

      // Get component category for conditional rendering
      const componentCategory = getComponentSizingCategory(component.type);
      const isNavigation = component.type.toLowerCase().includes('navigation');

      return (
        <div
          key={component.id}
          className={`
            absolute cursor-move transition-all duration-300 ease-out
            ${(componentCategory === 'full-width' || isNavigation) ? 'w-full' : ''}
            ${isTextComponent(component.type) ? 'hover:ring-2 hover:ring-green-300 hover:ring-opacity-50' : ''}
            ${isNewlyAdded ? 'animate-scale-in' : ''}
            ${isRemoving ? 'animate-scale-out' : ''}
            ${isSelected ? 'ring-2 ring-blue-500 ring-opacity-70 shadow-lg' : ''}
            ${hoveredComponentId === component.id && !isSelected ? 'ring-2 ring-blue-300 ring-opacity-50 shadow-md' : ''}
            hover:shadow-lg
          `}
          style={{
            ...wrapperStyle,
            transform: `scale(${
              isSelected ? '1.01' :
              hoveredComponentId === component.id ? '1.005' : '1'
            })`,
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
          onClick={(e) => selection.handleComponentClick(component.id, e)}
          onMouseDown={(e) => dragAndDrop.handleComponentMouseDown(component.id, e)}
          onMouseEnter={() => !isDragging && setHoveredComponentId(component.id)}
          onMouseLeave={() => setHoveredComponentId(null)}
        >

          {/* ResizableComponent wrapper with Component as child */}
          <ResizableComponent
            component={component}
            isSelected={isSelected}
            isDragging={dragAndDrop.draggedComponentId === component.id}
            isResizing={resize.resizingComponentId === component.id}
            canvasWidth={canvasSize.width}
            onResizeStart={resize.handleResizeStart}
            onResize={resize.handleResize}
            onResizeEnd={resize.handleResizeEnd}
            onMeasuredDimensions={(dimensions) => handleMeasuredDimensionsWithId(component.id, dimensions)}
          >
            <Component
              {...prepareComponentProps(
                component,
                selectedComponentIds.has(component.id),
                createContentUpdateHandler(component, updateComponent)
              )}
            >
              <ComponentChildrenRenderer
                component={component}
                selectedComponentIds={selectedComponentIds}
                placedComponents={placedComponents}
                handleComponentClick={selection.handleComponentClick}
                updateChildComponent={(parentId: string, childId: string, updates: Partial<ComponentItem>) => {
                  updateChildComponent(parentId, childId, updates);
                }}
                removeChildComponent={removeChildComponent}
                moveChildToCanvas={moveChildToCanvas}
              />
            </Component>

            {/* All visual indicators */}
            <ComponentIndicators
              component={component}
              isSelected={isSelected}
              isDragging={dragAndDrop.draggedComponentId === component.id}
              componentDimensions={componentDimensions}
              hoveredComponentId={hoveredComponentId}
              getComponentGroup={(id: string) => getComponentGroup(id) || null}
              getCSSProp={(key) => getCSSProp(component, key)}
            />

            {/* Resize preview overlay */}
            {resize.resizingComponentId === component.id && resize.resizePreview && (
              <ResizePreviewOverlay
                component={component}
                resizePreview={resize.resizePreview}
                currentBreakpoint={getCurrentBreakpoint(canvasSize.width)}
                measuredDimensions={componentDimensions.get(component.id)}
              />
            )}
          </ResizableComponent>
        </div>
      );
    } catch (error) {
      console.error('Error rendering component:', error);
      // Return null on error
      return null;
    }
  }, [selectedComponentIds, selection.handleComponentClick, dragAndDrop.draggedComponentId, dragAndDrop.handleComponentMouseDown, resize.resizingComponentId, resize.resizePreview, resize.handleResizeStart, resize.handleResize, resize.handleResizeEnd, canvasSize.width, updateComponentSize, activeBreakpoint, canvasState.getEffectivePosition]);

  // Removed: renderPreview - now in DragPreview component
  // Removed: renderDropZoneFeedback - now in DropZoneFeedback component


  return (
    <ResidentDataProvider data={residentData}>
      {/* CSS Animations for Visual Builder */}
      <CanvasAnimations />

      <div
        className={`relative border border-gray-200 overflow-hidden ${className}`}
        key={`canvas-${placedComponents.length}`}
        style={{
          width: activeBreakpoint === 'desktop' ? '100%' : `${canvasSize.width}px`,
          height: `${canvasSize.height}px`,
          maxWidth: '100%',
          maxHeight: '100%'
        }}
      >
        {/* Canvas area - like pixel homes */}
        <div
          ref={canvasRef}
          className={`relative overflow-hidden ${
            isDragOver ? 'cursor-crosshair' : 'cursor-default'
          } ${globalCSS.classNames.join(' ')}`}
          style={{
            width: activeBreakpoint === 'desktop' ? '100%' : canvasSize.width,
            height: canvasSize.height,
            boxSizing: 'border-box',
            // Apply global settings (includes background, typography, effects)
            ...generateGlobalCSSProperties(globalSettings),
            // Default checkerboard if no global settings
            ...(!globalSettings && {
              background: 'linear-gradient(45deg, #f8f9fa 25%, transparent 25%, transparent 75%, #f8f9fa 75%, #f8f9fa), linear-gradient(45deg, #f8f9fa 25%, transparent 25%, transparent 75%, #f8f9fa 75%, #f8f9fa)',
              backgroundSize: '20px 20px',
              backgroundPosition: '0 0, 10px 10px',
            }),
            // Let CSS classes handle padding via CSS custom properties
            // Only use fallback padding if no global settings exist
            ...((!globalSettings?.spacing?.containerPadding) && {
              padding: `${gridConfig.currentBreakpoint.containerPadding}px`
            }),
          }}
          data-wysiwyg-padding={gridConfig.currentBreakpoint.containerPadding}
          data-wysiwyg-breakpoint={gridConfig.currentBreakpoint.name}
          data-wysiwyg-canvas-width={canvasSize.width}
          onDragOver={dragAndDrop.handleDragOver}
          onDrop={dragAndDrop.handleDrop}
          onMouseDown={selection.handleCanvasMouseDown}
          onMouseMove={(e) => {
            // Handle mouse movement for click-to-place preview
            if (draggedComponent && !isDragging) {
              const rect = e.currentTarget.getBoundingClientRect();
              const x = e.clientX - rect.left;
              const y = e.clientY - rect.top;

              const constrainedX = Math.max(0, Math.min(x - 12, canvasSize.width - 24));
              const constrainedY = Math.max(0, y - 12);

              const snappedPosition = snapToGrid(constrainedX, constrainedY, canvasSize.width);
              setPreviewPosition(snappedPosition);
            }

            // Handle rubber band selection
            selection.handleCanvasMouseMove(e);
          }}
          onMouseUp={selection.handleCanvasMouseUp}
          onClick={(e) => {
            // Handle click to place component
            if (draggedComponent && !isDragging) {
              const rect = e.currentTarget.getBoundingClientRect();
              const x = e.clientX - rect.left;
              const y = e.clientY - rect.top;

              const constrainedX = Math.max(0, Math.min(x - 12, canvasSize.width - 24));
              const constrainedY = Math.max(0, y - 12);

              // Place the component
              const snappedPosition = snapToGrid(constrainedX, constrainedY, canvasSize.width);
              const componentToPlace = {
                ...draggedComponent,
                position: snappedPosition,
                id: `${draggedComponent.type}-${Date.now()}`
              };

              addComponent(componentToPlace);
              endDrag();
            }
          }}
          onDragLeave={dragAndDrop.handleDragLeave}
        >
          {/* Responsive Grid overlay */}
          <ResponsiveGridOverlay
            gridConfig={gridConfig}
            canvasWidth={canvasSize.width}
            canvasHeight={canvasSize.height}
          />

          {/* PHASE 4.3: CSS Grid overlay for Grid components */}
          <CSSGridOverlay
            gridComponents={placedComponents.filter(c => c.type === 'Grid')}
            canvasWidth={canvasSize.width}
            canvasHeight={canvasSize.height}
          />

          {/* PHASE 4.3: CSS Grid cell highlight during drag */}
          {gridCellHighlight && gridCellHighlight.gridComponent && (
            <GridCellHighlight
              gridComponent={gridCellHighlight.gridComponent}
              column={gridCellHighlight.column}
              row={gridCellHighlight.row}
              colSpan={gridCellHighlight.colSpan}
              rowSpan={gridCellHighlight.rowSpan}
            />
          )}

          {/* PHASE 4.2: Responsive breakpoint indicator */}
          {activeBreakpoint !== 'desktop' && (
            <div className="absolute top-4 right-4 bg-purple-500 text-white px-3 py-2 rounded-lg shadow-lg z-10">
              <div className="flex items-center gap-2 text-sm font-medium">
                <span>{activeBreakpoint === 'mobile' ? '📱' : '📱'}</span>
                <span>Preview: {activeBreakpoint.charAt(0).toUpperCase() + activeBreakpoint.slice(1)}</span>
                <span className="text-purple-200">•</span>
                <span>{canvasSize.width}px</span>
              </div>
            </div>
          )}

          {/* Render all placed components */}
          {(() => {
            if (placedComponents.length === 0) {
              return <EmptyCanvasMessage />;
            }

            // Filter and render valid components
            const validComponents = placedComponents.filter(component => component && component.id && component.type);

            const renderedComponents = validComponents.map((component, index) => {
              return renderComponent(component);
            });

            return renderedComponents;
          })()}

          {/* Render preview component */}
          <DragPreview
            draggedComponent={draggedComponent}
            previewPosition={previewPosition}
          />

          {/* Render drop zone feedback */}
          <DropZoneFeedback
            previewPosition={previewPosition}
            dropZoneState={dragAndDrop.dropZoneState}
            draggedComponent={draggedComponent}
          />

          {/* Rubber band selection rectangle */}
          <RubberBandSelection
            isActive={selection.rubberBand.isActive}
            start={selection.rubberBand.start}
            end={selection.rubberBand.end}
          />

          {/* Smart alignment guides */}
          <AlignmentGuides
            guides={alignmentGuides.guides}
            snapPoints={alignmentGuides.snapPoints}
            isVisible={alignmentGuides.isVisible}
            canvasWidth={canvasSize.width}
            canvasHeight={canvasSize.height}
          />

          {/* Enhanced smart alignment */}
          {draggedComponent && previewPosition && (
            <SmartAlignment
              components={placedComponents}
              draggedComponent={draggedComponent}
              targetPosition={previewPosition}
              canvasWidth={canvasSize.width}
              showGuides={showAlignmentGuides}
            />
          )}

          {/* Live position indicator */}
          <PositionIndicator
            position={positionIndicator.position}
            isVisible={positionIndicator.isVisible}
            mode={positionIndicator.mode}
            mousePosition={positionIndicator.mousePosition}
          />

          {/* Snapping controls panel */}
          <SnappingControlsPanel
            snapConfig={snapConfig}
            setSnapConfig={setSnapConfig}
            selectedComponentIds={selectedComponentIds}
          />

          {/* Minimal floating status */}
          {placedComponents.length > 0 && (
            <div className="absolute bottom-4 left-4 bg-white bg-opacity-95 backdrop-blur-sm px-3 py-2 rounded-lg shadow-lg text-sm border">
              <div className="flex items-center gap-2 text-gray-700">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="font-medium">{placedComponents.length}</span>
                <span>component{placedComponents.length !== 1 ? 's' : ''}</span>
                {selectedComponentIds.size > 0 && (
                  <>
                    <span className="text-gray-400">•</span>
                    <span className="text-blue-600">{selectedComponentIds.size} selected</span>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </ResidentDataProvider>
  );
}