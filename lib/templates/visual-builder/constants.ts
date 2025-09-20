/**
 * VISUAL_BUILDER_PROGRESS: Constants and default values
 * Phase 1: Visual Builder Foundation - Constants
 */

import type {
  CanvasSettings,
  Viewport,
  ComponentCategoryType,
  ComponentCategory,
  GridSystem,
  PositioningMode
} from './types';

// Grid System Defaults
export const DEFAULT_GRID_SYSTEM: GridSystem = {
  columns: 12,              // 12-column grid system
  rows: 20,                 // Start with 20 rows (auto-expanding)
  cellSize: {
    width: 80,              // 80px cell width (960px / 12 = 80px)
    height: 60,             // 60px cell height for good proportions
  },
  gap: 16,                  // 16px gap between cells
  snapThreshold: 30,        // 30px threshold for snapping (increased for better feel)
  showGrid: true,           // Show grid overlay by default
};

// Canvas Settings Defaults
export const DEFAULT_CANVAS_SETTINGS: CanvasSettings = {
  // Legacy grid settings
  showGrid: true,
  gridSize: 10,
  snapToGrid: true,

  // Visual helpers
  showRulers: true,
  showOutlines: false,
  responsive: 'desktop',

  // New grid system
  gridSystem: DEFAULT_GRID_SYSTEM,
  positioningMode: 'grid', // Default to grid positioning
};

// Viewport Defaults
export const DEFAULT_VIEWPORT: Viewport = {
  zoom: 1,
  scrollX: 0,
  scrollY: 0,
  width: 1200,
  height: 800,
};

// Viewport Constraints
export const VIEWPORT_CONSTRAINTS = {
  MIN_ZOOM: 0.25,
  MAX_ZOOM: 2,
  ZOOM_STEP: 0.1,
  ZOOM_PRESETS: [0.5, 0.75, 1, 1.25, 1.5, 2],
} as const;

// Responsive Breakpoints
export const RESPONSIVE_BREAKPOINTS = {
  mobile: { width: 375, height: 667 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1200, height: 800 },
} as const;

// Grid Settings
export const GRID_SETTINGS = {
  SIZES: [5, 10, 20, 50],
  DEFAULT_SIZE: 10,
  COLOR_LIGHT: 'rgba(0, 0, 0, 0.1)',
  COLOR_DARK: 'rgba(255, 255, 255, 0.1)',
} as const;

// Grid System Constants
export const GRID_CONSTANTS = {
  // Grid layout constants
  MIN_COLUMN_SPAN: 1,
  MAX_COLUMN_SPAN: 12,
  MIN_ROW_SPAN: 1,
  MAX_ROW_SPAN: 4,

  // Snap behavior
  SNAP_ZONES: {
    COLUMN: 0.4,     // Snap to column if within 40% of cell width (increased for easier snapping)
    ROW: 0.4,        // Snap to row if within 40% of cell height (increased for easier snapping)
  },

  // Visual feedback
  GRID_COLORS: {
    MAIN_LINE: 'rgba(59, 130, 246, 0.3)',      // Blue grid lines
    SUB_LINE: 'rgba(156, 163, 175, 0.2)',      // Gray sub-lines
    SNAP_ZONE: 'rgba(34, 197, 94, 0.4)',       // Green snap zones
    ACTIVE_CELL: 'rgba(59, 130, 246, 0.1)',    // Blue active cell
  },

  // Grid cell calculations
  TOTAL_WIDTH: 960,  // 12 * 80px = 960px base canvas width
  TOTAL_GAP: 176,    // 11 gaps * 16px = 176px
} as const;

// Component Categories
export const COMPONENT_CATEGORIES: Record<ComponentCategoryType, ComponentCategory> = {
  content: {
    id: 'content',
    name: 'Content',
    icon: '📝',
    components: [],
  },
  layout: {
    id: 'layout',
    name: 'Layout',
    icon: '📐',
    components: [],
  },
  interactive: {
    id: 'interactive',
    name: 'Interactive',
    icon: '🎮',
    components: [],
  },
  visual: {
    id: 'visual',
    name: 'Visual Effects',
    icon: '✨',
    components: [],
  },
  data: {
    id: 'data',
    name: 'Data Display',
    icon: '📊',
    components: [],
  },
  conditional: {
    id: 'conditional',
    name: 'Conditional',
    icon: '🔀',
    components: [],
  },
  advanced: {
    id: 'advanced',
    name: 'Advanced',
    icon: '⚙️',
    components: [],
  },
};

// Component Category Mapping (maps component types to categories)
export const COMPONENT_CATEGORY_MAP: Record<string, ComponentCategoryType> = {
  // Content
  'ProfilePhoto': 'content',
  'DisplayName': 'content',
  'Bio': 'content',
  'BlogPosts': 'content',
  'Guestbook': 'content',
  'ProfileBadges': 'content',
  'MediaGrid': 'content',
  'WebsiteDisplay': 'content',
  'UserImage': 'content',

  // Layout
  'FlexContainer': 'layout',
  'GridLayout': 'layout',
  'SplitLayout': 'layout',
  'CenteredBox': 'layout',
  'ProfileHeader': 'layout',
  'ProfileHero': 'layout',

  // Interactive
  'Tabs': 'interactive',
  'Tab': 'interactive',
  'RevealBox': 'interactive',
  'FollowButton': 'interactive',
  'ImageCarousel': 'interactive',
  'CarouselImage': 'interactive',

  // Visual Effects
  'GradientBox': 'visual',
  'NeonBorder': 'visual',
  'RetroTerminal': 'visual',
  'PolaroidFrame': 'visual',
  'StickyNote': 'visual',
  'FloatingBadge': 'visual',
  'WaveText': 'visual',
  'GlitchText': 'visual',
  'RetroCard': 'visual',

  // Data Display
  'ProgressTracker': 'data',
  'ProgressItem': 'data',
  'ContactCard': 'data',
  'ContactMethod': 'data',
  'SkillChart': 'data',
  'Skill': 'data',
  'FriendDisplay': 'data',
  'MutualFriends': 'data',
  'FriendBadge': 'data',

  // Conditional
  'Show': 'conditional',
  'Choose': 'conditional',
  'When': 'conditional',
  'Otherwise': 'conditional',
  'IfOwner': 'conditional',
  'IfVisitor': 'conditional',

  // Advanced (add more as needed)
  'NotificationCenter': 'advanced',
  'NotificationBell': 'advanced',
};

