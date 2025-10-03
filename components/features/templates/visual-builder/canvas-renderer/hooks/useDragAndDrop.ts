import { useState, useCallback, useEffect, type RefObject } from 'react';
import type { ComponentItem } from '@/hooks/useCanvasState';
import { componentRegistry } from '@/lib/templates/core/template-registry';
import { SmartSnapping, type SnapResult } from '@/lib/templates/visual-builder/snapping-utils';
import type { useAlignmentGuides } from '../../AlignmentGuides';
import type { usePositionIndicator } from '../../PositionIndicator';

type AlignmentGuidesType = ReturnType<typeof useAlignmentGuides>;
type PositionIndicatorType = ReturnType<typeof usePositionIndicator>;
import { findContainerAtPosition, findSuitableParentAtPosition } from '../utils/component-hierarchy';
import { isContainerComponent } from '../utils/component-type-checkers';

/**
 * Drop zone state for visual feedback during drag operations
 */
export interface DropZoneState {
  isValidDrop: boolean;
  parentComponent: ComponentItem | null;
  targetContainer: ComponentItem | null;
  dropAction: 'normal' | 'add-to-parent' | 'create-parent' | 'add-to-container' | 'invalid';
}

/**
 * Dependencies required by the drag and drop hook
 */
export interface UseDragAndDropDeps {
  // From canvasState
  draggedComponent: any | null;
  isDragging: boolean;
  placedComponents: ComponentItem[];
  addComponent: (component: ComponentItem) => void;
  addChildComponent: (parentId: string, child: ComponentItem) => void;
  removeComponent: (id: string) => void;
  endDrag: () => void;
  updatePositionForActiveBreakpoint: (id: string, position: { x: number; y: number }, activeBreakpoint: 'desktop' | 'tablet' | 'mobile') => void;
  selectedComponentIds: Set<string>;
  selectComponent: (id: string, multiSelect?: boolean) => void;

  // From CanvasRenderer
  canvasRef: RefObject<HTMLDivElement | null>;
  canvasSize: { width: number; height: number; minHeight: number };
  activeBreakpoint: 'desktop' | 'tablet' | 'mobile';
  snapToGrid: (x: number, y: number, canvasWidth: number) => { x: number; y: number };
  smartSnapping: SmartSnapping;
  alignmentGuides: AlignmentGuidesType;
  positionIndicator: PositionIndicatorType;
  setPreviewPosition: (position: { x: number; y: number } | null) => void;
  getEffectivePosition: (componentId: string, breakpoint: string) => any;
}

/**
 * Return value from the drag and drop hook
 */
export interface UseDragAndDropResult {
  // HTML5 drag handlers (palette → canvas)
  handleDragOver: (event: React.DragEvent) => void;
  handleDrop: (event: React.DragEvent) => void;
  handleDragLeave: () => void;

  // Component drag handlers (canvas → canvas)
  handleComponentMouseDown: (componentId: string, event: React.MouseEvent) => void;
  handleComponentMouseMove: (event: MouseEvent) => void;
  handleComponentMouseUp: (event: MouseEvent) => void;

  // Drag state
  draggedComponentId: string | null;
  setDraggedComponentId: (id: string | null) => void;
  dragOffset: { x: number; y: number };
  setDragOffset: (offset: { x: number; y: number }) => void;
  dropZoneState: DropZoneState;
}

/**
 * useDragAndDrop - Manages all drag and drop operations for the canvas
 *
 * Handles:
 * - HTML5 drag & drop from component palette
 * - Component dragging within canvas
 * - Container detection and nesting
 * - Drop zone visual feedback
 * - Multi-component dragging
 * - Snapping and alignment during drag
 */
