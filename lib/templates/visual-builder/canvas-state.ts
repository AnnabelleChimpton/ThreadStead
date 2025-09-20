/**
 * VISUAL_BUILDER_PROGRESS: Canvas state management
 * Phase 1: Visual Builder Foundation - State Management
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  CanvasState,
  CanvasComponent,
  CanvasAction,
  CanvasSnapshot,
  DragState,
  Viewport,
  HistoryState,
} from './types';
import {
  DEFAULT_CANVAS_SETTINGS,
  DEFAULT_VIEWPORT,
  HISTORY,
  CANVAS_CONSTRAINTS,
} from './constants';

/**
 * Generate a unique ID for components
 */
export function generateComponentId(): string {
  return `comp_${uuidv4().substring(0, 8)}`;
}

/**
 * Create an empty canvas state
 */
export function createEmptyCanvasState(): CanvasState {
  return {
    components: [],
    selectedIds: [],
    hoveredId: null,
    dragState: null,
    viewport: DEFAULT_VIEWPORT,
    history: createEmptyHistory(),
    settings: DEFAULT_CANVAS_SETTINGS,
  };
}

/**
 * Create empty history state
 */
function createEmptyHistory(): HistoryState {
  return {
    past: [],
    present: {
      components: [],
      timestamp: Date.now(),
      description: 'Initial state',
    },
    future: [],
    maxHistorySize: HISTORY.MAX_HISTORY_SIZE,
  };
}

/**
 * Canvas state reducer for managing state updates
 */
export function canvasReducer(state: CanvasState, action: CanvasAction): CanvasState {
  switch (action.type) {
    case 'ADD_COMPONENT':
      return addComponent(state, action.payload.component, action.payload.parentId);

    case 'REMOVE_COMPONENT':
      return removeComponent(state, action.payload.id);

    case 'UPDATE_COMPONENT':
      return updateComponent(state, action.payload.id, action.payload.props);

    case 'MOVE_COMPONENT':
      return moveComponent(
        state,
        action.payload.id,
        action.payload.newParentId,
        action.payload.newIndex
      );

    case 'SELECT_COMPONENT':
      return selectComponent(state, action.payload.id, action.payload.multi);

    case 'CLEAR_SELECTION':
      return { ...state, selectedIds: [] };

    case 'SET_DRAG_STATE':
      return { ...state, dragState: { ...state.dragState, ...action.payload } as DragState };

    case 'SET_VIEWPORT':
      return { ...state, viewport: { ...state.viewport, ...action.payload } };

    case 'UNDO':
      return undo(state);

    case 'REDO':
      return redo(state);

    case 'RESET_CANVAS':
      return createEmptyCanvasState();

    case 'LOAD_TEMPLATE':
      return loadTemplate(state, action.payload.components);

    default:
      return state;
  }
}

/**
 * Add a component to the canvas
 */
function addComponent(
  state: CanvasState,
  component: CanvasComponent,
  parentId?: string
): CanvasState {
  console.log('🔧 [REDUCER] addComponent called:', {
    componentType: component.type,
    componentId: component.id,
    parentId,
    currentComponentCount: state.components.length,
    totalComponents: countComponents(state.components)
  });

  // Check max components limit
  const totalComponents = countComponents(state.components);
  if (totalComponents >= CANVAS_CONSTRAINTS.MAX_COMPONENTS) {
    console.warn('🚨 [REDUCER] Maximum number of components reached:', CANVAS_CONSTRAINTS.MAX_COMPONENTS);
    return state;
  }

  // Ensure component has an ID
  if (!component.id) {
    component = { ...component, id: generateComponentId() };
    console.log('🔧 [REDUCER] Generated ID for component:', component.id);
  }

  let newComponents: CanvasComponent[];

  if (parentId) {
    console.log('🔧 [REDUCER] Adding component as child to parent:', parentId);
    // Add as child to parent component
    newComponents = addComponentToParent(state.components, component, parentId);
  } else {
    console.log('🔧 [REDUCER] Adding component to root level');
    // Add to root level
    newComponents = [...state.components, component];
  }

  console.log('🔧 [REDUCER] Component added successfully. New count:', newComponents.length);
  console.log('🔧 [REDUCER] All components:', newComponents.map(c => ({ type: c.type, id: c.id })));

  return {
    ...state,
    components: newComponents,
    selectedIds: [component.id],
    history: pushToHistory(state.history, newComponents, `Added ${component.type}`),
  };
}