// Drag and Drop
export const DRAG_DROP = {
  DRAG_THRESHOLD: 5, // pixels before drag starts
  DROP_ZONE_PADDING: 10,
  DROP_ZONE_MIN_HEIGHT: 50,
  DRAG_PREVIEW_OPACITY: 0.8,
  DROP_INDICATOR_COLOR: '#4A90E2',
  INVALID_DROP_COLOR: '#E74C3C',
} as const;

// Selection
export const SELECTION = {
  OUTLINE_COLOR: '#4A90E2',
  OUTLINE_WIDTH: 2,
  HANDLE_SIZE: 8,
  HANDLE_COLOR: '#FFFFFF',
  HANDLE_BORDER: '#4A90E2',
  MULTI_SELECT_COLOR: 'rgba(74, 144, 226, 0.2)',
} as const;

// Property Panel
export const PROPERTY_PANEL = {
  WIDTH: 300,
  SECTION_SPACING: 20,
  FIELD_SPACING: 12,
  LABEL_WIDTH: 100,
} as const;

// Component Palette
export const COMPONENT_PALETTE = {
  WIDTH: 250,
  CARD_HEIGHT: 80,
  CARD_SPACING: 8,
  SEARCH_DEBOUNCE: 300,
  MAX_RECENT: 10,
  MAX_FAVORITES: 20,
} as const;

// History
export const HISTORY = {
  MAX_HISTORY_SIZE: 50,
  DEBOUNCE_TIME: 500, // ms before creating history entry
} as const;

// Auto Save
export const AUTO_SAVE = {
  DEFAULT_ENABLED: true,
  DEFAULT_INTERVAL: 30000, // 30 seconds
  MIN_INTERVAL: 5000, // 5 seconds
  MAX_INTERVAL: 300000, // 5 minutes
} as const;

// Canvas Constraints
export const CANVAS_CONSTRAINTS = {
  MIN_WIDTH: 320,
  MIN_HEIGHT: 200,
  MAX_WIDTH: 1920,
  MAX_HEIGHT: 10000,
  MAX_COMPONENTS: 500,
  MAX_NESTING_DEPTH: 10,
} as const;

// Component Defaults
export const COMPONENT_DEFAULTS = {
  MIN_WIDTH: 50,
  MIN_HEIGHT: 30,
  DEFAULT_WIDTH: 200,
  DEFAULT_HEIGHT: 100,
  PADDING: 10,
} as const;

// HTML Generation
export const HTML_GENERATION = {
  DEFAULT_INDENT: 2,
  DEFAULT_INDENT_CHAR: ' ',
  MAX_LINE_LENGTH: 120,
} as const;

// Keyboard Shortcuts
export const KEYBOARD_SHORTCUTS = {
  UNDO: 'ctrl+z',
  REDO: 'ctrl+y',
  DELETE: 'delete',
  DUPLICATE: 'ctrl+d',
  SELECT_ALL: 'ctrl+a',
  COPY: 'ctrl+c',
  PASTE: 'ctrl+v',
  CUT: 'ctrl+x',
  SAVE: 'ctrl+s',
  TOGGLE_GRID: 'ctrl+g',
  TOGGLE_RULERS: 'ctrl+r',
  ZOOM_IN: 'ctrl++',
  ZOOM_OUT: 'ctrl+-',
  ZOOM_RESET: 'ctrl+0',
} as const;

// Animation Durations
export const ANIMATION = {
  FAST: 150,
  NORMAL: 300,
  SLOW: 500,
} as const;

// Z-Index Layers
export const Z_INDEX = {
  CANVAS: 1,
  GRID: 2,
  COMPONENTS: 10,
  DROP_ZONES: 20,
  SELECTION: 30,
  DRAG_PREVIEW: 40,
  TOOLBAR: 50,
  PALETTE: 60,
  PROPERTY_PANEL: 60,
  MODAL: 100,
  TOOLTIP: 110,
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  COMPONENT_NOT_FOUND: 'Component not found in registry',
  INVALID_PROPS: 'Invalid component properties',
  MAX_NESTING_REACHED: 'Maximum nesting depth reached',
  MAX_COMPONENTS_REACHED: 'Maximum number of components reached',
  CIRCULAR_REFERENCE: 'Circular reference detected',
  PARSE_ERROR: 'Failed to parse template HTML',
  GENERATION_ERROR: 'Failed to generate HTML from canvas',
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  COMPONENT_ADDED: 'Component added successfully',
  COMPONENT_REMOVED: 'Component removed',
  COMPONENT_UPDATED: 'Component updated',
  TEMPLATE_SAVED: 'Template saved successfully',
  TEMPLATE_LOADED: 'Template loaded successfully',
} as const;