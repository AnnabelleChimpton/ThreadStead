/**
 * VISUAL_BUILDER_PROGRESS: Canvas State Hook - Simplified Pixel Homes Pattern
 * Phase 1: Visual Builder Foundation - Direct State Management
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  getOptimalSpan,
  getCurrentBreakpoint,
  GRID_BREAKPOINTS,
  gridToPixelCoordinates,
  pixelToGridCoordinates,
  getColumnWidth,
  calculateSpanWidth,
  type GridBreakpoint
} from '@/lib/templates/visual-builder/grid-utils';
import { componentRegistry, validateAndCoerceProps } from '@/lib/templates/core/template-registry';
import type { GlobalSettings } from '@/components/features/templates/visual-builder/GlobalSettingsPanel';
import { deepEqualsComponent, wouldComponentChange, optimizeComponentArrayUpdate } from '@/lib/templates/visual-builder/component-equality';
import { StandardComponentProps } from '@/lib/templates/core/standard-component-interface';

// Component group for organizing multiple components
export interface ComponentGroup {
  id: string;
  name: string;
  color: string;          // Visual color for group identification
  componentIds: string[];  // IDs of components in this group
  locked: boolean;        // Whether group is locked from editing
  visible: boolean;       // Whether group is visible
  createdAt: number;      // Timestamp for sorting
}

// Visual Builder internal state for components
export interface VisualBuilderComponentState {
  isSelected: boolean;
  isLocked: boolean;
  isHidden: boolean;
  groupId?: string;
  size?: { width: number; height: number };
  lastModified: number;
  // Track whether specific props have been explicitly set by user
  hasUserSetColumns?: boolean;
  // Legacy props support during migration
  legacyProps?: Record<string, any>;
}

// Responsive position data for a single breakpoint
export interface ResponsivePositionData {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Enhanced component item with separated public/internal props
export interface ComponentItem {
  id: string;
  type: string;
  position: { x: number; y: number }; // Absolute positioning (pixels) - Desktop default
  gridPosition?: {
    column: number;     // Starting column (1-based)
    span: number;       // Number of columns to span
    row: number;        // Row position (1-based)
  };
  positioningMode: 'absolute' | 'grid';

  // NEW: Responsive positioning support
  responsivePositions?: {
    tablet?: ResponsivePositionData;
    mobile?: ResponsivePositionData;
  };

  // NEW: Separated prop structure for standardization
  publicProps: StandardComponentProps;        // Only public component props
  visualBuilderState: VisualBuilderComponentState;  // Internal VB state

  children?: ComponentItem[];   // Child components for parent-child relationships

  // Backward compatibility support
  props?: Record<string, any>;  // DEPRECATED: Will be migrated to publicProps
}

// Enhanced grid configuration for responsive canvas
export interface GridConfig {
  enabled: boolean;
  columns: number;        // Number of columns (responsive based on breakpoint)
  rowHeight: number;      // Height of each row in pixels (consistent across builder and profile)
  gap: number;           // Gap between grid cells in pixels (responsive)
  showGrid: boolean;     // Whether to show grid overlay

  // Enhanced responsive features
  currentBreakpoint: GridBreakpoint;  // Current responsive breakpoint
  autoSpanning: boolean;   // Whether to use automatic component spanning
  responsiveMode: boolean; // Whether to use responsive grid system
}

export interface UseCanvasStateResult {
  // Direct state - no complex CanvasState object
  placedComponents: ComponentItem[];
  selectedComponentIds: Set<string>;
  draggedComponent: ComponentItem | null;
  isDragging: boolean;
  previewPosition: { x: number; y: number } | null;

  // Component groups state
  componentGroups: ComponentGroup[];
  selectedGroupId: string | null;

  // Grid configuration state
  gridConfig: GridConfig;
  setGridConfig: (config: Partial<GridConfig>) => void;
  positioningMode: 'absolute' | 'grid';
  setPositioningMode: (mode: 'absolute' | 'grid') => void;

  // Global settings state
  globalSettings: GlobalSettings | null;
  setGlobalSettings: (settings: GlobalSettings) => void;

  // Simple operations following pixel homes pattern
  addComponent: (component: ComponentItem) => void;
  removeComponent: (id: string) => void;
  updateComponent: (id: string, updates: Partial<ComponentItem>) => void;
  updateComponentPosition: (id: string, position: { x: number; y: number }) => void;
  updateComponentGridPosition: (id: string, gridPosition: { column: number; span: number; row: number }) => void;
  // PHASE 4.2: Breakpoint-aware position update
  updatePositionForActiveBreakpoint: (id: string, position: { x: number; y: number }, activeBreakpoint: 'desktop' | 'tablet' | 'mobile') => void;

  // Resize operations
  updateComponentSize: (id: string, size: { width: number; height: number }) => void;
  updateComponentGridSpan: (id: string, span: number) => void;
  resizeComponent: (id: string, size: { width: number; height: number }, position?: { x: number; y: number }) => void;

  // NEW: Responsive positioning operations
  updateResponsivePosition: (id: string, breakpoint: 'tablet' | 'mobile', position: ResponsivePositionData) => void;
  getEffectivePosition: (component: ComponentItem, breakpoint: 'desktop' | 'tablet' | 'mobile') => { x: number; y: number; width: number; height: number };
  copyPositionToBreakpoint: (id: string, fromBreakpoint: 'desktop' | 'tablet' | 'mobile', toBreakpoint: 'tablet' | 'mobile') => void;

  // Child component management
  addChildComponent: (parentId: string, child: ComponentItem) => void;
  removeChildComponent: (parentId: string, childId: string) => void;
  updateChildComponent: (parentId: string, childId: string, updates: Partial<ComponentItem>) => void;
  reorderChildren: (parentId: string, fromIndex: number, toIndex: number) => void;
  moveChildToCanvas: (parentId: string, childId: string, position: { x: number; y: number }) => void;

  // Selection (simplified)
  selectComponent: (id: string, multi?: boolean) => void;
  clearSelection: () => void;
  removeSelected: () => void;

  // Component grouping operations
  createGroup: (name: string, componentIds: string[], color?: string) => void;
  updateGroup: (groupId: string, updates: Partial<ComponentGroup>) => void;
  deleteGroup: (groupId: string) => void;
  addComponentsToGroup: (groupId: string, componentIds: string[]) => void;
  removeComponentsFromGroup: (componentIds: string[]) => void;
  selectGroup: (groupId: string) => void;
  ungroupComponents: (groupId: string) => void;
  getGroupedComponents: (groupId: string) => ComponentItem[];
  getComponentGroup: (componentId: string) => ComponentGroup | undefined;

  // Drag and drop (pixel homes style)
  startDrag: (component: ComponentItem) => void;
  setPreviewPosition: (position: { x: number; y: number } | null) => void;
  endDrag: () => void;

  // Grid utilities
  pixelToGrid: (x: number, y: number, canvasWidth?: number) => { column: number; row: number };
  gridToPixel: (column: number, row: number, canvasWidth?: number) => { x: number; y: number };
  snapToGrid: (x: number, y: number, canvasWidth?: number) => { x: number; y: number };

  // History (simple undo/redo)
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;

  // Canvas operations
  resetCanvas: () => void;

  // NEW: Component prop migration utilities
  migrateComponentProps: (component: ComponentItem) => ComponentItem;
  ensureComponentPropsStructure: (component: Partial<ComponentItem>) => ComponentItem;
}

/**
 * Utility functions for component prop migration
 */

