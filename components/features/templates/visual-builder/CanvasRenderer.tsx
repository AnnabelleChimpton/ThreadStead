/**
 * VISUAL_BUILDER_PROGRESS: Canvas Renderer - Simplified Pixel Homes Pattern
 * Phase 1: Visual Builder Foundation - Direct Component Rendering
 */

import React, { useRef, useCallback, useState, useEffect, useMemo } from 'react';
import type { ComponentItem, UseCanvasStateResult } from '@/hooks/useCanvasState';
import { componentRegistry } from '@/lib/templates/core/template-registry';
import type { ResidentData } from '@/components/features/templates/ResidentDataProvider';
import { ResidentDataProvider } from '@/components/features/templates/ResidentDataProvider';
import {
  getCurrentBreakpoint,
  GRID_BREAKPOINTS,
  calculateSpanWidth,
  getComponentSizingCategory,
  shouldUseFlexibleWidth,
  type GridBreakpoint
} from '@/lib/templates/visual-builder/grid-utils';
import { type ResizeDirection } from './ResizeHandle';
import ResizableComponent from './ResizableComponent';
import type { MeasuredDimensions } from './ResizableComponent';
import { containerToVisual } from './ResizableComponent';
import {
  getComponentResizeCapability,
  getComponentResizeConstraints,
  getComponentCurrentSize,
  sizeToProps,
  getGridResizeInfo,
  pixelToSpanChange,
  validateResize
} from '@/lib/templates/visual-builder/resize-utils';
import { SmartSnapping, type SnapResult } from '@/lib/templates/visual-builder/snapping-utils';
import AlignmentGuides, { useAlignmentGuides } from './AlignmentGuides';
import PositionIndicator, { usePositionIndicator } from './PositionIndicator';
import type { GlobalSettings } from './GlobalSettingsPanel';
import { generatePatternCSS, generateGradientCSS } from '@/lib/templates/visual-builder/background-patterns';

/**
 * Generate CSS custom properties from global settings
 */
function generateGlobalCSSProperties(globalSettings: GlobalSettings | null): React.CSSProperties {
  if (!globalSettings) return {};

  // Build background based on type
  let backgroundStyle: any = {};

  if (globalSettings.background?.type === 'pattern' && globalSettings.background?.pattern) {
    const patternCSS = generatePatternCSS(globalSettings.background.pattern);
    if (patternCSS) {
      backgroundStyle = {
        backgroundColor: globalSettings.background.color,
        backgroundImage: patternCSS,
        backgroundRepeat: 'repeat',
        backgroundSize: `${(globalSettings.background.pattern.size || 1) * 40}px ${(globalSettings.background.pattern.size || 1) * 40}px`
      };
    }
  } else if (globalSettings.background?.type === 'gradient' && globalSettings.background?.gradient) {
    backgroundStyle = {
      background: generateGradientCSS(globalSettings.background.gradient)
    };
  } else {
    backgroundStyle = {
      backgroundColor: globalSettings.background?.color
    };
  }

  return {
    // CSS Variables
    '--global-bg-color': globalSettings.background?.color,
    '--global-bg-type': globalSettings.background?.type,
    '--global-font-family': globalSettings.typography?.fontFamily,
    '--global-base-font-size': globalSettings.typography?.baseSize,
    '--global-typography-scale': globalSettings.typography?.scale?.toString() || '1.25',
    '--global-container-padding': globalSettings.spacing?.containerPadding,
    '--global-section-spacing': globalSettings.spacing?.sectionSpacing,
    '--global-theme': globalSettings.theme,

    // Direct styles
    ...backgroundStyle,
    fontFamily: globalSettings.typography?.fontFamily,
    fontSize: globalSettings.typography?.baseSize,
    padding: globalSettings.spacing?.containerPadding,

    // Effects
    borderRadius: globalSettings.effects?.borderRadius,
    boxShadow: globalSettings.effects?.boxShadow,
  } as React.CSSProperties;
}

/**
 * Helper function to check if a component is a container that can accept children
 */
function isContainerComponent(componentType: string): boolean {
  const registration = componentRegistry.get(componentType);
  return registration?.relationship?.type === 'container' &&
         registration?.relationship?.acceptsChildren === true;
}

/**
 * Helper function to check if a component is a text component
 */
function isTextComponent(componentType: string): boolean {
  const registration = componentRegistry.get(componentType);
  return registration?.relationship?.type === 'text';
}

/**
 * Helper function to find the parent component containing a specific child
 */
function findParentOfChild(childId: string, placedComponents: ComponentItem[]): ComponentItem | null {
  for (const component of placedComponents) {
    if (component.children) {
      const childFound = component.children.find(child => child.id === childId);
      if (childFound) {
        return component;
      }
    }
  }
  return null;
}

/**
 * Helper function to find container component at position for drop targeting
 */
function findContainerAtPosition(
  x: number,
  y: number,
  placedComponents: ComponentItem[],
  excludeComponent?: string, // Exclude a specific component ID (for when dragging existing components)
  canvasWidth?: number // Optional canvas width for grid calculations
): ComponentItem | null {
  // Sort by z-index/position to find the topmost container
  const containers = placedComponents.filter(comp =>
    isContainerComponent(comp.type) &&
    (!excludeComponent || comp.id !== excludeComponent)
  );

  for (const container of containers) {
    const containerX = container.position?.x || 0;
    const containerY = container.position?.y || 0;

    let containerWidth = 200; // Default fallback
    let containerHeight = 150; // Default fallback

    try {
      // Calculate actual container size based on positioning mode
      const currentBreakpoint = getCurrentBreakpoint(canvasWidth || (typeof window !== 'undefined' ? window.innerWidth : 1024));
      const currentSize = getComponentCurrentSize(container, currentBreakpoint);

      containerWidth = currentSize.width;
      containerHeight = currentSize.height;
    } catch (error) {
      // Fall back to defaults if size calculation fails
      console.warn('Failed to calculate container size, using defaults:', error);
    }

    if (x >= containerX && x <= containerX + containerWidth &&
        y >= containerY && y <= containerY + containerHeight) {
      return container;
    }
  }

  return null;
}