/**
 * Remove a component from the canvas
 */
function removeComponent(state: CanvasState, id: string): CanvasState {
  const newComponents = removeComponentRecursive(state.components, id);

  return {
    ...state,
    components: newComponents,
    selectedIds: state.selectedIds.filter(selectedId => selectedId !== id),
    hoveredId: state.hoveredId === id ? null : state.hoveredId,
    history: pushToHistory(state.history, newComponents, `Removed component`),
  };
}

/**
 * Update a component's properties
 */
function updateComponent(
  state: CanvasState,
  id: string,
  props: Partial<CanvasComponent>
): CanvasState {
  const newComponents = updateComponentRecursive(state.components, id, props);

  return {
    ...state,
    components: newComponents,
    history: pushToHistory(state.history, newComponents, `Updated component`),
  };
}

/**
 * Move a component to a new parent or position
 */
function moveComponent(
  state: CanvasState,
  id: string,
  newParentId?: string,
  newIndex?: number
): CanvasState {
  // First, find and remove the component
  let component: CanvasComponent | null = null;
  const componentsWithoutTarget = removeComponentRecursive(state.components, id, (removed) => {
    component = removed;
  });

  if (!component) {
    console.warn(`Component ${id} not found`);
    return state;
  }

  // Then add it to the new location
  let newComponents: CanvasComponent[];
  if (newParentId) {
    newComponents = addComponentToParent(componentsWithoutTarget, component, newParentId, newIndex);
  } else {
    // Add to root at specified index
    if (newIndex !== undefined && newIndex >= 0) {
      newComponents = [
        ...componentsWithoutTarget.slice(0, newIndex),
        component,
        ...componentsWithoutTarget.slice(newIndex),
      ];
    } else {
      newComponents = [...componentsWithoutTarget, component];
    }
  }

  return {
    ...state,
    components: newComponents,
    history: pushToHistory(state.history, newComponents, `Moved component`),
  };
}

/**
 * Select a component
 */
function selectComponent(state: CanvasState, id: string, multi?: boolean): CanvasState {
  let selectedIds: string[];

  if (multi) {
    // Toggle selection in multi-select mode
    if (state.selectedIds.includes(id)) {
      selectedIds = state.selectedIds.filter(selectedId => selectedId !== id);
    } else {
      selectedIds = [...state.selectedIds, id];
    }
  } else {
    // Single selection
    selectedIds = [id];
  }

  return { ...state, selectedIds };
}

/**
 * Undo last action
 */
function undo(state: CanvasState): CanvasState {
  const { past, present, future } = state.history;

  if (past.length === 0) {
    return state;
  }

  const previous = past[past.length - 1];
  const newPast = past.slice(0, past.length - 1);

  return {
    ...state,
    components: previous.components,
    history: {
      ...state.history,
      past: newPast,
      present: previous,
      future: [present, ...future].slice(0, HISTORY.MAX_HISTORY_SIZE),
    },
  };
}

/**
 * Redo last undone action
 */
function redo(state: CanvasState): CanvasState {
  const { past, present, future } = state.history;

  if (future.length === 0) {
    return state;
  }

  const next = future[0];
  const newFuture = future.slice(1);

  return {
    ...state,
    components: next.components,
    history: {
      ...state.history,
      past: [...past, present].slice(-HISTORY.MAX_HISTORY_SIZE),
      present: next,
      future: newFuture,
    },
  };
}

/**
 * Load a template
 */
