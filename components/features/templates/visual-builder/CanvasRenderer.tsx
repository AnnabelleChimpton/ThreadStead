/**
 * VISUAL_BUILDER_PROGRESS: Canvas Renderer - Simplified Pixel Homes Pattern
 * Phase 1: Visual Builder Foundation - Direct Component Rendering
 */

import React, { useRef, useCallback, useState, useEffect } from 'react';
import type { ComponentItem, UseCanvasStateResult } from '@/hooks/useCanvasState';
import { componentRegistry } from '@/lib/templates/core/template-registry';
import type { ResidentData } from '@/components/features/templates/ResidentDataProvider';
import { ResidentDataProvider } from '@/components/features/templates/ResidentDataProvider';
import {
  getCurrentBreakpoint,
  GRID_BREAKPOINTS,
  type GridBreakpoint
} from '@/lib/templates/visual-builder/grid-utils';
// Enhanced responsive grid overlay component
function ResponsiveGridOverlay({ gridConfig, canvasWidth, canvasHeight }: {
  gridConfig: import('@/hooks/useCanvasState').GridConfig;
  canvasWidth: number;
  canvasHeight: number;
}) {
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

interface CanvasRendererProps {
  canvasState: UseCanvasStateResult;
  residentData: ResidentData;
  className?: string;
  previewBreakpoint?: string | null; // For responsive preview controls
}

/**
 * Main canvas area where components are rendered and edited - simplified like pixel homes
 */
export default function CanvasRenderer({
  canvasState,
  residentData,
  className = '',
  previewBreakpoint = null,
}: CanvasRendererProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Responsive canvas sizing state with preview support
  const [canvasSize, setCanvasSize] = useState(() => {
    // Get initial size based on current breakpoint or preview
    const targetBreakpoint = previewBreakpoint
      ? GRID_BREAKPOINTS.find(bp => bp.name === previewBreakpoint) || getCurrentBreakpoint()
      : getCurrentBreakpoint();

    // Calculate responsive canvas size based on breakpoint - give much more space!
    const baseWidth = targetBreakpoint.minWidth || (typeof window !== 'undefined' ? window.innerWidth : 1024);
    const targetWidth = Math.min(baseWidth + 200, 1400); // Increased from 1200 to 1400

    // Give MUCH more vertical space - make it feel like a real webpage canvas
    const availableHeight = typeof window !== 'undefined' ? window.innerHeight - 120 : 1200;
    const targetHeight = Math.max(availableHeight * 1.5, 1200); // Much larger initial height

    return {
      width: targetWidth,
      height: targetHeight,
      breakpoint: targetBreakpoint,
      minHeight: 1200 // Much larger minimum height
    };
  });

  // Update canvas size on window resize or preview breakpoint change
  useEffect(() => {
    const updateCanvasSize = () => {
      // Use preview breakpoint if set, otherwise current breakpoint
      const targetBreakpoint = previewBreakpoint
        ? GRID_BREAKPOINTS.find(bp => bp.name === previewBreakpoint) || getCurrentBreakpoint()
        : getCurrentBreakpoint();

      // Calculate size based on target breakpoint - maximize space
      const baseWidth = previewBreakpoint
        ? targetBreakpoint.minWidth + 200 // Add more margin for preview
        : Math.min(window.innerWidth - 100, 1400); // Larger responsive width

      // Give much more vertical space for a real webpage feel
      const availableHeight = window.innerHeight - 120;
      const baseHeight = Math.max(availableHeight * 1.5, 1200); // Much larger minimum height

      const newSize = {
        width: Math.min(baseWidth, 1400), // Increased max width
        height: baseHeight,
        breakpoint: targetBreakpoint,
        minHeight: 1200 // Consistent larger minimum
      };

      setCanvasSize(prev => {
        if (prev.width !== newSize.width || prev.height !== newSize.height || prev.breakpoint.name !== newSize.breakpoint.name) {
          return newSize;
        }
        return prev;
      });
    };

    window.addEventListener('resize', updateCanvasSize);
    updateCanvasSize(); // Initial call

    return () => window.removeEventListener('resize', updateCanvasSize);
  }, [previewBreakpoint]); // Re-run when preview breakpoint changes

  const {
    placedComponents,
    selectedComponentIds,
    draggedComponent,
    isDragging,
    previewPosition,
    gridConfig,
    positioningMode,
    addComponent,
    selectComponent,
    updateComponentPosition,
    snapToGrid,
    startDrag,
    setPreviewPosition,
    endDrag,
    gridToPixel,
    pixelToGrid,
    updateComponentGridPosition,
  } = canvasState;

  // Auto-expand canvas height based on component positions
  useEffect(() => {
    if (placedComponents.length === 0) return;

    // Calculate the furthest bottom position of any component
    let maxBottomPosition = 0;
    let maxGridRow = 0;

    placedComponents.forEach(component => {
      if (component.positioningMode === 'grid' && component.gridPosition) {
        // For grid components, track the maximum row number
        maxGridRow = Math.max(maxGridRow, component.gridPosition.row);
      } else {
        // For absolute positioned components, use their pixel position
        const componentBottom = component.position.y + 100; // Add component height buffer
        maxBottomPosition = Math.max(maxBottomPosition, componentBottom);
      }
    });

    // Calculate grid content height if we have grid components using fixed row heights
    if (maxGridRow > 0) {
      const gridContentHeight = (maxGridRow * gridConfig.rowHeight) + ((maxGridRow + 1) * gridConfig.gap);
      maxBottomPosition = Math.max(maxBottomPosition, gridContentHeight);
    }

    // Add extra space at bottom for more components
    const contentHeight = maxBottomPosition + 300; // Increased buffer for new components

    // Use functional update to avoid circular dependency
    setCanvasSize(prev => {
      const requiredHeight = Math.max(prev.minHeight || 1200, contentHeight);

      if (requiredHeight > prev.height) {

        return {
          ...prev,
          height: requiredHeight
        };
      }
      return prev; // No change needed
    });
  }, [placedComponents, gridConfig.rowHeight, gridConfig.gap]); // Removed circular dependencies

  // HTML5 drag and drop handlers for canvas
  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault(); // Allow drop
  }, []);

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();

    // Try to get component data from HTML5 drag event first
    let componentToPlace = draggedComponent;

    try {
      const dragData = event.dataTransfer.getData('application/json');
      if (dragData) {
        componentToPlace = JSON.parse(dragData);
      }
    } catch (e) {
    }

    if (!componentToPlace) {
      console.warn('No component to place');
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Constrain to responsive canvas bounds (allow dropping near bottom for auto-expansion)
    const constrainedX = Math.max(0, Math.min(x - 12, canvasSize.width - 24));
    const constrainedY = Math.max(0, y - 12); // Remove top constraint to allow dropping anywhere vertically

    // Apply grid snapping if enabled
    const snappedPosition = snapToGrid(constrainedX, constrainedY);
    const finalX = snappedPosition.x;
    const finalY = snappedPosition.y;


    const newComponent: ComponentItem = {
      id: `${componentToPlace.type}_${Date.now()}`,
      type: componentToPlace.type,
      position: { x: finalX, y: finalY },
      positioningMode: positioningMode,
      props: componentToPlace.props || {},
    };

    addComponent(newComponent);
    endDrag();
  }, [draggedComponent, addComponent, endDrag, snapToGrid, positioningMode]);

  // Enhanced drag over for preview
  const handleDragOverWithPreview = useCallback((event: React.DragEvent) => {
    event.preventDefault(); // Allow drop

    // Check if we have any component being dragged (either in state or drag data)
    let hasComponent = !!draggedComponent;

    if (!hasComponent) {
      try {
        const dragData = event.dataTransfer.getData('application/json');
        hasComponent = !!dragData;
      } catch (e) {
        // Ignore error
      }
    }

    if (!hasComponent) {
      setPreviewPosition(null);
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const constrainedX = Math.max(0, Math.min(x - 12, canvasSize.width - 24));
    const constrainedY = Math.max(0, y - 12); // Allow preview anywhere vertically for auto-expansion

    // Apply grid snapping to preview position
    const snappedPosition = snapToGrid(constrainedX, constrainedY);
    setPreviewPosition({ x: snappedPosition.x, y: snappedPosition.y });
  }, [draggedComponent, setPreviewPosition, snapToGrid]);

  const handleDragLeave = useCallback(() => {
    setPreviewPosition(null);
  }, [setPreviewPosition]);

  // Component click handling like pixel homes
  const handleComponentClick = useCallback((componentId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    selectComponent(componentId, event.ctrlKey || event.metaKey);
  }, [selectComponent]);

  // Component drag handling
  const [draggedComponentId, setDraggedComponentId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const handleComponentMouseDown = useCallback((componentId: string, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    const component = placedComponents.find(c => c.id === componentId);
    if (!component) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (canvasRect) {
      setDragOffset({
        x: event.clientX - canvasRect.left - component.position.x,
        y: event.clientY - canvasRect.top - component.position.y,
      });
    }

    setDraggedComponentId(componentId);
    if (!selectedComponentIds.has(componentId)) {
      selectComponent(componentId);
    }
  }, [placedComponents, selectComponent, selectedComponentIds]);

  const handleComponentMouseMove = useCallback((event: MouseEvent) => {
    if (!draggedComponentId || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left - dragOffset.x;
    const y = event.clientY - rect.top - dragOffset.y;

    // Constrain to canvas bounds
    const adjustedX = Math.max(0, Math.min(x, canvasSize.width - 50));
    const adjustedY = Math.max(0, Math.min(y, canvasSize.height - 50));

    // Apply grid snapping if in grid mode
    const snappedPosition = snapToGrid(adjustedX, adjustedY);

    // Update component position
    updateComponentPosition(draggedComponentId, snappedPosition);

    // For grid components, also update their grid position coordinates
    if (positioningMode === 'grid' && gridConfig.enabled) {
      const component = placedComponents.find(c => c.id === draggedComponentId);
      if (component && component.positioningMode === 'grid') {
        const gridPos = pixelToGrid(snappedPosition.x, snappedPosition.y);
        const currentSpan = component.gridPosition?.span || 1;
        updateComponentGridPosition(draggedComponentId, {
          column: gridPos.column,
          row: gridPos.row,
          span: currentSpan
        });
      }
    }
  }, [draggedComponentId, dragOffset, updateComponentPosition, snapToGrid, positioningMode, gridConfig.enabled, placedComponents, pixelToGrid, updateComponentGridPosition]);

  const handleComponentMouseUp = useCallback(() => {
    if (draggedComponentId) {
      setDraggedComponentId(null);
      setDragOffset({ x: 0, y: 0 });
    }
  }, [draggedComponentId]);

  // Add global mouse event listeners for component dragging
  React.useEffect(() => {
    if (draggedComponentId) {
      document.addEventListener('mousemove', handleComponentMouseMove);
      document.addEventListener('mouseup', handleComponentMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleComponentMouseMove);
        document.removeEventListener('mouseup', handleComponentMouseUp);
      };
    }
  }, [draggedComponentId, handleComponentMouseMove, handleComponentMouseUp]);

  // Direct component rendering (no template transformation)
  const renderComponent = useCallback((component: ComponentItem) => {

    // Always render a test div to verify the component array is working
    const testDiv = (
      <div
        key={component.id}
        className="absolute bg-green-100 border-2 border-green-500 p-2 text-green-700 text-sm cursor-move"
        style={{
          left: component.position.x,
          top: component.position.y,
          width: 150,
          height: 80,
          zIndex: 2,
        }}
        onClick={(e) => handleComponentClick(component.id, e)}
        onMouseDown={(e) => handleComponentMouseDown(component.id, e)}
      >
        <div className="font-bold text-xs">{component.type}</div>
        <div className="text-xs">ID: {component.id.slice(-6)}</div>
        <div className="text-xs">Pos: {component.position.x},{component.position.y}</div>
        <div className="text-xs">✅ VISIBLE</div>
      </div>
    );

    const componentRegistration = componentRegistry.get(component.type);
    if (!componentRegistration) {
      console.warn('Component type not found in registry:', component.type);
      console.log('Available component types:', componentRegistry.getAllowedTags());

      return (
        <div
          key={component.id}
          className="absolute bg-red-100 border-2 border-red-500 p-2 text-red-700 text-sm cursor-move"
          style={{
            left: component.position.x,
            top: component.position.y,
            width: 150,
            height: 80,
            zIndex: 2,
          }}
          onClick={(e) => handleComponentClick(component.id, e)}
          onMouseDown={(e) => handleComponentMouseDown(component.id, e)}
        >
          <div className="font-bold text-xs">❌ Unknown: {component.type}</div>
          <div className="text-xs">Click to select</div>
        </div>
      );
    }


    const { component: Component } = componentRegistration;
    const isSelected = selectedComponentIds.has(component.id);

    try {
      // Calculate position based on grid or absolute mode
      let componentStyle: React.CSSProperties;

      if (component.positioningMode === 'grid' && component.gridPosition) {
        // For grid components, calculate absolute position from grid position using fixed dimensions
        const { column, row, span } = component.gridPosition;

        // Calculate position using grid utilities with fixed row heights
        const gridPosition = gridToPixel(column, row);

        // Calculate width based on span and fixed column widths
        const canvasWidth = gridConfig.responsiveMode ? canvasSize.width - (gridConfig.currentBreakpoint.containerPadding * 2) : canvasSize.width;
        const columnWidth = (canvasWidth - (gridConfig.columns + 1) * gridConfig.gap) / gridConfig.columns;
        const componentWidth = (span * columnWidth) + ((span - 1) * gridConfig.gap);

        componentStyle = {
          position: 'absolute',
          left: gridPosition.x,
          top: gridPosition.y,
          width: componentWidth,
          height: gridConfig.rowHeight,
          minWidth: componentWidth,
          minHeight: gridConfig.rowHeight,
        };
      } else {
        // Absolute positioning
        componentStyle = {
          position: 'absolute',
          left: component.position.x,
          top: component.position.y,
          minWidth: 50,
          minHeight: 30,
        };
      }

      return (
        <div
          key={component.id}
          className={`absolute cursor-move ${isSelected ? 'ring-2 ring-blue-500 ring-opacity-50' : ''} ${
            draggedComponentId === component.id ? 'z-10' : 'z-0'
          }`}
          style={componentStyle}
          onClick={(e) => handleComponentClick(component.id, e)}
          onMouseDown={(e) => handleComponentMouseDown(component.id, e)}
        >
          <Component {...(component.props || {})} />

          {/* Selection indicator */}
          {isSelected && (
            <div className="absolute inset-0 border-2 border-blue-500 border-dashed rounded pointer-events-none">
              <div className="absolute -top-1 -left-1 w-2 h-2 bg-blue-500 rounded-full" />
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full" />
              <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-blue-500 rounded-full" />
              <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-blue-500 rounded-full" />
            </div>
          )}

          {/* Drag indicator */}
          {draggedComponentId === component.id && (
            <div className="absolute inset-0 bg-blue-100 border-2 border-blue-300 border-dashed rounded pointer-events-none opacity-50" />
          )}
        </div>
      );
    } catch (error) {
      console.error('Error rendering component:', error);
      // Fall back to test div if component fails to render
      return testDiv;
    }
  }, [selectedComponentIds, handleComponentClick, draggedComponentId, handleComponentMouseDown]);

  // Preview component rendering
  const renderPreview = useCallback(() => {
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
  }, [previewPosition, draggedComponent]);

  // Add state tracking for debugging

  return (
    <ResidentDataProvider data={residentData}>
      <div
        className={`relative bg-white border border-gray-200 overflow-hidden ${className}`}
        key={`canvas-${placedComponents.length}`}
        style={{
          width: `${canvasSize.width}px`,
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
          }`}
          style={{
            width: canvasSize.width,
            height: canvasSize.height,
            background: 'linear-gradient(45deg, #f8f9fa 25%, transparent 25%, transparent 75%, #f8f9fa 75%, #f8f9fa), linear-gradient(45deg, #f8f9fa 25%, transparent 25%, transparent 75%, #f8f9fa 75%, #f8f9fa)',
            backgroundSize: '20px 20px',
            backgroundPosition: '0 0, 10px 10px',
            padding: `${gridConfig.currentBreakpoint.containerPadding}px`,
            boxSizing: 'border-box'
          }}
          onDragOver={handleDragOverWithPreview}
          onDrop={handleDrop}
          onDragLeave={handleDragLeave}
        >
          {/* Responsive Grid overlay */}
          <ResponsiveGridOverlay
            gridConfig={gridConfig}
            canvasWidth={canvasSize.width}
            canvasHeight={canvasSize.height}
          />

          {/* Canvas info display */}
          <div className={`absolute top-2 right-2 text-xs px-2 py-1 rounded z-10 ${
            previewBreakpoint ? 'bg-purple-100 border border-purple-300' : 'bg-blue-100'
          }`}>
            <div className="font-semibold">
              Canvas: {canvasSize.width}×{canvasSize.height}
              {previewBreakpoint && (
                <span className="ml-1 text-purple-600">📱 PREVIEW</span>
              )}
            </div>
            <div className="text-gray-600">
              {canvasSize.breakpoint.name} • {canvasSize.breakpoint.columns} cols • {canvasSize.breakpoint.gap}px gap
            </div>
            <div className="mt-1 text-blue-700">
              Components: {placedComponents.length}
            </div>
            {previewBreakpoint && (
              <div className="mt-1 text-purple-700 text-xs">
                Previewing {previewBreakpoint} breakpoint
              </div>
            )}
          </div>

          {/* Auto-expansion debug info */}
          <div className="absolute top-20 left-4 bg-purple-200 border-2 border-purple-500 p-2 text-xs z-10">
            <div>AUTO-EXPAND DEBUG</div>
            <div>Canvas: {canvasSize.width}×{canvasSize.height}</div>
            <div>Components: {placedComponents.length}</div>
            <div>Max Y: {Math.max(0, ...placedComponents.map(c => c.position.y))}</div>
            <div>Max Grid Row: {Math.max(0, ...placedComponents.filter(c => c.gridPosition).map(c => c.gridPosition!.row))}</div>
          </div>

          {/* Render all placed components with explicit logging */}
          {(() => {
            if (placedComponents.length === 0) {
              return (
                <div className="absolute inset-0 flex items-center justify-center text-gray-500 pointer-events-none">
                  <div className="text-center">
                    <div className="text-4xl mb-2">📦</div>
                    <p>Drag components here from the palette below</p>
                  </div>
                </div>
              );
            }

            const renderedComponents = placedComponents.map((component, index) => {
              return renderComponent(component);
            });

            return renderedComponents;
          })()}

          {/* Render preview component */}
          {renderPreview()}

          {/* Status indicator */}
          <div className="absolute top-4 left-4 bg-white bg-opacity-90 px-3 py-2 rounded shadow-sm text-sm">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${placedComponents.length > 0 ? 'bg-green-500' : 'bg-gray-300'}`} />
              {placedComponents.length} component{placedComponents.length !== 1 ? 's' : ''} placed
            </div>
            {selectedComponentIds.size > 0 && (
              <div className="text-blue-600 text-xs mt-1">
                {selectedComponentIds.size} selected
              </div>
            )}
          </div>
        </div>
      </div>
    </ResidentDataProvider>
  );
}