/**
 * Helper function to find a suitable parent component at the given position
 */
function findSuitableParentAtPosition(
  x: number,
  y: number,
  requiredParentType: string | string[],
  placedComponents: ComponentItem[]
): ComponentItem | null {
  const acceptableParentTypes = Array.isArray(requiredParentType)
    ? requiredParentType
    : [requiredParentType];

  // Look for parent components that:
  // 1. Are of the correct type
  // 2. Are positioned near the drop location (within 100px)
  // 3. Can accept more children

  for (const component of placedComponents) {
    if (!acceptableParentTypes.includes(component.type)) continue;

    const componentRegistration = componentRegistry.get(component.type);
    if (!componentRegistration?.relationship) continue;

    const relationship = componentRegistration.relationship;

    // Check if this parent can accept more children
    const currentChildCount = component.children?.length || 0;
    if (relationship.maxChildren && currentChildCount >= relationship.maxChildren) {
      continue;
    }

    // Check if the drop position is near this component (within 100px)
    const distance = Math.sqrt(
      Math.pow(x - (component.position?.x || 0), 2) +
      Math.pow(y - (component.position?.y || 0), 2)
    );

    if (distance <= 100) {
      return component;
    }
  }

  return null;
}

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

  // Extract global settings from canvas state
  const { globalSettings } = canvasState;

  // Full-screen responsive canvas sizing
  const [canvasSize, setCanvasSize] = useState(() => {
    // Get initial size based on current breakpoint or preview
    const targetBreakpoint = previewBreakpoint
      ? GRID_BREAKPOINTS.find(bp => bp.name === previewBreakpoint) || getCurrentBreakpoint()
      : getCurrentBreakpoint();

    // Full-screen approach - maximize available space
    const baseWidth = targetBreakpoint.minWidth || (typeof window !== 'undefined' ? window.innerWidth : 1024);
    const targetWidth = Math.min(baseWidth + 300, 1600); // Even wider for better experience

    // Start with a generous height that feels like a real webpage
    const availableHeight = typeof window !== 'undefined' ? window.innerHeight - 200 : 1400;
    const targetHeight = Math.max(availableHeight, 1400); // Larger minimum for professional feel

    return {
      width: targetWidth,
      height: targetHeight,
      breakpoint: targetBreakpoint,
      minHeight: 1400 // Professional minimum height
    };
  });

  // Update canvas size on window resize or preview breakpoint change
  useEffect(() => {
    const updateCanvasSize = () => {
      // Use preview breakpoint if set, otherwise current breakpoint
      const targetBreakpoint = previewBreakpoint
        ? GRID_BREAKPOINTS.find(bp => bp.name === previewBreakpoint) || getCurrentBreakpoint()
        : getCurrentBreakpoint();

      // Full-screen responsive sizing - maximize the experience
      const baseWidth = previewBreakpoint
        ? targetBreakpoint.minWidth + 300 // More generous preview margin
        : Math.min(window.innerWidth - 200, 1600); // Account for floating panels

      // Use more of the available height for immersive experience
      const availableHeight = window.innerHeight - 200; // Account for toolbar
      const baseHeight = Math.max(availableHeight, 1400); // Professional minimum

      const newSize = {
        width: Math.min(baseWidth, 1600), // Increased max width for modern screens
        height: baseHeight,
        breakpoint: targetBreakpoint,
        minHeight: 1400 // Consistent professional minimum
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
    addComponent,
    addChildComponent,
    removeChildComponent,
    updateChildComponent,
    removeComponent,
    moveChildToCanvas,
    selectComponent,
    updateComponent,
    updateComponentPosition,
    updateComponentSize,
    snapToGrid,
    startDrag,
    setPreviewPosition,
    endDrag,
  } = canvasState;

  // Auto-expand canvas height based on component positions
  useEffect(() => {
    if (placedComponents.length === 0) return;

    // Calculate the furthest bottom position of any component
    let maxBottomPosition = 0;

    placedComponents
      .filter(component => component && component.id && component.type)
      .forEach(component => {
        // All components now use pixel positioning - simplified unified approach
        const componentBottom = (component.position?.y || 0) + 100; // Add component height buffer
        maxBottomPosition = Math.max(maxBottomPosition, componentBottom);
      });

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
    const snappedPosition = snapToGrid(constrainedX, constrainedY, canvasSize.width);
    const finalX = snappedPosition.x;
    const finalY = snappedPosition.y;

    // Get component registration for relationship validation
    const componentRegistration = componentRegistry.get(componentToPlace.type);
    const relationship = componentRegistration?.relationship;

    // Check if dropping onto a container component first (any component can go into a container)
    const targetContainer = findContainerAtPosition(finalX, finalY, placedComponents, undefined, canvasSize.width);

    if (targetContainer) {
      // Add component as child to the container
      const newChild: ComponentItem = {
        id: `${componentToPlace.type}_${Date.now()}`,
        type: componentToPlace.type,
        position: { x: 0, y: 0 }, // Children use relative positioning within container
        positioningMode: 'absolute',
        props: componentToPlace.props || {},
      };

      addChildComponent(targetContainer.id, newChild);
    } else if (relationship?.type === 'child' && relationship?.requiresParent) {
      // Try to find a suitable parent component at this position (for components that specifically require parents)
      const parentFound = findSuitableParentAtPosition(finalX, finalY, relationship.requiresParent, placedComponents);

      if (parentFound) {
        // Add as child to existing parent
        const newChild: ComponentItem = {
          id: `${componentToPlace.type}_${Date.now()}`,
          type: componentToPlace.type,
          position: { x: 0, y: 0 }, // Children use relative positioning
          positioningMode: 'absolute',
          props: componentToPlace.props || {},
        };

        addChildComponent(parentFound.id, newChild);
      } else {
        // Auto-create parent component for orphaned child
        const parentType = Array.isArray(relationship.requiresParent)
          ? relationship.requiresParent[0]
          : relationship.requiresParent;

        const parentRegistration = componentRegistry.get(parentType);
        if (parentRegistration) {
          const newParent: ComponentItem = {
            id: `${parentType}_${Date.now()}`,
            type: parentType,
            position: { x: finalX, y: finalY },
            positioningMode: 'absolute',
            props: {},
            children: [{
              id: `${componentToPlace.type}_${Date.now()}`,
              type: componentToPlace.type,
              position: { x: 0, y: 0 },
              positioningMode: 'absolute',
              props: componentToPlace.props || {},
            }]
          };

          addComponent(newParent);
        }
      }
    } else {
      // Normal component drop on canvas - unified absolute positioning
      const newComponent: ComponentItem = {
        id: `${componentToPlace.type}_${Date.now()}`,
        type: componentToPlace.type,
        position: { x: finalX, y: finalY },
        positioningMode: 'absolute',
        props: componentToPlace.props || {},
      };

      addComponent(newComponent);
    }

    endDrag();
  }, [draggedComponent, addComponent, addChildComponent, endDrag, snapToGrid, placedComponents]);

  // State for drop zone feedback
  const [dropZoneState, setDropZoneState] = useState<{
    isValidDrop: boolean;
    parentComponent: ComponentItem | null;
    targetContainer: ComponentItem | null;
    dropAction: 'normal' | 'add-to-parent' | 'create-parent' | 'add-to-container' | 'invalid';
  }>({
    isValidDrop: true,
    parentComponent: null,
    targetContainer: null,
    dropAction: 'normal',
  });

  // Enhanced drag over for preview and drop zone feedback
  const handleDragOverWithPreview = useCallback((event: React.DragEvent) => {
    event.preventDefault(); // Allow drop

    // Check if we have any component being dragged (either in state or drag data)
    let hasComponent = !!draggedComponent;
    let componentToPlace = draggedComponent;

    if (!hasComponent) {
      try {
        const dragData = event.dataTransfer.getData('application/json');
        if (dragData) {
          componentToPlace = JSON.parse(dragData);
          hasComponent = true;
        }
      } catch (e) {
        // Ignore error
      }
    }

    if (!hasComponent || !componentToPlace) {
      setPreviewPosition(null);
      setDropZoneState({
        isValidDrop: false,
        parentComponent: null,
        targetContainer: null,
        dropAction: 'invalid',
      });
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const constrainedX = Math.max(0, Math.min(x - 12, canvasSize.width - 24));
    const constrainedY = Math.max(0, y - 12); // Allow preview anywhere vertically for auto-expansion

    // Apply grid snapping to preview position
    const snappedPosition = snapToGrid(constrainedX, constrainedY, canvasSize.width);
    setPreviewPosition({ x: snappedPosition.x, y: snappedPosition.y });

    // Determine drop zone feedback based on component relationships
    const componentRegistration = componentRegistry.get(componentToPlace.type);
    const relationship = componentRegistration?.relationship;

    // Always check for container drops first (any component can go into a container)
    const targetContainer = findContainerAtPosition(snappedPosition.x, snappedPosition.y, placedComponents, undefined, canvasSize.width);

    if (targetContainer) {
      setDropZoneState({
        isValidDrop: true,
        parentComponent: null,
        targetContainer: targetContainer,
        dropAction: 'add-to-container',
      });
    } else if (relationship?.type === 'child' && relationship?.requiresParent) {
      // Check for suitable parent at this position (for components that specifically require parents)
      const parentFound = findSuitableParentAtPosition(
        snappedPosition.x,
        snappedPosition.y,
        relationship.requiresParent,
        placedComponents
      );

      if (parentFound) {
        setDropZoneState({
          isValidDrop: true,
          parentComponent: parentFound,
          targetContainer: null,
          dropAction: 'add-to-parent',
        });
      } else {
        // Will auto-create parent
        setDropZoneState({
          isValidDrop: true,
          parentComponent: null,
          targetContainer: null,
          dropAction: 'create-parent',
        });
      }
    } else {
      // Normal component drop
      setDropZoneState({
        isValidDrop: true,
        parentComponent: null,
        targetContainer: null,
        dropAction: 'normal',
      });
    }
  }, [draggedComponent, setPreviewPosition, snapToGrid, placedComponents]);

  const handleDragLeave = useCallback(() => {
    setPreviewPosition(null);
    setDropZoneState({
      isValidDrop: false,
      parentComponent: null,
      targetContainer: null,
      dropAction: 'invalid',
    });
  }, [setPreviewPosition]);

  // Component click handling like pixel homes
  const handleComponentClick = useCallback((componentId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    selectComponent(componentId, event.ctrlKey || event.metaKey);
  }, [selectComponent]);

  // Component drag handling
  const [draggedComponentId, setDraggedComponentId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Component resize handling
  const [resizingComponentId, setResizingComponentId] = useState<string | null>(null);
  const [resizePreview, setResizePreview] = useState<{
    width: number;
    height: number;
    x: number;
    y: number;
  } | null>(null);

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

  // Measured dimensions for accurate selection indicators
  const [componentDimensions, setComponentDimensions] = useState<Map<string, MeasuredDimensions>>(new Map());

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

  const handleComponentMouseDown = useCallback((componentId: string, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    const component = placedComponents.find(c => c.id === componentId);
    if (!component) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (canvasRect) {
      setDragOffset({
        x: event.clientX - canvasRect.left - (component.position?.x || 0),
        y: event.clientY - canvasRect.top - (component.position?.y || 0),
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

    const draggedComponent = placedComponents.find(c => c.id === draggedComponentId);
    if (!draggedComponent) return;

    // Check if we're dragging multiple components
    const selectedIds = Array.from(selectedComponentIds);
    const isMultiDrag = selectedIds.length > 1 && selectedIds.includes(draggedComponentId);

    let finalPosition: { x: number; y: number };
    let multiComponentResult: any = null;

    // Apply smart snapping if enabled
    if (smartSnapping) {
      // Update snapping config based on current settings
      smartSnapping.updateConfig({
        componentSnapping: snapConfig.componentSnapping,
        gridSnapping: false, // Always disabled - using smart snapping only
        gridSize: gridConfig.gap || 20,
        showGuides: snapConfig.showGuides,
        magneticZoneEnabled: true,
        magneticZoneRadius: 24,
        magneticStrength: 0.6,
        spacingDetection: true,
        commonSpacings: [8, 12, 16, 20, 24, 32, 48],
        spacingTolerance: 4
      });

      if (isMultiDrag) {
        // Multi-component dragging with unified smart snapping
        const movingComponents = selectedIds
          .map(id => placedComponents.find(c => c.id === id))
          .filter((c): c is NonNullable<typeof c> => c !== undefined)
          .map(c => {
            // All components use pixel coordinates - no positioning mode distinction
            const x = c.id === draggedComponentId ? adjustedX : c.position?.x || 0;
            const y = c.id === draggedComponentId ? adjustedY : c.position?.y || 0;
            const width = parseInt(c.props?._size?.width || '200', 10) || 200;
            const height = parseInt(c.props?._size?.height || '150', 10) || 150;

            return { id: c.id, x, y, width, height };
          });

        // Get other components for snapping (exclude all selected components) - unified approach
        const otherComponents = placedComponents
          .filter(c => !selectedIds.includes(c.id))
          .map(c => ({
            id: c.id,
            x: c.position?.x || 0,
            y: c.position?.y || 0,
            width: parseInt(c.props?._size?.width || '200', 10) || 200,
            height: parseInt(c.props?._size?.height || '150', 10) || 150
          }));

        multiComponentResult = smartSnapping.calculateMultiComponentSnap(
          movingComponents,
          otherComponents,
          canvasSize.width,
          canvasSize.height,
          gridConfig.currentBreakpoint
        );

        // Find the primary dragged component in the result
        const primaryResult = multiComponentResult.components.find((c: any) => c.id === draggedComponentId);
        finalPosition = primaryResult ? { x: primaryResult.x, y: primaryResult.y } : { x: adjustedX, y: adjustedY };

      } else {
        // Single component dragging with unified smart snapping
        // Get other components for snapping (exclude the one being dragged) - unified approach
        const otherComponents = placedComponents
          .filter(c => c.id !== draggedComponentId)
          .map(c => ({
            id: c.id,
            x: c.position?.x || 0,
            y: c.position?.y || 0,
            width: parseInt(c.props?._size?.width || '200', 10) || 200,
            height: parseInt(c.props?._size?.height || '150', 10) || 150
          }));

        // Calculate component dimensions for snapping
        const componentWidth = parseInt(draggedComponent.props?._size?.width || '200', 10) || 200;
        const componentHeight = parseInt(draggedComponent.props?._size?.height || '150', 10) || 150;

        const snapResult = smartSnapping.calculateSnap(
          { x: adjustedX, y: adjustedY, width: componentWidth, height: componentHeight },
          otherComponents,
          canvasSize.width,
          canvasSize.height,
          gridConfig.currentBreakpoint
        );

        finalPosition = { x: snapResult.x, y: snapResult.y };
        setSnapResult(snapResult);

        // Show alignment guides
        if (snapResult.alignmentGuides.length > 0 || snapResult.snapPoints.length > 0) {
          alignmentGuides.showGuides(snapResult.alignmentGuides, snapResult.snapPoints);
        } else {
          alignmentGuides.hideGuides();
        }

        // Show position indicator with enhanced feedback
        const mousePosition = { x: event.clientX - rect.left, y: event.clientY - rect.top };
        const magneticInfo = snapResult.magneticPull && (snapResult.magneticPull.x !== 0 || snapResult.magneticPull.y !== 0)
          ? `Magnetic pull: ${Math.round(Math.abs(snapResult.magneticPull.x) + Math.abs(snapResult.magneticPull.y))}px`
          : undefined;

        positionIndicator.showPosition(
          {
            x: finalPosition.x,
            y: finalPosition.y,
            width: componentWidth,
            height: componentHeight,
            isSnapped: snapResult.snappedX || snapResult.snappedY,
            snapInfo: snapResult.snappedX || snapResult.snappedY ? 'Snapped to component' : magneticInfo
          },
          'drag',
          mousePosition
        );
      }

      // Handle multi-component visual feedback
      if (isMultiDrag && multiComponentResult) {
        const allGuides = multiComponentResult.alignmentGuides || [];
        const allSnapPoints = multiComponentResult.snapPoints || [];

        if (allGuides.length > 0 || allSnapPoints.length > 0) {
          alignmentGuides.showGuides(allGuides, allSnapPoints);
        } else {
          alignmentGuides.hideGuides();
        }
      }
    } else {
      // Fallback to grid snapping if smart snapping is disabled
      finalPosition = snapToGrid(adjustedX, adjustedY, canvasSize.width);
      setSnapResult(null);
      alignmentGuides.hideGuides();

      // Still show position indicator for grid mode
      if (draggedComponent) {
        const componentWidth = parseInt(draggedComponent.props?._size?.width || '200', 10) || 200;
        const componentHeight = parseInt(draggedComponent.props?._size?.height || '150', 10) || 150;
        const mousePosition = { x: event.clientX - rect.left, y: event.clientY - rect.top };

        positionIndicator.showPosition(
          {
            x: finalPosition.x,
            y: finalPosition.y,
            width: componentWidth,
            height: componentHeight,
            isSnapped: true,
            snapInfo: 'Grid aligned'
          },
          'drag',
          mousePosition
        );
      } else {
        positionIndicator.hidePosition();
      }
    }

    // Update component position - ALL components now use smart snapping pixel coordinates
    if (isMultiDrag && multiComponentResult) {
      // Update all selected components during multi-drag with exact smart snapping coordinates
      multiComponentResult.components.forEach((compResult: any) => {
        updateComponentPosition(compResult.id, { x: compResult.x, y: compResult.y });
      });
    } else {
      // Single component update with exact smart snapping coordinates
      updateComponentPosition(draggedComponentId, finalPosition);
    }

    // Check for container drops and update drop zone state
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    const targetContainer = findContainerAtPosition(mouseX, mouseY, placedComponents, draggedComponentId, canvasSize.width);

    if (targetContainer) {
      setDropZoneState({
        isValidDrop: true,
        parentComponent: null,
        targetContainer: targetContainer,
        dropAction: 'add-to-container',
      });
      setPreviewPosition({ x: mouseX, y: mouseY });
    } else {
      setDropZoneState({
        isValidDrop: true,
        parentComponent: null,
        targetContainer: null,
        dropAction: 'normal',
      });
      setPreviewPosition(null);
    }

  }, [draggedComponentId, dragOffset, updateComponentPosition, placedComponents, setDropZoneState, setPreviewPosition, smartSnapping, alignmentGuides, positionIndicator, canvasSize.width, canvasSize.height]);

  const handleComponentMouseUp = useCallback((event: MouseEvent) => {
    if (draggedComponentId && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const dropX = event.clientX - rect.left;
      const dropY = event.clientY - rect.top;

      // Check if the component was dropped onto a container
      const targetContainer = findContainerAtPosition(dropX, dropY, placedComponents, draggedComponentId, canvasSize.width);

      if (targetContainer) {
        // Find the dragged component
        const draggedComponent = placedComponents.find(comp => comp.id === draggedComponentId);

        if (draggedComponent) {
          // Move the component into the container
          const newChild: ComponentItem = {
            ...draggedComponent,
            position: { x: 0, y: 0 }, // Reset position for container child
            positioningMode: 'absolute',
          };

          // Add to container and remove from canvas
          addChildComponent(targetContainer.id, newChild);

          // Remove from canvas state using the existing removeComponent function
          removeComponent(draggedComponentId);
        }
      }

      // Clear snapping and alignment state
      setSnapResult(null);
      alignmentGuides.hideGuides();
      positionIndicator.hidePosition();

      setDraggedComponentId(null);
      setDragOffset({ x: 0, y: 0 });

      // Clear drop zone state
      setDropZoneState({
        isValidDrop: false,
        parentComponent: null,
        targetContainer: null,
        dropAction: 'invalid',
      });
      setPreviewPosition(null);
    }
  }, [draggedComponentId, placedComponents, addChildComponent, removeComponent, setDropZoneState, setPreviewPosition, alignmentGuides, positionIndicator]);

  // Component resize handling
  const handleResizeStart = useCallback((componentId: string, direction: ResizeDirection) => {
    setResizingComponentId(componentId);

    const component = placedComponents.find(comp => comp.id === componentId);
    if (!component) return;

    // All components now use absolute positioning - no conversion needed

    // Use measured dimensions for initial preview
    const measuredDims = componentDimensions.get(componentId);
    let initialPreviewSize;

    if (measuredDims) {
      initialPreviewSize = {
        width: measuredDims.width,
        height: measuredDims.height
      };
    } else {
      const currentBreakpoint = getCurrentBreakpoint(canvasSize.width);
      const currentSize = getComponentCurrentSize(component, currentBreakpoint);
      initialPreviewSize = {
        width: currentSize.width,
        height: currentSize.height
      };
    }

    setResizePreview({
      width: initialPreviewSize.width,
      height: initialPreviewSize.height,
      x: component.position.x,
      y: component.position.y
    });
  }, [placedComponents, canvasSize.width, componentDimensions, updateComponent]);

  const handleResize = useCallback((componentId: string, newSize: { width: number; height: number }, newPosition: { x: number; y: number }) => {

    // Update the component size in real-time during resize for immediate visual feedback
    const component = placedComponents.find(comp => comp.id === componentId);
    if (component) {
      const sizeProps = sizeToProps({
        width: newSize.width,
        height: newSize.height,
        unit: 'px'
      });

      updateComponent(componentId, {
        props: { ...component.props, ...sizeProps }
      });
    }

    // Show position indicator during resize
    positionIndicator.showPosition(
      {
        x: newPosition.x,
        y: newPosition.y,
        width: newSize.width,
        height: newSize.height
      },
      'resize'
    );

    // Set resize preview
    setResizePreview({
      width: newSize.width,
      height: newSize.height,
      x: newPosition.x,
      y: newPosition.y
    });
  }, [placedComponents, updateComponent, positionIndicator]);

  const handleResizeEnd = useCallback((componentId: string, finalSize: { width: number; height: number }, finalPosition: { x: number; y: number }) => {
    const component = placedComponents.find(comp => comp.id === componentId);
    if (!component) return;


    const currentBreakpoint = getCurrentBreakpoint(canvasSize.width);

    // finalSize is now the VISUAL size (what the user sees)
    // Validate the resize operation with visual dimensions
    const validation = validateResize(component, {
      width: finalSize.width,
      height: finalSize.height,
      unit: 'px'
    });

    if (!validation.valid) {
      console.warn('Resize validation failed:', validation.reason);
      setResizingComponentId(null);
      setResizePreview(null);
      positionIndicator.hidePosition();
      return;
    }

    // SIMPLIFIED: All resized components are now absolute positioned
    // (conversion happens in handleResizeStart)
    const sizeProps = sizeToProps({
      width: finalSize.width,
      height: finalSize.height,
      unit: 'px'
    });


    // Update both size and position
    updateComponent(componentId, {
      props: { ...component.props, ...sizeProps },
      position: finalPosition
    });

    // Hide position indicator
    positionIndicator.hidePosition();

    setResizingComponentId(null);
    setResizePreview(null);

    // The ResizableComponent will automatically re-measure through its ResizeObserver
    // when the actual component size changes, so no manual trigger needed here
  }, [placedComponents, canvasSize.width, updateComponent, positionIndicator]);

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

  // Keyboard shortcuts for resize operations and snapping controls
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

      const currentBreakpoint = getCurrentBreakpoint(canvasSize.width);
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
  }, [selectedComponentIds, draggedComponentId, resizingComponentId, placedComponents, canvasSize.width, updateComponentSize, setSnapConfig]);

  // Render nested component within containers (without absolute positioning)
  const renderNestedComponent = useCallback((child: ComponentItem) => {
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
          {...(child.props || {})}
          _isInVisualBuilder={true}
          _onContentChange={(content: string) => {
            // Update the child component's content property
            updateChildComponent(findParentOfChild(child.id, placedComponents)?.id || '', child.id, {
              props: {
                ...child.props,
                content: content
              }
            });
          }}
        />

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
  }, [selectedComponentIds, handleComponentClick, placedComponents, removeChildComponent, moveChildToCanvas]);

  // Direct component rendering (no template transformation)
  const renderComponent = useCallback((component: ComponentItem) => {

    // Safety check for invalid components
    if (!component || !component.id || !component.type) {
      console.error('Invalid component:', component);
      return null;
    }

    // Always render a test div to verify the component array is working
    const testDiv = (
      <div
        key={component.id}
        className="absolute bg-green-100 border-2 border-green-500 p-2 text-green-700 text-sm cursor-move"
        style={{
          left: component.position?.x || 0,
          top: component.position?.y || 0,
          width: 150,
          height: 80,
          zIndex: 2,
        }}
        onClick={(e) => handleComponentClick(component.id, e)}
        onMouseDown={(e) => handleComponentMouseDown(component.id, e)}
      >
        <div className="font-bold text-xs">{component.type || 'Unknown'}</div>
        <div className="text-xs">ID: {component.id?.slice(-6) || 'none'}</div>
        <div className="text-xs">Pos: {component.position?.x || 0},{component.position?.y || 0}</div>
        <div className="text-xs">✅ VISIBLE</div>
      </div>
    );

    const componentRegistration = componentRegistry.get(component.type);
    if (!componentRegistration) {
      console.warn('Component type not found in registry:', component.type);

      return (
        <div
          key={component.id}
          className="absolute bg-red-100 border-2 border-red-500 p-2 text-red-700 text-sm cursor-move"
          style={{
            left: component.position?.x || 0,
            top: component.position?.y || 0,
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

      // All components now use unified absolute positioning with component-specific sizing logic for WYSIWYG consistency
      const componentSize = component.props?._size;
      const componentCategory = getComponentSizingCategory(component.type);

      // Apply different sizing strategies based on component type
      if (componentCategory === 'content-driven') {
          // Content-driven components (like Paragraph) should have flexible width to match Profile page
          const userWidth = componentSize?.width ? parseInt(componentSize.width.replace(/px$/, ''), 10) : 200;
          const userHeight = componentSize?.height ? parseInt(componentSize.height.replace(/px$/, ''), 10) : 150;

          componentStyle = {
            position: 'absolute',
            left: component.position?.x || 0,
            top: component.position?.y || 0,
            // Use flexible width sizing to match AdvancedProfileRenderer behavior
            minWidth: `${userWidth}px`,
            minHeight: `${userHeight}px`,
            maxWidth: `${Math.min(Math.max(userWidth * 1.5, 400), 600)}px`, // Cap at 600px for consistent text wrapping
            width: 'fit-content',
            height: 'fit-content',
          };
        } else {
          // Other components use fixed sizing
          componentStyle = {
            position: 'absolute',
            left: component.position?.x || 0,
            top: component.position?.y || 0,
            // Apply size if specified in props (now properly formatted with units)
            // componentSize.width/height are now strings like '100px', not numbers
            width: componentSize?.width !== 'auto' ? componentSize?.width : '200px',
            height: componentSize?.height !== 'auto' ? componentSize?.height : '150px',
            minWidth: 50,
            minHeight: 30,
          };
      }

      return (
        <div
          key={component.id}
          className={`absolute cursor-move ${isTextComponent(component.type) ? 'hover:ring-2 hover:ring-green-300 hover:ring-opacity-50 transition-all' : ''}`}
          style={{
            ...componentStyle,
            zIndex: draggedComponentId === component.id ? 10 : (isSelected ? 5 : 1)
          }}
          onClick={(e) => handleComponentClick(component.id, e)}
          onMouseDown={(e) => handleComponentMouseDown(component.id, e)}
        >
          {/* ResizableComponent wrapper with Component as child */}
          <ResizableComponent
            component={component}
            isSelected={isSelected}
            isDragging={draggedComponentId === component.id}
            isResizing={resizingComponentId === component.id}
            canvasWidth={canvasSize.width}
            onResizeStart={handleResizeStart}
            onResize={handleResize}
            onResizeEnd={handleResizeEnd}
            onMeasuredDimensions={(dimensions) => handleMeasuredDimensionsWithId(component.id, dimensions)}
          >
            <Component
              {...(component.props || {})}
              _positioningMode={component.positioningMode}
              _size={component.props?._size}
              _isInVisualBuilder={true}
              _onContentChange={(content: string) => {
                // Update the component's content property
                updateComponent(component.id, {
                  props: {
                    ...component.props,
                    content: content
                  }
                });
              }}
            >
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

                // For container components, render children as actual React components
                if (isContainerComponent(component.type)) {
                  return renderNestedComponent(child);
                }

                // For other child types, render with generic data attributes
                return (
                  <div
                    key={child.id}
                    data-child-type={child.type}
                    data-child-id={child.id}
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
            </Component>

            {/* Container indicator for components that can accept children */}
            {isContainerComponent(component.type) && (
              <div className={`absolute -top-2 -left-2 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold z-10 border-2 border-white shadow-sm transition-all ${
                isDragging ? 'bg-blue-500 animate-pulse' : 'bg-blue-600'
              }`}>
                📦
              </div>
            )}

            {/* Text component indicator for editable text elements */}
            {isTextComponent(component.type) && (
              <div className={`absolute -top-2 -left-2 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold z-10 border-2 border-white shadow-sm transition-all ${
                isDragging ? 'bg-green-500 animate-pulse' : isSelected ? 'bg-green-600' : 'bg-green-500 opacity-70'
              }`}>
                📝
              </div>
            )}

            {/* Sizing behavior indicator */}
            {(() => {
              const componentType = component.type.toLowerCase();

              // Match the categorization logic from AdvancedProfileRenderer
              const containerFillers = [
                'gradientbox', 'stickynote', 'retroterminal', 'polaroidframe',
                'centeredbox', 'neonborder', 'revealbox', 'floatingbadge'
              ];

              const contentDriven = [
                'textelement', 'paragraph', 'contactcard', 'progresstracker',
                'bio', 'blogposts', 'guestbook', 'tabs'
              ];

              const autoSize = [
                'profilephoto', 'displayname', 'followbutton', 'mutualfriends',
                'friendbadge', 'userimage', 'mediagrid'
              ];

              let sizingInfo = null;

              if (containerFillers.includes(componentType)) {
                sizingInfo = { emoji: '📐', color: 'bg-orange-500', label: 'Fixed size' };
              } else if (contentDriven.includes(componentType)) {
                sizingInfo = { emoji: '📏', color: 'bg-purple-500', label: 'Expands with content' };
              } else if (autoSize.includes(componentType)) {
                sizingInfo = { emoji: '⚖️', color: 'bg-blue-500', label: 'Smart sizing' };
              }

              return sizingInfo && isSelected ? (
                <div
                  className={`absolute -bottom-2 -left-2 ${sizingInfo.color} text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold z-10 border-2 border-white shadow-sm`}
                  title={sizingInfo.label}
                >
                  {sizingInfo.emoji}
                </div>
              ) : null;
            })()}

            {/* Simple visual indicator for children count */}
            {component.children && component.children.length > 0 && (
              <div className="absolute -top-2 -right-2 bg-purple-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold z-10">
                {component.children.length}
              </div>
            )}
            {/* Selection indicator - positioned to wrap actual component content */}
            {isSelected && (() => {
              const measuredDims = componentDimensions.get(component.id);

              // Use measured dimensions if available, otherwise fallback to container sizing
              const selectorStyle = measuredDims ? {
                left: measuredDims.offsetX - 2,
                top: measuredDims.offsetY - 2,
                width: measuredDims.width + 4,
                height: measuredDims.height + 4
              } : {
                left: -2,
                top: -2,
                width: 'calc(100% + 4px)',
                height: 'calc(100% + 4px)'
              };

              return (
                <div
                  className="absolute border-2 border-blue-500 border-dashed rounded pointer-events-none z-20"
                  style={selectorStyle}
                >
                  <div className="absolute -top-1 -left-1 w-2 h-2 bg-blue-500 rounded-full" />
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full" />
                  <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-blue-500 rounded-full" />
                  <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-blue-500 rounded-full" />
                </div>
              );
            })()}

            {/* Drag indicator */}
            {draggedComponentId === component.id && (() => {
              const measuredDims = componentDimensions.get(component.id);

              // Use measured dimensions if available, otherwise fallback to container sizing
              const dragStyle = measuredDims ? {
                left: measuredDims.offsetX - 2,
                top: measuredDims.offsetY - 2,
                width: measuredDims.width + 4,
                height: measuredDims.height + 4
              } : {
                left: -2,
                top: -2,
                width: 'calc(100% + 4px)',
                height: 'calc(100% + 4px)'
              };

              return (
                <div
                  className="absolute bg-blue-100 border-2 border-blue-300 border-dashed rounded pointer-events-none opacity-50 z-10"
                  style={dragStyle}
                />
              );
            })()}

            {/* Resize preview overlay */}
            {resizingComponentId === component.id && resizePreview && (() => {
              const currentBreakpoint = getCurrentBreakpoint(canvasSize.width);
              const constraints = getComponentResizeConstraints(component, currentBreakpoint);
              const measuredDims = componentDimensions.get(component.id);

              // Calculate visual preview dimensions and positioning
              // Simple approach: use resize preview dimensions directly
              const visualWidth = resizePreview.width;
              const visualHeight = resizePreview.height;

              // Position preview to overlay the component's container area exactly
              // This ensures the preview matches where the component will actually be
              const previewStyle = {
                left: -2, // Slight border offset for visual feedback
                top: -2,
                width: visualWidth + 4,
                height: visualHeight + 4
              };

              const isAtMinWidth = visualWidth <= (constraints.minWidth || 0);
              const isAtMaxWidth = visualWidth >= (constraints.maxWidth || Infinity);
              const isAtMinHeight = visualHeight <= (constraints.minHeight || 0);
              const isAtMaxHeight = visualHeight >= (constraints.maxHeight || Infinity);

              return (
                <div
                  className={`absolute border-2 border-dashed rounded pointer-events-none opacity-80 z-30 ${
                    isAtMinWidth || isAtMaxWidth || isAtMinHeight || isAtMaxHeight
                      ? 'bg-yellow-100 border-yellow-500'
                      : 'bg-blue-100 border-blue-500'
                  }`}
                  style={previewStyle}
                >
                  {/* Size display */}
                  <div className={`absolute top-1 left-1 text-white text-xs px-2 py-1 rounded font-mono ${
                    isAtMinWidth || isAtMaxWidth || isAtMinHeight || isAtMaxHeight
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
                  {(isAtMinWidth || isAtMaxWidth || isAtMinHeight || isAtMaxHeight) && (
                    <div className="absolute bottom-1 left-1 bg-yellow-600 text-white text-xs px-2 py-1 rounded">
                      {isAtMinWidth && 'Min width'}
                      {isAtMaxWidth && 'Max width'}
                      {isAtMinHeight && 'Min height'}
                      {isAtMaxHeight && 'Max height'}
                    </div>
                  )}

                </div>
              );
            })()}
          </ResizableComponent>
        </div>
      );
    } catch (error) {
      console.error('Error rendering component:', error);
      // Fall back to test div if component fails to render
      return testDiv;
    }
  }, [selectedComponentIds, handleComponentClick, draggedComponentId, handleComponentMouseDown, resizingComponentId, resizePreview, handleResizeStart, handleResize, handleResizeEnd, canvasSize.width, updateComponentSize]);

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

  // Drop zone feedback rendering
  const renderDropZoneFeedback = useCallback(() => {
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
            width: '200px', // Default component width
            height: '100px', // Default component height
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
            width: '200px', // Default component width
            height: '150px', // Default component height
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
  }, [previewPosition, dropZoneState, draggedComponent]);

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
            boxSizing: 'border-box',
            // Apply global settings (includes background, typography, effects)
            ...generateGlobalCSSProperties(globalSettings),
            // Default checkerboard if no global settings
            ...(!globalSettings && {
              background: 'linear-gradient(45deg, #f8f9fa 25%, transparent 25%, transparent 75%, #f8f9fa 75%, #f8f9fa), linear-gradient(45deg, #f8f9fa 25%, transparent 25%, transparent 75%, #f8f9fa 75%, #f8f9fa)',
              backgroundSize: '20px 20px',
              backgroundPosition: '0 0, 10px 10px',
            }),
            // Override padding if needed
            padding: globalSettings?.spacing?.containerPadding || `${gridConfig.currentBreakpoint.containerPadding}px`,
          }}
          data-wysiwyg-padding={gridConfig.currentBreakpoint.containerPadding}
          data-wysiwyg-breakpoint={gridConfig.currentBreakpoint.name}
          data-wysiwyg-canvas-width={canvasSize.width}
          onDragOver={handleDragOverWithPreview}
          onDrop={handleDrop}
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
          }}
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
          onDragLeave={handleDragLeave}
        >
          {/* Responsive Grid overlay */}
          <ResponsiveGridOverlay
            gridConfig={gridConfig}
            canvasWidth={canvasSize.width}
            canvasHeight={canvasSize.height}
          />

          {/* Minimal canvas info - only show essentials */}
          {previewBreakpoint && (
            <div className="absolute top-4 right-4 bg-purple-500 text-white px-3 py-2 rounded-lg shadow-lg z-10">
              <div className="flex items-center gap-2 text-sm font-medium">
                <span>📱</span>
                <span>Previewing {previewBreakpoint}</span>
                <span className="text-purple-200">•</span>
                <span>{canvasSize.breakpoint.columns} cols</span>
              </div>
            </div>
          )}

          {/* Render all placed components */}
          {(() => {
            if (placedComponents.length === 0) {
              return (
                <div className="absolute inset-0 flex items-center justify-center text-gray-400 pointer-events-none">
                  <div className="text-center max-w-md">
                    <div className="text-6xl mb-4 opacity-60">🎨</div>
                    <h3 className="text-xl font-semibold mb-2 text-gray-600">Start Creating</h3>
                    <p className="text-gray-500 mb-4">Open the component palette to add your first component, or switch to code mode to edit HTML directly.</p>
                    <div className="flex items-center justify-center gap-4 text-sm text-gray-400">
                      <div className="flex items-center gap-2">
                        <span>🧩</span>
                        <span>Components panel</span>
                      </div>
                      <span>•</span>
                      <div className="flex items-center gap-2">
                        <span>💻</span>
                        <span>Code mode</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

            // Filter and render valid components
            const validComponents = placedComponents.filter(component => component && component.id && component.type);

            const renderedComponents = validComponents.map((component, index) => {
              return renderComponent(component);
            });

            return renderedComponents;
          })()}

          {/* Render preview component */}
          {renderPreview()}

          {/* Render drop zone feedback */}
          {renderDropZoneFeedback()}

          {/* Smart alignment guides */}
          <AlignmentGuides
            guides={alignmentGuides.guides}
            snapPoints={alignmentGuides.snapPoints}
            isVisible={alignmentGuides.isVisible}
            canvasWidth={canvasSize.width}
            canvasHeight={canvasSize.height}
          />

          {/* Live position indicator */}
          <PositionIndicator
            position={positionIndicator.position}
            isVisible={positionIndicator.isVisible}
            mode={positionIndicator.mode}
            mousePosition={positionIndicator.mousePosition}
          />

          {/* Snapping controls panel */}
          <div className="absolute top-4 left-4 bg-white bg-opacity-95 backdrop-blur-sm px-3 py-2 rounded-lg shadow-lg text-sm border">
            <div className="flex items-center gap-3">
              <span className="text-gray-600 font-medium text-xs">SNAP:</span>

              {/* Component snapping toggle */}
              <button
                onClick={() => setSnapConfig(prev => ({ ...prev, componentSnapping: !prev.componentSnapping }))}
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                  snapConfig.componentSnapping
                    ? 'bg-blue-100 text-blue-700 border border-blue-200'
                    : 'bg-gray-100 text-gray-500 border border-gray-200'
                }`}
                title="Toggle component snapping (Alt+C)"
              >
                <span>🧲</span>
                <span>Comp</span>
              </button>


              {/* Guides visibility toggle */}
              <button
                onClick={() => setSnapConfig(prev => ({ ...prev, showGuides: !prev.showGuides }))}
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                  snapConfig.showGuides
                    ? 'bg-green-100 text-green-700 border border-green-200'
                    : 'bg-gray-100 text-gray-500 border border-gray-200'
                }`}
                title="Toggle alignment guides (Alt+H)"
              >
                <span>📏</span>
                <span>Guides</span>
              </button>
            </div>

            {/* Sizing behavior legend */}
            {selectedComponentIds.size > 0 && (
              <div className="mt-2 pt-2 border-t border-gray-200">
                <div className="text-xs text-gray-500 mb-1">SIZING BEHAVIORS:</div>
                <div className="flex gap-2 text-xs">
                  <div className="flex items-center gap-1">
                    <div className="w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center text-white text-xs">📐</div>
                    <span className="text-gray-600">Fixed</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-4 h-4 bg-purple-500 rounded-full flex items-center justify-center text-white text-xs">📏</div>
                    <span className="text-gray-600">Expands</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs">⚖️</div>
                    <span className="text-gray-600">Smart</span>
                  </div>
                </div>
              </div>
            )}
          </div>

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