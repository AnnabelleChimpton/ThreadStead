/**
 * VISUAL_BUILDER_PROGRESS: Starting core type definitions
 * Phase 1: Visual Builder Foundation - Types and Interfaces
 */

import type { ComponentRegistration } from '../core/template-registry';

// Canvas Component Types
// Positioning modes
export type PositioningMode = 'absolute' | 'grid' | 'flow';

export interface CanvasComponent {
  id: string;
  type: string; // Component name from registry
  props: Record<string, unknown>;
  children?: CanvasComponent[];

  // Positioning - can be absolute coordinates OR grid position
  position?: ComponentPosition;      // Absolute positioning (legacy)
  gridPosition?: GridPosition;       // Grid-based positioning (new)
  positioningMode?: PositioningMode; // How this component is positioned

  size?: ComponentSize;
  constraints?: LayoutConstraints;
  locked?: boolean;
  hidden?: boolean;
}

export interface ComponentPosition {
  x: number;
  y: number;
  z?: number; // For layering
}

// Grid-based positioning system
export interface GridPosition {
  column: number;      // Grid column (1-based)
  row: number;        // Grid row (1-based)
  columnSpan: number; // Number of columns to span
  rowSpan: number;    // Number of rows to span
}

export interface GridSystem {
  columns: number;        // Total grid columns (e.g., 12)
  rows: number;          // Total grid rows (auto-expanding)
  cellSize: {
    width: number;       // Visual cell width in pixels
    height: number;      // Visual cell height in pixels
  };
  gap: number;           // Gap between grid cells in pixels
  snapThreshold: number; // Distance threshold for snapping
  showGrid: boolean;     // Whether to show grid overlay
}

export interface ComponentSize {
  width: number | 'auto';
  height: number | 'auto';
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
}

// Canvas State
export interface CanvasState {
  components: CanvasComponent[];
  selectedIds: string[];
  hoveredId: string | null;
  dragState: DragState | null;
  viewport: Viewport;
  history: HistoryState;
  settings: CanvasSettings;
}

export interface Viewport {
  zoom: number; // 0.5 to 2 (50% to 200%)
  scrollX: number;
  scrollY: number;
  width: number;
  height: number;
}

export interface CanvasSettings {
  // Legacy grid settings
  showGrid: boolean;
  gridSize: number;
  snapToGrid: boolean;

  // Visual helpers
  showRulers: boolean;
  showOutlines: boolean;
  responsive: ResponsiveMode;

  // New grid system
  gridSystem: GridSystem;
  positioningMode: PositioningMode; // Default positioning mode for new components
}

export type ResponsiveMode = 'desktop' | 'tablet' | 'mobile';

// Drag and Drop
export interface DragState {
  isDragging: boolean;
  draggedComponent: DraggedItem | null;
  dropTarget: DropTarget | null;
  dragOffset: { x: number; y: number };
  startPosition: { x: number; y: number };
  currentPosition?: { x: number; y: number };
}

export interface DraggedItem {
  source: 'palette' | 'canvas';
  componentType?: string; // For palette items
  componentId?: string; // For canvas items
  component?: CanvasComponent; // For moving existing components
}

export interface DropTarget {
  id: string;
  type: 'canvas' | 'component';
  accepts: string[]; // Component types that can be dropped
  position: ComponentPosition;
  size: ComponentSize;
  insertIndex?: number; // For ordered containers
}

// Drop Zones
export interface DropZone {
  id: string;
  parentId: string | null; // null for root canvas
  accepts: string[]; // Component types
  constraints: LayoutConstraints;
  bounds: DOMRect;
  isActive: boolean;
  isValid: boolean;
}

export interface LayoutConstraints {
  maxChildren?: number;
  allowedChildren?: string[]; // Component types
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  allowNesting?: boolean;
  requiresParent?: string; // Parent component type
}

// History Management
export interface HistoryState {
  past: CanvasSnapshot[];
  present: CanvasSnapshot;
  future: CanvasSnapshot[];
  maxHistorySize: number;
}

export interface CanvasSnapshot {
  components: CanvasComponent[];
  timestamp: number;
  description?: string; // e.g., "Added ProfilePhoto component"
}

// Component Palette
export interface ComponentCategory {
  id: string;
  name: string;
  icon?: string;
  components: PaletteComponent[];
}