// Migrate component from old props format to new separated format
function migrateComponentToNewFormat(component: ComponentItem): ComponentItem {
  // If component already has new format, return as-is
  if (component.publicProps && component.visualBuilderState) {
    return component;
  }

  // If component has old props format, migrate it
  if (component.props) {
    // Extract Visual Builder specific props
    const {
      _isInVisualBuilder,
      _positioningMode,
      _size,
      _locked,
      _hidden,
      _onContentChange,
      _isSelected,
      groupId,
      // Remove internal props from public props
      ...publicProps
    } = component.props;

    // Create new format
    const migratedComponent: ComponentItem = {
      ...component,
      publicProps: publicProps as StandardComponentProps,
      visualBuilderState: {
        isSelected: _isSelected || false,
        isLocked: _locked || false,
        isHidden: _hidden || false,
        groupId: groupId || component.visualBuilderState?.groupId,
        // FIX: Check both props._size and top-level component.size (from old CanvasComponent format)
        size: _size || (component as any).size,
        lastModified: Date.now(),
        legacyProps: component.props // Keep original for backward compatibility
      },
      // Remove old props field
      props: undefined
    };

    return migratedComponent;
  }

  // If no props at all, create minimal structure
  // FIX: Check for top-level size (from old CanvasComponent format)
  return {
    ...component,
    publicProps: {},
    visualBuilderState: {
      isSelected: false,
      isLocked: false,
      isHidden: false,
      size: (component as any).size, // Import size from old CanvasComponent format if present
      lastModified: Date.now()
    }
  };
}