export function useDragAndDrop(deps: UseDragAndDropDeps): UseDragAndDropResult {
  const {
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
    canvasRef,
    canvasSize,
    activeBreakpoint,
    snapToGrid,
    smartSnapping,
    alignmentGuides,
    positionIndicator,
    setPreviewPosition,
    getEffectivePosition
  } = deps;

  // Drag state for component dragging (canvas → canvas)
  const [draggedComponentId, setDraggedComponentId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Drop zone feedback state
  const [dropZoneState, setDropZoneState] = useState<DropZoneState>({
    isValidDrop: true,
    parentComponent: null,
    targetContainer: null,
    dropAction: 'normal',
  });

  // ============================================
  // HTML5 Drag Handlers (Palette → Canvas)
  // ============================================

  /**
   * handleDragOver - Simple drag over to allow dropping
   */
  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault(); // Allow drop
  }, []);

  /**
   * handleDrop - Handles component drop from palette onto canvas
   * Complex logic for:
   * - Container detection and nesting
   * - Grid auto-wrapping
   * - Parent-child relationships
   * - Position sanitization
   */
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
      // Check if this is a Grid container that needs auto-wrapping
      const isGrid = targetContainer.type === 'Grid';
      const isGridItem = componentToPlace.type === 'GridItem';

      let newChild: ComponentItem;

      if (isGrid && !isGridItem) {
        // Auto-wrap non-GridItem components in GridItem when dropping into Grid
        const wrappedComponentId = `${componentToPlace.type}_${Date.now()}`;
        newChild = {
          id: `GridItem_${Date.now()}`,
          type: 'GridItem',
          position: { x: 0, y: 0 },
          positioningMode: 'absolute',
          publicProps: {
            // Auto-assign grid column based on existing children count
            gridColumn: String((targetContainer.children?.length || 0) + 1)
          },
          visualBuilderState: {
            isSelected: false,
            isLocked: false,
            isHidden: false,
            lastModified: Date.now()
          },
          children: [{
            id: wrappedComponentId,
            type: componentToPlace.type,
            position: { x: 0, y: 0 },
            positioningMode: 'absolute',
            publicProps: componentToPlace.publicProps || componentToPlace.props || {},
            visualBuilderState: {
              isSelected: false,
              isLocked: false,
              isHidden: false,
              lastModified: Date.now()
            }
          }]
        };
      } else {
        // For non-Grid containers or GridItem components, add directly
        if (!componentRegistry.canAcceptChild(targetContainer.type, componentToPlace.type)) {
          console.warn(`Container ${targetContainer.type} cannot accept child of type ${componentToPlace.type}`);
          return;
        }

        newChild = {
          id: `${componentToPlace.type}_${Date.now()}`,
          type: componentToPlace.type,
          position: { x: 0, y: 0 }, // Children use relative positioning within container
          positioningMode: 'absolute',
          publicProps: componentToPlace.publicProps || componentToPlace.props || {},
          visualBuilderState: {
            isSelected: false,
            isLocked: false,
            isHidden: false,
            lastModified: Date.now()
          }
        };
      }

      addChildComponent(targetContainer.id, newChild);
    } else if (relationship?.type === 'child' && relationship?.requiresParent) {
      // Try to find a suitable parent component at this position (for components that specifically require parents)
      const parentFound = findSuitableParentAtPosition(finalX, finalY, relationship.requiresParent, placedComponents);

      if (parentFound) {
        // Validate that the parent can accept this child type
        if (!componentRegistry.canAcceptChild(parentFound.type, componentToPlace.type)) {
          console.warn(`Parent ${parentFound.type} cannot accept child of type ${componentToPlace.type}`);
          return;
        }

        // Add as child to existing parent
        const newChild: ComponentItem = {
          id: `${componentToPlace.type}_${Date.now()}`,
          type: componentToPlace.type,
          position: { x: 0, y: 0 }, // Children use relative positioning
          positioningMode: 'absolute',
          publicProps: componentToPlace.publicProps || componentToPlace.props || {},
          visualBuilderState: {
            isSelected: false,
            isLocked: false,
            isHidden: false,
            lastModified: Date.now()
          }
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
            publicProps: {},
            visualBuilderState: {
              isSelected: false,
              isLocked: false,
              isHidden: false,
              lastModified: Date.now()
            },
            children: [{
              id: `${componentToPlace.type}_${Date.now()}`,
              type: componentToPlace.type,
              position: { x: 0, y: 0 },
              positioningMode: 'absolute',
              publicProps: componentToPlace.publicProps || componentToPlace.props || {},
              visualBuilderState: {
                isSelected: false,
                isLocked: false,
                isHidden: false,
                lastModified: Date.now()
              }
            }]
          };

          addComponent(newParent);
        }
      }
    } else {
      // Normal component drop on canvas - unified absolute positioning
      const componentProps = { ...(componentToPlace.props || {}) };

      // CRITICAL FIX: Strip positioning data from palette component props
      // When placing a component from the palette (especially after loading a template),
      // the component may have stale positioning data in its props from HTML parsing
      // This causes newly placed components to save with wrong/contaminated coordinates
      delete componentProps.style; // Remove style string (contains old positioning)
      delete componentProps.position;
      delete componentProps.top;
      delete componentProps.right;
      delete componentProps.bottom;
      delete componentProps.left;
      delete componentProps.zIndex;

      // CRITICAL FIX: Also strip positioning from publicProps if present
      // publicProps can carry contaminated positioning from previous template saves
      const cleanPublicProps: Record<string, any> = { ...(componentToPlace.publicProps || {}) };
      const positioningProps: string[] = ['position', 'top', 'right', 'bottom', 'left', 'zIndex'];
      positioningProps.forEach((prop: string) => delete cleanPublicProps[prop]);

      // Strip positioning from style prop in publicProps (string or object)
      if (cleanPublicProps.style) {
        if (typeof cleanPublicProps.style === 'string') {
          const declarations = cleanPublicProps.style.split(';').map(d => d.trim()).filter(Boolean);
          const cleanedDeclarations = declarations.filter(declaration => {
            const property = declaration.split(':')[0]?.trim().toLowerCase();
            return !['position', 'top', 'right', 'bottom', 'left', 'z-index'].includes(property);
          });
          cleanPublicProps.style = cleanedDeclarations.join('; ');
        } else if (typeof cleanPublicProps.style === 'object') {
          const cleaned = { ...cleanPublicProps.style };
          delete cleaned.position;
          delete cleaned.top;
          delete cleaned.right;
          delete cleaned.bottom;
          delete cleaned.left;
          delete cleaned.zIndex;
          cleanPublicProps.style = cleaned;
        }
      }

      // Set proper default sizes for container components to match their visual appearance
      if (componentToPlace.type === 'Grid') {
        componentProps._size = {
          width: '400px',
          height: '300px'
        };
      } else if (isContainerComponent(componentToPlace.type)) {
        // Other containers also need reasonable default sizes
        componentProps._size = componentProps._size || {
          width: '300px',
          height: '200px'
        };
      }

      const newComponent: ComponentItem = {
        id: `${componentToPlace.type}_${Date.now()}`,
        type: componentToPlace.type,
        position: { x: finalX, y: finalY },
        positioningMode: 'absolute',
        publicProps: cleanPublicProps,
        visualBuilderState: {
          isSelected: false,
          isLocked: false,
          isHidden: false,
          lastModified: Date.now()
        }
      };

      addComponent(newComponent);
    }

    endDrag();
  }, [draggedComponent, addComponent, addChildComponent, endDrag, snapToGrid, placedComponents, canvasSize.width]);

  /**
   * handleDragLeave - Clear preview and drop zone state when drag leaves canvas
   */
  const handleDragLeave = useCallback(() => {
    setPreviewPosition(null);
    setDropZoneState({
      isValidDrop: false,
      parentComponent: null,
      targetContainer: null,
      dropAction: 'invalid',
    });
  }, [setPreviewPosition]);

  // ============================================
  // Component Drag Handlers (Canvas → Canvas)
  // ============================================

  /**
   * handleComponentMouseDown - Initiates drag for existing canvas components
   */
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
  }, [placedComponents, canvasRef, selectedComponentIds, selectComponent]);

  /**
   * handleComponentMouseMove - Handles component dragging with snapping and container detection
   * Complex logic for:
   * - Container detection priority
   * - Smart snapping
   * - Multi-component dragging
   * - Alignment guides
   */
  const handleComponentMouseMove = useCallback((event: MouseEvent) => {
    if (!draggedComponentId || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left - dragOffset.x;
    const y = event.clientY - rect.top - dragOffset.y;

    // Get mouse position for container detection
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    // ===============================================
    // CONTAINER DETECTION PRIORITY SYSTEM
    // ===============================================
    // Check for container drops FIRST (before any position calculations)
    // This ensures container detection takes precedence over snapping
    const targetContainer = findContainerAtPosition(mouseX, mouseY, placedComponents, draggedComponentId, canvasSize.width);

    if (targetContainer) {
      // Find the dragged component to validate child type compatibility
      const draggedComponent = placedComponents.find(comp => comp.id === draggedComponentId);
      const canAccept = draggedComponent ?
        componentRegistry.canAcceptChild(targetContainer.type, draggedComponent.type) : false;

      setDropZoneState({
        isValidDrop: canAccept,
        parentComponent: null,
        targetContainer: targetContainer,
        dropAction: canAccept ? 'add-to-container' : 'invalid',
      });
    } else {
      // Reset drop zone state if not over a container
      setDropZoneState({
        isValidDrop: true,
        parentComponent: null,
        targetContainer: null,
        dropAction: 'normal',
      });
    }

    // Calculate new position (constrained to canvas bounds)
    const adjustedX = Math.max(0, Math.min(x, canvasSize.width));
    const adjustedY = Math.max(0, Math.min(y, canvasSize.height));

    const draggedComponent = placedComponents.find(c => c.id === draggedComponentId);
    if (!draggedComponent) return;

    // Check if we're dragging multiple components
    const selectedIds = Array.from(selectedComponentIds);
    const isMultiDrag = selectedIds.length > 1 && selectedIds.includes(draggedComponentId);

    let finalPosition: { x: number; y: number };
    let multiComponentResult: any = null;

    // ===============================================
    // CONTAINER DROP PRIORITY OVERRIDE
    // ===============================================
    // If dropping into a container, SKIP smart snapping entirely
    // This prevents smart snapping from interfering with container drop detection
    const isOverValidContainer = targetContainer &&
      placedComponents.find(comp => comp.id === draggedComponentId) &&
      componentRegistry.canAcceptChild(targetContainer.type, placedComponents.find(comp => comp.id === draggedComponentId)!.type);

    if (isOverValidContainer) {
      // Use raw adjusted position without any snapping
      finalPosition = { x: adjustedX, y: adjustedY };

      // Clear alignment guides when over container
      alignmentGuides.hideGuides();

      // Show special container targeting feedback
      const componentWidth = parseInt(draggedComponent.props?._size?.width || '200', 10) || 200;
      const componentHeight = parseInt(draggedComponent.props?._size?.height || '150', 10) || 150;
      const mousePosition = { x: event.clientX - rect.left, y: event.clientY - rect.top };

      positionIndicator.showPosition(
        {
          x: finalPosition.x,
          y: finalPosition.y,
          width: componentWidth,
          height: componentHeight,
          isSnapped: false,
          snapInfo: `Drop into ${targetContainer.type}`
        },
        'drag',
        mousePosition
      );
    } else if (smartSnapping) {
      // ===============================================
      // UNIFIED SMART SNAPPING (NOT over container)
      // ===============================================
      if (isMultiDrag) {
        // Multi-component dragging with unified smart snapping
        // Calculate movement delta from the primary dragged component
        const primaryComponent = placedComponents.find(c => c.id === draggedComponentId);
        if (!primaryComponent) return;

        const deltaX = adjustedX - (primaryComponent.position?.x || 0);
        const deltaY = adjustedY - (primaryComponent.position?.y || 0);

        // Apply smart snapping to the primary component
        const componentWidth = parseInt(primaryComponent.props?._size?.width || '200', 10) || 200;
        const componentHeight = parseInt(primaryComponent.props?._size?.height || '150', 10) || 150;

        // Get other components for snapping (exclude all selected components)
        const otherComponents = placedComponents
          .filter(c => !selectedIds.includes(c.id))
          .map(c => ({
            id: c.id,
            x: c.position?.x || 0,
            y: c.position?.y || 0,
            width: parseInt(c.props?._size?.width || '200', 10) || 200,
            height: parseInt(c.props?._size?.height || '150', 10) || 150
          }));

        const movingComponents = selectedIds
          .map(id => {
            const comp = placedComponents.find(c => c.id === id);
            if (!comp) return null;
            return {
              id: comp.id,
              x: (comp.position?.x || 0) + deltaX,
              y: (comp.position?.y || 0) + deltaY,
              width: parseInt(comp.props?._size?.width || '200', 10) || 200,
              height: parseInt(comp.props?._size?.height || '150', 10) || 150
            };
          }).filter((c): c is NonNullable<typeof c> => c !== null);

        multiComponentResult = smartSnapping.calculateMultiComponentSnap(
          movingComponents,
          otherComponents,
          canvasSize.width,
          canvasSize.height,
          activeBreakpoint
        );

        // Find the primary dragged component in the result
        const primaryResult = multiComponentResult.components.find((c: any) => c.id === draggedComponentId);
        finalPosition = primaryResult ? { x: primaryResult.x, y: primaryResult.y } : { x: adjustedX, y: adjustedY };

        // Handle multi-component visual feedback
        const allGuides = multiComponentResult.alignmentGuides || [];
        const allSnapPoints = multiComponentResult.snapPoints || [];

        if (allGuides.length > 0 || allSnapPoints.length > 0) {
          alignmentGuides.showGuides(allGuides, allSnapPoints);
        } else {
          alignmentGuides.hideGuides();
        }

      } else {
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

        // PHASE 4.3: Extract Grid components for CSS Grid snapping
        const gridComponents = placedComponents
          .filter(c => c.type === 'Grid')
          .map(c => {
            const props: any = c.publicProps || c.props || {};
            return {
              id: c.id,
              x: c.position?.x || 0,
              y: c.position?.y || 0,
              width: parseInt(c.props?._size?.width || '400', 10) || 400,
              height: parseInt(c.props?._size?.height || '300', 10) || 300,
              columns: parseInt(props.columns || '3', 10) || 3,
              rows: parseInt(props.rows || '3', 10) || 3,
              gap: parseInt(props.gap || '16', 10) || 16
            };
          });

        const snapResult = smartSnapping.calculateSnap(
          { x: adjustedX, y: adjustedY, width: componentWidth, height: componentHeight },
          otherComponents,
          canvasSize.width,
          canvasSize.height,
          activeBreakpoint,
          gridComponents
        );

        finalPosition = { x: snapResult.x, y: snapResult.y };

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
    } else {
      // Fallback when smart snapping is disabled and not over container
      finalPosition = snapToGrid(adjustedX, adjustedY, canvasSize.width);

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

    // PHASE 4.2: Update component position - use breakpoint-aware update
    if (isMultiDrag && multiComponentResult) {
      // Update all selected components during multi-drag with exact smart snapping coordinates
      multiComponentResult.components.forEach((compResult: any) => {
        updatePositionForActiveBreakpoint(compResult.id, { x: compResult.x, y: compResult.y }, activeBreakpoint);
      });
    } else {
      // Single component update with exact smart snapping coordinates
      updatePositionForActiveBreakpoint(draggedComponentId, finalPosition, activeBreakpoint);
    }

    // Container detection and drop zone state is now handled at the beginning of this function

  }, [draggedComponentId, dragOffset, updatePositionForActiveBreakpoint, activeBreakpoint, placedComponents, setDropZoneState, setPreviewPosition, smartSnapping, alignmentGuides, positionIndicator, canvasSize.width, canvasSize.height, selectedComponentIds]);

  /**
   * handleComponentMouseUp - Handles drop of dragged component onto containers
   */
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
          // Check if this is a Grid container that needs auto-wrapping
          const isGrid = targetContainer.type === 'Grid';
          const isGridItem = draggedComponent.type === 'GridItem';


          let newChild: ComponentItem;

          if (isGrid && !isGridItem) {
            // Auto-wrap non-GridItem components in GridItem when dropping into Grid
            newChild = {
              id: `GridItem_${Date.now()}`,
              type: 'GridItem',
              position: { x: 0, y: 0 },
              positioningMode: 'absolute',
              publicProps: {
                gridColumn: String((targetContainer.children?.length || 0) + 1)
              },
              visualBuilderState: {
                isSelected: false,
                isLocked: false,
                isHidden: false,
                lastModified: Date.now()
              },
              children: [{
                ...draggedComponent,
                position: { x: 0, y: 0 },
                positioningMode: 'absolute',
              }]
            };
          } else {
            // For non-Grid containers or GridItem components, validate and move directly
            const canAccept = componentRegistry.canAcceptChild(targetContainer.type, draggedComponent.type);

            if (!canAccept) {
              console.warn(`Container ${targetContainer.type} cannot accept child of type ${draggedComponent.type}`);
              setDraggedComponentId(null);
              return;
            }

            newChild = {
              ...draggedComponent,
              position: { x: 0, y: 0 }, // Reset position for container child
              positioningMode: 'absolute',
            };
          }

          // Add component to container
          addChildComponent(targetContainer.id, newChild);

          // Remove from canvas state using the existing removeComponent function
          removeComponent(draggedComponentId);

        }
      }
    }

    setDraggedComponentId(null);

    // Clear guides and indicators
    alignmentGuides.hideGuides();
    positionIndicator.hidePosition();

    // Reset drop zone state
    setDropZoneState({
      isValidDrop: true,
      parentComponent: null,
      targetContainer: null,
      dropAction: 'normal',
    });

    if (setPreviewPosition) {
      setPreviewPosition(null);
    }
  }, [draggedComponentId, placedComponents, addChildComponent, removeComponent, setDropZoneState, setPreviewPosition, alignmentGuides, positionIndicator, canvasRef, canvasSize.width]);

  // ============================================
  // Effects
  // ============================================

  /**
   * Add global mouse event listeners for component dragging
   */
  useEffect(() => {
    if (draggedComponentId) {
      document.addEventListener('mousemove', handleComponentMouseMove);
      document.addEventListener('mouseup', handleComponentMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleComponentMouseMove);
        document.removeEventListener('mouseup', handleComponentMouseUp);
      };
    }
  }, [draggedComponentId, handleComponentMouseMove, handleComponentMouseUp]);

  // ============================================
  // Return API
  // ============================================

  return {
    // HTML5 drag handlers (palette → canvas)
    handleDragOver,
    handleDrop,
    handleDragLeave,

    // Component drag handlers (canvas → canvas)
    handleComponentMouseDown,
    handleComponentMouseMove,
    handleComponentMouseUp,

    // Drag state
    draggedComponentId,
    setDraggedComponentId,
    dragOffset,
    setDragOffset,
    dropZoneState
  };
}