function loadTemplate(state: CanvasState, components: CanvasComponent[]): CanvasState {
  return {
    ...state,
    components,
    selectedIds: [],
    hoveredId: null,
    history: pushToHistory(state.history, components, 'Loaded template'),
  };
}

// Helper functions

/**
 * Count total components including nested ones
 */
function countComponents(components: CanvasComponent[]): number {
  return components.reduce((count, component) => {
    const childCount = component.children ? countComponents(component.children) : 0;
    return count + 1 + childCount;
  }, 0);
}

/**
 * Add a component to a parent
 */
function addComponentToParent(
  components: CanvasComponent[],
  newComponent: CanvasComponent,
  parentId: string,
  index?: number
): CanvasComponent[] {
  return components.map(component => {
    if (component.id === parentId) {
      const children = component.children || [];
      let newChildren: CanvasComponent[];

      if (index !== undefined && index >= 0 && index <= children.length) {
        newChildren = [
          ...children.slice(0, index),
          newComponent,
          ...children.slice(index),
        ];
      } else {
        newChildren = [...children, newComponent];
      }

      return { ...component, children: newChildren };
    }

    if (component.children) {
      return {
        ...component,
        children: addComponentToParent(component.children, newComponent, parentId, index),
      };
    }

    return component;
  });
}

/**
 * Remove a component recursively
 */
function removeComponentRecursive(
  components: CanvasComponent[],
  id: string,
  onRemove?: (component: CanvasComponent) => void
): CanvasComponent[] {
  return components.filter(component => {
    if (component.id === id) {
      onRemove?.(component);
      return false;
    }
    return true;
  }).map(component => {
    if (component.children) {
      return {
        ...component,
        children: removeComponentRecursive(component.children, id, onRemove),
      };
    }
    return component;
  });
}

/**
 * Update a component recursively
 */
function updateComponentRecursive(
  components: CanvasComponent[],
  id: string,
  updates: Partial<CanvasComponent>
): CanvasComponent[] {
  return components.map(component => {
    if (component.id === id) {
      return { ...component, ...updates };
    }

    if (component.children) {
      return {
        ...component,
        children: updateComponentRecursive(component.children, id, updates),
      };
    }

    return component;
  });
}

/**
 * Push state to history
 */
function pushToHistory(
  history: HistoryState,
  components: CanvasComponent[],
  description?: string
): HistoryState {
  const snapshot: CanvasSnapshot = {
    components,
    timestamp: Date.now(),
    description,
  };

  return {
    past: [...history.past, history.present].slice(-history.maxHistorySize),
    present: snapshot,
    future: [], // Clear future on new action
    maxHistorySize: history.maxHistorySize,
  };
}

/**
 * Find a component by ID
 */
export function findComponentById(
  components: CanvasComponent[],
  id: string
): CanvasComponent | null {
  for (const component of components) {
    if (component.id === id) {
      return component;
    }

    if (component.children) {
      const found = findComponentById(component.children, id);
      if (found) {
        return found;
      }
    }
  }

  return null;
}

/**
 * Get component depth in the tree
 */
export function getComponentDepth(
  components: CanvasComponent[],
  id: string,
  depth = 0
): number {
  for (const component of components) {
    if (component.id === id) {
      return depth;
    }

    if (component.children) {
      const foundDepth = getComponentDepth(component.children, id, depth + 1);
      if (foundDepth >= 0) {
        return foundDepth;
      }
    }
  }

  return -1;
}

/**
 * Check if a component can accept a child
 */
export function canAcceptChild(
  parent: CanvasComponent,
  childType: string
): boolean {
  if (!parent.constraints?.allowedChildren) {
    return true; // No restrictions
  }

  return parent.constraints.allowedChildren.includes(childType);
}

/**
 * Get all component IDs in a flat array
 */
export function getAllComponentIds(components: CanvasComponent[]): string[] {
  const ids: string[] = [];

  function collectIds(comps: CanvasComponent[]) {
    for (const component of comps) {
      ids.push(component.id);
      if (component.children) {
        collectIds(component.children);
      }
    }
  }

  collectIds(components);
  return ids;
}