// Ensure component has the required prop structure (for new components)
function ensureComponentHasPropsStructure(component: Partial<ComponentItem>): ComponentItem {
  const now = Date.now();

  return {
    id: component.id || `comp-${now}`,
    type: component.type || 'Unknown',
    position: component.position || { x: 0, y: 0 },
    positioningMode: component.positioningMode || 'absolute',
    publicProps: component.publicProps || {},
    visualBuilderState: component.visualBuilderState || {
      isSelected: false,
      isLocked: false,
      isHidden: false,
      lastModified: now
    },
    children: component.children || [],
    ...component
  };
}

/**
 * Simplified canvas state hook following pixel homes pattern
 */
export function useCanvasState(initialComponents: ComponentItem[] = []): UseCanvasStateResult {
  // Direct state management like pixel homes
  const [placedComponents, setPlacedComponents] = useState<ComponentItem[]>(initialComponents);

  // Component grouping state
  const [componentGroups, setComponentGroups] = useState<ComponentGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  // Efficient shallow comparison for components
  const componentsAreShallowEqual = useCallback((arr1: ComponentItem[], arr2: ComponentItem[]): boolean => {
    if (arr1.length !== arr2.length) return false;
    if (arr1.length === 0 && arr2.length === 0) return true;

    // For performance, just check length and first/last component IDs
    // This catches most cases without expensive deep comparison
    if (arr1.length > 0 && arr2.length > 0) {
      return arr1[0]?.id === arr2[0]?.id &&
             arr1[arr1.length - 1]?.id === arr2[arr2.length - 1]?.id;
    }

    return false;
  }, []);

  // Track last initial components to avoid unnecessary updates
  const lastInitialComponents = useRef<ComponentItem[]>([]);

  // Update placed components when initial components change (e.g., from template parsing)
  useEffect(() => {
    // Skip if initial components haven't actually changed
    if (componentsAreShallowEqual(initialComponents, lastInitialComponents.current)) {
      return;
    }

    // Only update if the initial components are not empty and different from current
    if (initialComponents.length > 0 && !componentsAreShallowEqual(initialComponents, placedComponents)) {
      setPlacedComponents(initialComponents);
      lastInitialComponents.current = [...initialComponents];
    } else if (initialComponents.length === 0 && placedComponents.length > 0) {
      // Handle case where template is cleared
      setPlacedComponents([]);
      lastInitialComponents.current = [];
    }
  }, [initialComponents, componentsAreShallowEqual]); // Don't include placedComponents to avoid loops
  const [selectedComponentIds, setSelectedComponentIds] = useState<Set<string>>(new Set());
  const [draggedComponent, setDraggedComponent] = useState<ComponentItem | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [previewPosition, setPreviewPosition] = useState<{ x: number; y: number } | null>(null);

  // Enhanced grid configuration state with responsive support
  const [gridConfig, setGridConfigState] = useState<GridConfig>(() => {
    const initialBreakpoint = getCurrentBreakpoint();
    return {
      enabled: true, // Enable grid by default
      columns: initialBreakpoint.columns,
      rowHeight: initialBreakpoint.rowHeight, // Use fixed row height for consistent experience
      gap: initialBreakpoint.gap,
      showGrid: false, // Hide grid by default for cleaner look
      currentBreakpoint: initialBreakpoint,
      autoSpanning: true,
      responsiveMode: true
    };
  });

  // Positioning mode state - default to grid for better UX
  const [positioningMode, setPositioningMode] = useState<'absolute' | 'grid'>('grid');

  // Global settings state
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings | null>(null);

  // History state (simple)
  const [history, setHistory] = useState<{
    past: ComponentItem[][];
    present: ComponentItem[];
    future: ComponentItem[][];
  }>({ past: [], present: initialComponents, future: [] });

  // Removed updateHistory function to fix state conflicts

  // Track state changes with useEffect

  // Enhanced grid utility functions with responsive support
  const pixelToGrid = useCallback((x: number, y: number, canvasWidth?: number) => {
    // Use provided canvas width or fallback to default
    const actualCanvasWidth = canvasWidth || 800;
    const currentBreakpoint = getCurrentBreakpoint(actualCanvasWidth);

    return pixelToGridCoordinates(x, y, actualCanvasWidth, currentBreakpoint);
  }, []);

  const gridToPixel = useCallback((column: number, row: number, canvasWidth?: number) => {
    // Use provided canvas width or fallback to default
    const actualCanvasWidth = canvasWidth || 800;
    const currentBreakpoint = getCurrentBreakpoint(actualCanvasWidth);

    return gridToPixelCoordinates(column, row, actualCanvasWidth, currentBreakpoint);
  }, []);

  const snapToGrid = useCallback((x: number, y: number, canvasWidth?: number) => {
    if (!gridConfig.enabled || positioningMode === 'absolute') {
      return { x, y };
    }

    const { column, row } = pixelToGrid(x, y, canvasWidth);
    return gridToPixel(column, row, canvasWidth);
  }, [gridConfig, positioningMode, pixelToGrid, gridToPixel]);

  // Enhanced component operations with auto-spanning support
  const addComponent = useCallback((component: ComponentItem) => {
    // NEW: Ensure component has proper prop structure
    let processedComponent = ensureComponentHasPropsStructure(component);

    // Migrate any legacy props to new format
    processedComponent = migrateComponentToNewFormat(processedComponent);

    // Ensure component has an ID and positioning mode
    if (!processedComponent.id) {
      processedComponent = {
        ...processedComponent,
        id: `comp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };
    }

    // Respect the positioning mode set by the caller (don't force grid mode)
    // Only default to grid if no positioning mode was specified
    if (!processedComponent.positioningMode) {
      processedComponent = { ...processedComponent, positioningMode: 'grid' };
    }

    // Apply default props from registry for any missing props
    const registration = componentRegistry.get(processedComponent.type);
    if (registration) {
      // For backward compatibility, still validate against legacy props if they exist
      const currentProps = processedComponent.visualBuilderState.legacyProps || processedComponent.publicProps;
      const defaultProps = validateAndCoerceProps(currentProps as Record<string, unknown>, registration.props, {
        hasChildren: false,
        componentType: processedComponent.type
      });

      // Update public props with validated/defaulted values
      processedComponent = {
        ...processedComponent,
        publicProps: { ...processedComponent.publicProps, ...defaultProps }
      };
    }

    // Enhanced grid positioning with auto-spanning
    if (processedComponent.positioningMode === 'grid') {
      if (!processedComponent.gridPosition) {
        const { column, row } = pixelToGrid(processedComponent.position.x, processedComponent.position.y);

        // Use auto-spanning if enabled
        let span = 1;
        if (gridConfig.autoSpanning) {
          span = getOptimalSpan(processedComponent.type, gridConfig.currentBreakpoint.name, gridConfig.columns);
        }

        processedComponent = {
          ...processedComponent,
          gridPosition: { column, row, span }
        };
      }
    }

    // Update the placed components state
    setPlacedComponents(prevComponents => {
      const updatedComponents = [...prevComponents, processedComponent];
      return updatedComponents;
    });

  }, [pixelToGrid, gridConfig]);

  const removeComponent = useCallback((id: string) => {
    // Direct state update without history conflicts
    setPlacedComponents(prevComponents => {
      const updatedComponents = prevComponents.filter(comp => comp.id !== id);
      return updatedComponents;
    });

    // Remove from selection if selected
    setSelectedComponentIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
  }, []); // No dependencies to avoid stale closures

  // Optimized helper function to update component by ID (including children)
  const updateComponentRecursively = (components: ComponentItem[], targetId: string, updates: Partial<Omit<ComponentItem, 'visualBuilderState'>> & { visualBuilderState?: Partial<VisualBuilderComponentState> }): ComponentItem[] => {
    let hasChanges = false;

    const newComponents = components.map(component => {
      if (component.id === targetId) {
        // EMERGENCY FIX: wouldComponentChange is blocking all updates!
        // Temporarily disable this check to restore functionality
        // EMERGENCY FIX: wouldComponentChange was blocking all updates

        // NEW: Handle both old and new prop structures during migration
        const { visualBuilderState: updatedVisualBuilderState, ...otherUpdates } = updates;
        let updatedComponent: ComponentItem = { ...component, ...otherUpdates };

        // Update legacy props if provided (for backward compatibility)
        if (updates.props) {
          if (component.props) {
            updatedComponent.props = { ...component.props, ...updates.props };
          } else {
            updatedComponent.props = updates.props;
          }

          // Check if columns prop was updated for GridLayout components and set tracking flag
          if (component.type === 'GridLayout' && 'columns' in updates.props) {
            if (!updatedComponent.visualBuilderState) {
              updatedComponent.visualBuilderState = {
                isSelected: false,
                isLocked: false,
                isHidden: false,
                lastModified: Date.now(),
                hasUserSetColumns: true
              };
            } else {
              updatedComponent.visualBuilderState = {
                ...updatedComponent.visualBuilderState,
                hasUserSetColumns: true,
                lastModified: Date.now()
              };
            }
          }
        }

        // Update new public props structure
        if (updates.publicProps) {
          updatedComponent.publicProps = {
            ...component.publicProps,
            ...updates.publicProps
          };

          // Check if columns prop was updated for GridLayout components and set tracking flag
          if (component.type === 'GridLayout' && 'columns' in updates.publicProps) {
            if (!updatedComponent.visualBuilderState) {
              updatedComponent.visualBuilderState = {
                isSelected: false,
                isLocked: false,
                isHidden: false,
                lastModified: Date.now(),
                hasUserSetColumns: true
              };
            } else {
              updatedComponent.visualBuilderState = {
                ...updatedComponent.visualBuilderState,
                hasUserSetColumns: true,
                lastModified: Date.now()
              };
            }
          }
        }

        // Update visual builder state
        if (updatedVisualBuilderState) {
          updatedComponent.visualBuilderState = {
            ...component.visualBuilderState,
            ...updatedVisualBuilderState,
            // ROOT CAUSE FIX: Don't update lastModified on every property change
            // This was causing the component hash to change even when data didn't
            // Only update lastModified if explicitly provided in updates
            ...(updatedVisualBuilderState.lastModified !== undefined
              ? { lastModified: updatedVisualBuilderState.lastModified }
              : {})
          };
        }

        hasChanges = true;
        return updatedComponent;
      }

      // If this component has children, recursively search and update them
      if (component.children && component.children.length > 0) {
        const updatedChildren = updateComponentRecursively(component.children, targetId, updates);

        // Only create new parent component if children actually changed
        if (updatedChildren !== component.children) {
          hasChanges = true;
          return {
            ...component,
            children: updatedChildren
          };
        }
      }

      return component;
    });

    // Return original array if no changes occurred to maintain reference equality
    return hasChanges ? newComponents : components;
  };

  // Update component with any properties (handles both parents and children)
  const updateComponent = useCallback((id: string, updates: Partial<ComponentItem>) => {
    setPlacedComponents(prev => {
      const newComponents = updateComponentRecursively(prev, id, updates);
      return newComponents;
    });
  }, []);

  const updateComponentPosition = useCallback((id: string, position: { x: number; y: number }) => {
    // Use functional update to avoid dependency conflicts
    setPlacedComponents(prevComponents => {
      return prevComponents.map(comp =>
        comp.id === id ? { ...comp, position } : comp
      );
    });
  }, []); // No dependencies

  const updateComponentGridPosition = useCallback((id: string, gridPosition: { column: number; span: number; row: number }) => {
    setPlacedComponents(prevComponents => {
      return prevComponents.map(comp =>
        comp.id === id ? { ...comp, gridPosition } : comp
      );
    });
  }, []);

  // PHASE 4.2: Breakpoint-aware position update for drag/drop
  const updatePositionForActiveBreakpoint = useCallback((
    id: string,
    position: { x: number; y: number },
    activeBreakpoint: 'desktop' | 'tablet' | 'mobile'
  ) => {
    setPlacedComponents(prevComponents => {
      return prevComponents.map(comp => {
        if (comp.id === id) {
          if (activeBreakpoint === 'desktop') {
            // Update desktop position
            return { ...comp, position };
          } else {
            // Update responsive position for tablet/mobile
            const currentSize = comp.visualBuilderState?.size || { width: 200, height: 100 };
            return {
              ...comp,
              responsivePositions: {
                ...comp.responsivePositions,
                [activeBreakpoint]: {
                  x: position.x,
                  y: position.y,
                  width: currentSize.width,
                  height: currentSize.height
                }
              }
            };
          }
        }
        return comp;
      });
    });
  }, []);

  // Enhanced grid configuration with responsive support
  const setGridConfig = useCallback((config: Partial<GridConfig>) => {
    setGridConfigState(prev => {
      const updated = { ...prev, ...config };

      // Update breakpoint if responsive mode is enabled
      if (updated.responsiveMode && !config.currentBreakpoint) {
        const currentBreakpoint = getCurrentBreakpoint();
        updated.currentBreakpoint = currentBreakpoint;
        updated.columns = currentBreakpoint.columns;
        updated.gap = currentBreakpoint.gap;
        updated.rowHeight = currentBreakpoint.rowHeight;

      }

      return updated;
    });
  }, []);

  // Add window resize listener for responsive grid updates
  React.useEffect(() => {
    if (!gridConfig.responsiveMode) return;

    const handleResize = () => {
      const newBreakpoint = getCurrentBreakpoint();
      if (newBreakpoint.name !== gridConfig.currentBreakpoint.name) {
        setGridConfig({
          currentBreakpoint: newBreakpoint,
          columns: newBreakpoint.columns,
          gap: newBreakpoint.gap,
          rowHeight: newBreakpoint.rowHeight
        });
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [gridConfig.currentBreakpoint.name, gridConfig.responsiveMode, setGridConfig]);

  // Selection operations
  const selectComponent = useCallback((id: string, multi = false) => {
    if (multi) {
      setSelectedComponentIds(prev => {
        const newSet = new Set(prev);
        if (newSet.has(id)) {
          newSet.delete(id);
        } else {
          newSet.add(id);
        }
        return newSet;
      });
    } else {
      setSelectedComponentIds(new Set([id]));
    }
  }, [selectedComponentIds]);

  const clearSelection = useCallback(() => {
    setSelectedComponentIds(new Set());
  }, []);

  const removeSelected = useCallback(() => {
    // Use functional update to avoid conflicts
    setPlacedComponents(prevComponents => {
      const updatedComponents = prevComponents.filter(comp => !selectedComponentIds.has(comp.id));
      return updatedComponents;
    });
    setSelectedComponentIds(new Set());
  }, [selectedComponentIds]); // Only depend on selectedComponentIds

  // Drag and drop (pixel homes style)
  const startDrag = useCallback((component: ComponentItem) => {
    setDraggedComponent(component);
    setIsDragging(true);
  }, []);

  const endDrag = useCallback(() => {
    setDraggedComponent(null);
    setIsDragging(false);
    setPreviewPosition(null);
    // Temporarily disable history saving to fix conflicts
  }, []);

  // History operations - temporarily disabled to fix state conflicts
  const undo = useCallback(() => {
    // TODO: Re-implement after fixing core state management
  }, []);

  const redo = useCallback(() => {
    // TODO: Re-implement after fixing core state management
  }, []);

  const canUndo = useMemo(() => history.past.length > 0, [history.past.length]);
  const canRedo = useMemo(() => history.future.length > 0, [history.future.length]);

  // Canvas operations
  const resetCanvas = useCallback(() => {
    setPlacedComponents([]);
    setSelectedComponentIds(new Set());
    setComponentGroups([]);
    setSelectedGroupId(null);
  }, []);

  // Generate a random color for groups
  const generateGroupColor = useCallback(() => {
    const colors = [
      '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
      '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }, []);

  // Component grouping operations
  const createGroup = useCallback((name: string, componentIds: string[], color?: string) => {
    const groupId = `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newGroup: ComponentGroup = {
      id: groupId,
      name: name || `Group ${componentGroups.length + 1}`,
      color: color || generateGroupColor(),
      componentIds: [...componentIds],
      locked: false,
      visible: true,
      createdAt: Date.now()
    };

    // Add the group
    setComponentGroups(prev => [...prev, newGroup]);

    // Update components to reference the group
    setPlacedComponents(prev => prev.map(comp =>
      componentIds.includes(comp.id)
        ? { ...comp, groupId }
        : comp
    ));

    // Select the new group
    setSelectedGroupId(groupId);
  }, [componentGroups.length, generateGroupColor]);

  const updateGroup = useCallback((groupId: string, updates: Partial<ComponentGroup>) => {
    setComponentGroups(prev => prev.map(group =>
      group.id === groupId
        ? { ...group, ...updates }
        : group
    ));
  }, []);

  const deleteGroup = useCallback((groupId: string) => {
    // Remove group reference from components
    setPlacedComponents(prev => prev.map(comp =>
      comp.visualBuilderState?.groupId === groupId
        ? { ...comp, visualBuilderState: { ...comp.visualBuilderState, groupId: undefined } }
        : comp
    ));

    // Remove the group
    setComponentGroups(prev => prev.filter(group => group.id !== groupId));

    // Clear selection if this group was selected
    if (selectedGroupId === groupId) {
      setSelectedGroupId(null);
    }
  }, [selectedGroupId]);

  const addComponentsToGroup = useCallback((groupId: string, componentIds: string[]) => {
    // Update group to include new components
    setComponentGroups(prev => prev.map(group => {
      if (group.id === groupId) {
        const uniqueIds = Array.from(new Set([...group.componentIds, ...componentIds]));
        return { ...group, componentIds: uniqueIds };
      }
      return group;
    }));

    // Update components to reference the group
    setPlacedComponents(prev => prev.map(comp =>
      componentIds.includes(comp.id)
        ? { ...comp, groupId }
        : comp
    ));
  }, []);

  const removeComponentsFromGroup = useCallback((componentIds: string[]) => {
    // Remove components from their groups
    setPlacedComponents(prev => prev.map(comp =>
      componentIds.includes(comp.id)
        ? { ...comp, groupId: undefined }
        : comp
    ));

    // Update groups to remove these components
    setComponentGroups(prev => prev.map(group => ({
      ...group,
      componentIds: group.componentIds.filter(id => !componentIds.includes(id))
    })).filter(group => group.componentIds.length > 0)); // Remove empty groups
  }, []);

  const selectGroup = useCallback((groupId: string) => {
    setSelectedGroupId(groupId);

    // Select all components in the group
    const group = componentGroups.find(g => g.id === groupId);
    if (group) {
      setSelectedComponentIds(new Set(group.componentIds));
    }
  }, [componentGroups]);

  const ungroupComponents = useCallback((groupId: string) => {
    deleteGroup(groupId);
  }, [deleteGroup]);

  const getGroupedComponents = useCallback((groupId: string): ComponentItem[] => {
    const group = componentGroups.find(g => g.id === groupId);
    if (!group) return [];

    return placedComponents.filter(comp => group.componentIds.includes(comp.id));
  }, [componentGroups, placedComponents]);

  const getComponentGroup = useCallback((componentId: string): ComponentGroup | undefined => {
    const component = placedComponents.find(comp => comp.id === componentId);
    if (!component?.visualBuilderState?.groupId) return undefined;

    return componentGroups.find(group => group.id === component.visualBuilderState.groupId);
  }, [placedComponents, componentGroups]);

  // Child component management methods
  const addChildComponent = useCallback((parentId: string, child: ComponentItem) => {
    setPlacedComponents(prev => {
      return prev.map(component => {
        if (component.id === parentId) {
          const currentChildren = component.children || [];
          return {
            ...component,
            children: [...currentChildren, child]
          };
        }
        return component;
      });
    });
  }, []);

  const removeChildComponent = useCallback((parentId: string, childId: string) => {
    setPlacedComponents(prev => {
      return prev.map(component => {
        if (component.id === parentId && component.children) {
          return {
            ...component,
            children: component.children.filter(child => child.id !== childId)
          };
        }
        return component;
      });
    });
  }, []);

  const updateChildComponent = useCallback((parentId: string, childId: string, updates: Partial<ComponentItem>) => {
    setPlacedComponents(prev => {
      return prev.map(component => {
        if (component.id === parentId && component.children) {
          return {
            ...component,
            children: component.children.map(child => {
              if (child.id === childId) {
                // Handle props merging for child components too
                if (updates.props && child.props) {
                  return {
                    ...child,
                    ...updates,
                    props: { ...child.props, ...updates.props }
                  };
                } else {
                  return { ...child, ...updates };
                }
              }
              return child;
            })
          };
        }
        return component;
      });
    });
  }, []);

  const reorderChildren = useCallback((parentId: string, fromIndex: number, toIndex: number) => {
    setPlacedComponents(prev => {
      return prev.map(component => {
        if (component.id === parentId && component.children) {
          const newChildren = [...component.children];
          const [removed] = newChildren.splice(fromIndex, 1);
          newChildren.splice(toIndex, 0, removed);
          return {
            ...component,
            children: newChildren
          };
        }
        return component;
      });
    });
  }, []);

  // Move child component out of container to become standalone component
  const moveChildToCanvas = useCallback((parentId: string, childId: string, position: { x: number; y: number }) => {
    setPlacedComponents(prev => {
      let childToMove: ComponentItem | null = null;

      // First, remove child from parent and get the child component
      const updatedComponents = prev.map(component => {
        if (component.id === parentId && component.children) {
          const childIndex = component.children.findIndex(child => child.id === childId);
          if (childIndex !== -1) {
            childToMove = { ...component.children[childIndex] };
            return {
              ...component,
              children: component.children.filter(child => child.id !== childId)
            };
          }
        }
        return component;
      });

      // Then add the child as a standalone component with new position
      if (childToMove) {
        const standaloneComponent: ComponentItem = {
          ...(childToMove as ComponentItem),
          position,
          positioningMode: 'absolute', // Convert to absolute positioning when moved to canvas
        };

        return [...updatedComponents, standaloneComponent];
      }

      return updatedComponents;
    });
  }, []);

  // Resize operations
  const updateComponentSize = useCallback((id: string, size: { width: number; height: number }) => {
    setPlacedComponents(prev => {
      return updateComponentRecursively(prev, id, {
        // NEW: Update visual builder state for size
        visualBuilderState: {
          isSelected: false, // Will be merged with existing state
          isLocked: false,
          isHidden: false,
          lastModified: Date.now(),
          size: {
            width: size.width,
            height: size.height
          }
        },
        // Keep legacy props for backward compatibility
        props: {
          _size: {
            width: size.width,
            height: size.height
          }
        }
      });
    });
  }, []);

  const updateComponentGridSpan = useCallback((id: string, span: number) => {
    setPlacedComponents(prev => {
      return prev.map(component => {
        if (component.id === id && component.gridPosition) {
          return {
            ...component,
            gridPosition: {
              ...component.gridPosition,
              span
            }
          };
        }
        return component;
      });
    });
  }, []);

  const resizeComponent = useCallback((
    id: string,
    size: { width: number; height: number },
    position?: { x: number; y: number }
  ) => {
    setPlacedComponents(prev => {
      return updateComponentRecursively(prev, id, {
        visualBuilderState: {
          size: {
            width: size.width,
            height: size.height
          }
        },
        // DEPRECATED: Also update props for backward compatibility
        props: {
          _size: {
            width: size.width,
            height: size.height
          }
        },
        ...(position && { position })
      });
    });
  }, []);

  // NEW: Responsive positioning operations
  const updateResponsivePosition = useCallback((id: string, breakpoint: 'tablet' | 'mobile', position: ResponsivePositionData) => {
    setPlacedComponents(prev => prev.map(comp => {
      if (comp.id === id) {
        return {
          ...comp,
          responsivePositions: {
            ...comp.responsivePositions,
            [breakpoint]: position
          }
        };
      }
      return comp;
    }));
  }, []);

  const getEffectivePosition = useCallback((component: ComponentItem, breakpoint: 'desktop' | 'tablet' | 'mobile'): { x: number; y: number; width: number; height: number } => {
    // Desktop always uses the main position
    if (breakpoint === 'desktop') {
      return {
        x: component.position.x,
        y: component.position.y,
        width: component.visualBuilderState.size?.width || 200,
        height: component.visualBuilderState.size?.height || 100
      };
    }

    // Tablet/mobile: use responsive position if set, otherwise fall back to desktop
    const responsivePos = component.responsivePositions?.[breakpoint];
    if (responsivePos) {
      return responsivePos;
    }

    // Fallback to desktop position
    return {
      x: component.position.x,
      y: component.position.y,
      width: component.visualBuilderState.size?.width || 200,
      height: component.visualBuilderState.size?.height || 100
    };
  }, []);

  const copyPositionToBreakpoint = useCallback((id: string, fromBreakpoint: 'desktop' | 'tablet' | 'mobile', toBreakpoint: 'tablet' | 'mobile') => {
    setPlacedComponents(prev => prev.map(comp => {
      if (comp.id === id) {
        const sourcePosition = getEffectivePosition(comp, fromBreakpoint);
        return {
          ...comp,
          responsivePositions: {
            ...comp.responsivePositions,
            [toBreakpoint]: sourcePosition
          }
        };
      }
      return comp;
    }));
  }, [getEffectivePosition]);

  return {
    // State
    placedComponents,
    selectedComponentIds,
    draggedComponent,
    isDragging,
    previewPosition,

    // Component groups state
    componentGroups,
    selectedGroupId,

    // Grid configuration
    gridConfig,
    setGridConfig,
    positioningMode,
    setPositioningMode,

    // Global settings
    globalSettings,
    setGlobalSettings,

    // Operations
    addComponent,
    removeComponent,
    updateComponent,
    updateComponentPosition,
    updateComponentGridPosition,
    updatePositionForActiveBreakpoint,

    // Resize operations
    updateComponentSize,
    updateComponentGridSpan,
    resizeComponent,

    // Responsive positioning operations
    updateResponsivePosition,
    getEffectivePosition,
    copyPositionToBreakpoint,

    // Child management
    addChildComponent,
    removeChildComponent,
    updateChildComponent,
    reorderChildren,
    moveChildToCanvas,

    // Selection
    selectComponent,
    clearSelection,
    removeSelected,

    // Component grouping operations
    createGroup,
    updateGroup,
    deleteGroup,
    addComponentsToGroup,
    removeComponentsFromGroup,
    selectGroup,
    ungroupComponents,
    getGroupedComponents,
    getComponentGroup,

    // Drag and drop
    startDrag,
    setPreviewPosition,
    endDrag,

    // Grid utilities
    pixelToGrid,
    gridToPixel,
    snapToGrid,

    // History
    undo,
    redo,
    canUndo,
    canRedo,

    // Canvas
    resetCanvas,

    // NEW: Component prop migration utilities
    migrateComponentProps: migrateComponentToNewFormat,
    ensureComponentPropsStructure: ensureComponentHasPropsStructure,
  };
}