export interface PaletteComponent {
  type: string; // Component name from registry
  name: string;
  description?: string;
  icon?: string;
  category: string;
  tags?: string[];
  defaultProps?: Record<string, unknown>;
  previewProps?: Record<string, unknown>; // Props for palette preview
  registration?: ComponentRegistration; // Reference to registry entry
}

// Property Panel
export interface PropertyPanelState {
  selectedComponent: CanvasComponent | null;
  formData: Record<string, unknown>;
  errors: Record<string, string>;
  isDirty: boolean;
}

export interface PropertyField {
  key: string;
  type: PropertyFieldType;
  label: string;
  description?: string;
  required?: boolean;
  defaultValue?: unknown;
  validation?: ValidationRule[];
  conditionalDisplay?: ConditionalRule;
  options?: PropertyFieldOption[]; // For select/radio
  min?: number; // For number type
  max?: number; // For number type
  step?: number; // For number type
  placeholder?: string;
}

export type PropertyFieldType =
  | 'text'
  | 'number'
  | 'boolean'
  | 'select'
  | 'radio'
  | 'color'
  | 'spacing'
  | 'enum'
  | 'array'
  | 'object';

export interface PropertyFieldOption {
  value: string | number | boolean;
  label: string;
  icon?: string;
}

export interface ValidationRule {
  type: 'required' | 'min' | 'max' | 'pattern' | 'custom';
  value?: unknown;
  message: string;
  validator?: (value: unknown) => boolean;
}

export interface ConditionalRule {
  field: string;
  operator: 'equals' | 'notEquals' | 'contains' | 'exists';
  value?: unknown;
}

// Canvas Actions
export type CanvasAction =
  | { type: 'ADD_COMPONENT'; payload: { component: CanvasComponent; parentId?: string } }
  | { type: 'REMOVE_COMPONENT'; payload: { id: string } }
  | { type: 'UPDATE_COMPONENT'; payload: { id: string; props: Partial<CanvasComponent> } }
  | { type: 'MOVE_COMPONENT'; payload: { id: string; newParentId?: string; newIndex?: number } }
  | { type: 'SELECT_COMPONENT'; payload: { id: string; multi?: boolean } }
  | { type: 'CLEAR_SELECTION' }
  | { type: 'SET_DRAG_STATE'; payload: Partial<DragState> }
  | { type: 'SET_VIEWPORT'; payload: Partial<Viewport> }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'RESET_CANVAS' }
  | { type: 'LOAD_TEMPLATE'; payload: { components: CanvasComponent[] } };

// Visual Builder Mode
export type EditorMode = 'visual' | 'code' | 'split';

export interface VisualBuilderState {
  mode: EditorMode;
  canvas: CanvasState;
  propertyPanel: PropertyPanelState;
  componentPalette: {
    searchQuery: string;
    selectedCategory: string | null;
    favorites: string[]; // Component types
    recent: string[]; // Component types
  };
  preferences: {
    autoSave: boolean;
    autoSaveInterval: number; // ms
    showTooltips: boolean;
    theme: 'light' | 'dark' | 'auto';
  };
}

// HTML Generation
export interface HtmlGenerationOptions {
  indent?: number;
  indentChar?: string;
  preserveComments?: boolean;
  minify?: boolean;
  includeStyles?: boolean;
}

// Template Parsing
export interface ParsedTemplate {
  components: CanvasComponent[];
  styles?: string;
  metadata?: {
    createdWith: 'visual' | 'code';
    version: string;
    lastModified?: Date;
  };
}

// Component Metadata for Visual Builder
export interface ComponentMetadata {
  type: string;
  displayName: string;
  description?: string;
  icon?: string;
  category: ComponentCategoryType;
  tags?: string[];
  isContainer?: boolean;
  allowedChildren?: string[];
  defaultChildren?: CanvasComponent[];
  previewImageUrl?: string;
  documentation?: string;
  examples?: ComponentExample[];
}

export type ComponentCategoryType =
  | 'content'
  | 'layout'
  | 'interactive'
  | 'visual'
  | 'data'
  | 'conditional'
  | 'advanced';

export interface ComponentExample {
  title: string;
  description?: string;
  props: Record<string, unknown>;
  children?: CanvasComponent[];
}

// Collaboration (future)
export interface CollaborationState {
  sessionId?: string;
  participants?: Participant[];
  cursors?: Record<string, CursorPosition>;
}

export interface Participant {
  id: string;
  name: string;
  color: string;
  isActive: boolean;
}

export interface CursorPosition {
  x: number;
  y: number;
  componentId?: string;
}

// Export all types
export type {
  ComponentRegistration
};