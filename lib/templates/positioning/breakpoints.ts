/**
 * Breakpoint and Component Sizing Utilities
 *
 * Relocated from visual-builder/grid-utils.ts — these functions are used
 * by core profile rendering code (HTMLIslandHydration, IslandRenderers,
 * ProfileModeRenderer, positioning-utils).
 */

export interface GridBreakpoint {
  name: string;
  minWidth: number;
  columns: number;
  gap: number;
  containerPadding: number;
  rowHeight: number;
}

// Responsive breakpoints for grid system
export const GRID_BREAKPOINTS: GridBreakpoint[] = [
  { name: 'mobile', minWidth: 0, columns: 4, gap: 12, containerPadding: 16, rowHeight: 60 },
  { name: 'tablet', minWidth: 768, columns: 8, gap: 12, containerPadding: 24, rowHeight: 60 },
  { name: 'desktop', minWidth: 1024, columns: 16, gap: 12, containerPadding: 32, rowHeight: 60 }
];

/**
 * Get current breakpoint based on window width
 */
export function getCurrentBreakpoint(width: number = typeof window !== 'undefined' ? window.innerWidth : 1024): GridBreakpoint {
  const breakpoint = GRID_BREAKPOINTS
    .slice()
    .reverse()
    .find(bp => width >= bp.minWidth);

  return breakpoint || GRID_BREAKPOINTS[GRID_BREAKPOINTS.length - 1];
}

// Component sizing categories
export type ComponentSizingCategory = 'container-filler' | 'content-driven' | 'auto-size' | 'square' | 'full-width';

export const CONTAINER_FILLER_COMPONENTS = [
  'gradientbox', 'stickynote', 'retroterminal', 'polaroidframe',
  'centeredbox', 'neonborder', 'revealbox', 'floatingbadge'
];

export const CONTENT_DRIVEN_COMPONENTS = [
  'textelement', 'paragraph', 'contactcard', 'progresstracker',
  'bio', 'blogposts', 'guestbook', 'tabs', 'profilehero'
];

export const SQUARE_COMPONENTS = [
  'profilephoto', 'userimage', 'friendbadge'
];

export const AUTO_SIZE_COMPONENTS = [
  'profilephoto', 'displayname', 'followbutton', 'mutualfriends',
  'friendbadge', 'userimage', 'mediagrid'
];

export const FULL_WIDTH_COMPONENTS = [
  'threadsteadnavigation'
];

/**
 * Get the sizing category for a component type
 */
export function getComponentSizingCategory(componentType: string): ComponentSizingCategory {
  const normalizedType = componentType.toLowerCase();

  if (FULL_WIDTH_COMPONENTS.includes(normalizedType)) {
    return 'full-width';
  }

  if (CONTAINER_FILLER_COMPONENTS.includes(normalizedType)) {
    return 'container-filler';
  }

  if (CONTENT_DRIVEN_COMPONENTS.includes(normalizedType)) {
    return 'content-driven';
  }

  if (SQUARE_COMPONENTS.includes(normalizedType)) {
    return 'square';
  }

  if (AUTO_SIZE_COMPONENTS.includes(normalizedType)) {
    return 'auto-size';
  }

  return 'auto-size';
}
