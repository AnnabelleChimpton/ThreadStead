// Dynamic Component Registry for Code Splitting
// Phase 1: Component Code Splitting Implementation
// Loads components on-demand rather than eagerly importing all 128+ components

import { ComponentRegistry } from './template-registry-class';
import type { ComponentRegistration } from './template-registry-types';
import React from 'react';

/**
 * Component loader map - defines how to dynamically import each component
 * Organized by category for maintainability
 */
const componentLoaders: Record<string, () => Promise<{ default: React.ComponentType<any> }>> = {
  // ========== Display Components ==========
  // Text Elements
  Heading: () => import('@/components/features/templates/Heading'),

  // Profile Components
  ProfilePhoto: () => import('@/components/features/templates/ProfilePhoto'),
  DisplayName: () => import('@/components/features/templates/DisplayName'),
  Bio: () => import('@/components/features/templates/Bio'),
  BlogPosts: () => import('@/components/features/templates/BlogPosts'),
  Guestbook: () => import('@/components/features/templates/Guestbook'),
  FollowButton: () => import('@/components/features/templates/FollowButton'),
  MutualFriends: () => import('@/components/features/templates/MutualFriends'),
  FriendBadge: () => import('@/components/features/templates/FriendBadge'),
  ProfileMusic: () => import('@/components/features/templates/ProfileMusic'),
  FriendDisplay: () => import('@/components/features/templates/FriendDisplay'),
  WebsiteDisplay: () => import('@/components/features/templates/WebsiteDisplay'),

  // Layout Components
  FlexContainer: () => import('@/components/features/templates/FlexContainer'),
  GridLayout: () => import('@/components/features/templates/GridLayout'),
  CenteredBox: () => import('@/components/features/templates/CenteredBox'),

  // Decorative Components
  PolaroidFrame: () => import('@/components/features/templates/PolaroidFrame'),
  StickyNote: () => import('@/components/features/templates/StickyNote'),
  RevealBox: () => import('@/components/features/templates/RevealBox'),

  // Text Effects

  // Tabs
  Tabs: () => import('@/components/features/templates/Tabs'),
  Tab: () => import('@/components/features/templates/Tabs').then(m => ({ default: m.Tab })),

  // Profile Features
  ProfileHero: () => import('@/components/features/templates/ProfileHero'),
  ProfileHeader: () => import('@/components/features/templates/ProfileHeader'),
  MediaGrid: () => import('@/components/features/templates/MediaGrid'),
  ProfileBadges: () => import('@/components/features/templates/ProfileBadges'),
  MyRings: () => import('@/components/features/templates/MyRings'),
  RingNav: () => import('@/components/features/templates/RingNav'),
  MyHouse: () => import('@/components/features/templates/MyHouse'),
  HouseBadge: () => import('@/components/features/templates/HouseBadge'),
  RetroCard: () => import('@/components/ui/layout/RetroCard'),
  UserImage: () => import('@/components/features/templates/UserImage'),

  // Complex Display Components
  ImageCarousel: () => import('@/components/features/templates/ImageCarousel'),
  CarouselImage: () => import('@/components/features/templates/ImageCarousel').then(m => ({ default: m.CarouselImage })),
  Embed: () => import('@/components/features/templates/Embed'),

  // Retro Components
  ArcadeButton: () => import('@/components/features/templates/ArcadeButton'),

  // Navigation

  // ========== State Components ==========
  // Debug

  // Variables
  Var: () => import('@/components/features/templates/state/Var'),
  Option: () => import('@/components/features/templates/state/Var').then(m => ({ default: m.Option })),
  ShowVar: () => import('@/components/features/templates/state/ShowVar'),

  // Interactive
  Button: () => import('@/components/features/templates/Button'),

  // Inputs
  TInput: () => import('@/components/features/templates/state/inputs/TInput'),
  Checkbox: () => import('@/components/features/templates/state/inputs/Checkbox'),
  DynamicImage: () => import('@/components/features/templates/state/DynamicImage'),
  RadioGroup: () => import('@/components/features/templates/state/inputs/RadioGroup'),
  Radio: () => import('@/components/features/templates/state/inputs/RadioGroup').then(m => ({ default: m.Radio })),
  Slider: () => import('@/components/features/templates/state/inputs/Slider'),
  Select: () => import('@/components/features/templates/state/inputs/Select'),
  ColorPicker: () => import('@/components/features/templates/state/inputs/ColorPicker'),

  // Custom HTML

  // ========== Action Components ==========
  // Basic Actions
  Set: () => import('@/components/features/templates/state/actions/Set'),
  Increment: () => import('@/components/features/templates/state/actions/Increment'),
  Decrement: () => import('@/components/features/templates/state/actions/Decrement'),
  Toggle: () => import('@/components/features/templates/state/actions/Toggle'),
  ShowToast: () => import('@/components/features/templates/state/actions/ShowToast'),

  // Array Actions
  Push: () => import('@/components/features/templates/state/actions/Push'),
  Pop: () => import('@/components/features/templates/state/actions/Pop'),
  RemoveAt: () => import('@/components/features/templates/state/actions/RemoveAt'),

  // String Actions
  Append: () => import('@/components/features/templates/state/actions/Append'),
  Prepend: () => import('@/components/features/templates/state/actions/Prepend'),

  // Other Basic Actions
  Cycle: () => import('@/components/features/templates/state/actions/Cycle'),
  Reset: () => import('@/components/features/templates/state/actions/Reset'),

  // CSS Manipulation
  AddClass: () => import('@/components/features/templates/state/actions/AddClass'),
  RemoveClass: () => import('@/components/features/templates/state/actions/RemoveClass'),
  ToggleClass: () => import('@/components/features/templates/state/actions/ToggleClass'),
  SetCSSVar: () => import('@/components/features/templates/state/actions/SetCSSVar'),

  // Utility Actions
  CopyToClipboard: () => import('@/components/features/templates/state/actions/CopyToClipboard'),
  SetURLParam: () => import('@/components/features/templates/state/actions/SetURLParam'),
  SetURLHash: () => import('@/components/features/templates/state/actions/SetURLHash'),

  // Collection Operations
  Count: () => import('@/components/features/templates/state/actions/Count'),
  Sum: () => import('@/components/features/templates/state/actions/Sum'),
  Filter: () => import('@/components/features/templates/state/actions/Filter'),
  Find: () => import('@/components/features/templates/state/actions/Find'),
  Transform: () => import('@/components/features/templates/state/actions/Transform'),
  Sort: () => import('@/components/features/templates/state/actions/Sort'),

  // Advanced State Management
  Merge: () => import('@/components/features/templates/state/actions/Merge'),
  ObjectSet: () => import('@/components/features/templates/state/actions/ObjectSet'),
  ConditionalAttr: () => import('@/components/features/templates/state/actions/ConditionalAttr'),

  // ========== Conditional Components ==========
  // Display Conditionals
  IfOwner: () => import('@/components/features/templates/conditional/IfOwner'),
  IfVisitor: () => import('@/components/features/templates/conditional/IfOwner').then(m => ({ default: m.IfVisitor })),

  // Action Conditionals
  If: () => import('@/components/features/templates/state/conditional/If'),
  ElseIf: () => import('@/components/features/templates/state/conditional/ElseIf'),
  Else: () => import('@/components/features/templates/state/conditional/Else'),

  // ========== Event & Loop Components ==========
  // Event Handlers
  OnClick: () => import('@/components/features/templates/state/events/OnClick'),
  OnChange: () => import('@/components/features/templates/state/events/OnChange'),
  OnMount: () => import('@/components/features/templates/state/events/OnMount'),
  OnInterval: () => import('@/components/features/templates/state/events/OnInterval'),
  OnMouseEnter: () => import('@/components/features/templates/state/events/OnMouseEnter'),
  OnMouseLeave: () => import('@/components/features/templates/state/events/OnMouseLeave'),
  OnSwipe: () => import('@/components/features/templates/state/events/OnSwipe'),
  OnKeyPress: () => import('@/components/features/templates/state/events/OnKeyPress'),
  OnKeyUp: () => import('@/components/features/templates/state/events/OnKeyUp'),
  OnVisible: () => import('@/components/features/templates/state/events/OnVisible'),

  // Loops
  ForEach: () => import('@/components/features/templates/state/loops/ForEach'),
  Break: () => import('@/components/features/templates/state/loops/Break'),

  // Validation
  Validate: () => import('@/components/features/templates/state/validation/Validate'),

  // Temporal Controls
  Delay: () => import('@/components/features/templates/state/temporal/Delay'),
  Sequence: () => import('@/components/features/templates/state/temporal/Sequence'),
  Step: () => import('@/components/features/templates/state/temporal/Step'),
};

/**
 * Cache for loaded components (per-session)
 * Components stay loaded after first use
 */
const loadedComponents = new Map<string, React.ComponentType<any>>();

/**
 * Performance metrics for monitoring
 */
let loadMetrics = {
  totalLoads: 0,
  cacheHits: 0,
  cacheMisses: 0,
  loadErrors: 0,
};

/**
 * Normalize component name to match loader map keys (PascalCase)
 * Islands store component names in lowercase, but loader map uses PascalCase
 */
function normalizeComponentName(name: string): string {
  // Check if exact match exists first (for performance)
  if (componentLoaders[name]) {
    return name;
  }

  // Try case-insensitive match
  const lowerName = name.toLowerCase();
  const matchingKey = Object.keys(componentLoaders).find(
    key => key.toLowerCase() === lowerName
  );

  return matchingKey || name;
}

/**
 * Load a single component dynamically
 * Returns cached component if already loaded
 *
 * @param name - Component name to load (case-insensitive)
 * @returns Component or null if not found/failed
 */
export async function loadComponent(name: string): Promise<React.ComponentType<any> | null> {
  // Normalize component name to match loader map
  const normalizedName = normalizeComponentName(name);

  // Check cache first (use normalized name)
  if (loadedComponents.has(normalizedName)) {
    loadMetrics.cacheHits++;
    loadMetrics.totalLoads++;
    return loadedComponents.get(normalizedName)!;
  }

  // Get loader for this component
  const loader = componentLoaders[normalizedName];
  if (!loader) {
    console.error(`[DynamicRegistry] No loader found for component: ${name} (normalized: ${normalizedName})`);
    loadMetrics.loadErrors++;
    return null;
  }

  try {
    loadMetrics.cacheMisses++;
    loadMetrics.totalLoads++;

    const componentModule = await loader();
    const component = componentModule.default;

    // Cache the loaded component (use normalized name)
    loadedComponents.set(normalizedName, component);

    return component;
  } catch (error) {
    console.error(`[DynamicRegistry] Failed to load component ${name} (${normalizedName}):`, error);
    loadMetrics.loadErrors++;
    return null;
  }
}

/**
 * Pre-load all components used in a template
 * Call this before rendering to load components in parallel
 *
 * @param islands - Array of island objects from compiled template
 * @returns Promise that resolves when all components are loaded
 */
export async function preloadTemplateComponents(
  islands: Array<{ component: string; id?: string }>
): Promise<void> {
  const startTime = performance.now();

  // Extract unique component names
  const componentNames = new Set(islands.map(i => i.component));

  // Load all components in parallel
  const loadPromises = Array.from(componentNames).map(name => loadComponent(name));

  // Wait for all loads to complete
  const results = await Promise.all(loadPromises);

  // Count successes and failures
  const loaded = results.filter(r => r !== null).length;
  const failed = results.filter(r => r === null).length;

  // Keep warning for failed components (important for debugging)
  if (failed > 0) {
    console.warn(`[DynamicRegistry] ${failed} component(s) failed to load`);
  }
}

/**
 * Register a dynamically loaded component in the registry
 * Used after preloading to add components to the ComponentRegistry instance
 *
 * @param registry - ComponentRegistry instance
 * @param name - Component name
 * @param component - Loaded React component
 * @param registration - Component registration details (props, relationship, etc.)
 */
export function registerLoadedComponent(
  registry: ComponentRegistry,
  name: string,
  component: React.ComponentType<any>,
  registration: Omit<ComponentRegistration, 'component'>
) {
  registry.register({
    ...registration,
    name,
    component
  });
}

/**
 * Get cache statistics for monitoring
 */
export function getCacheStats() {
  return {
    ...loadMetrics,
    cacheSize: loadedComponents.size,
    hitRate: loadMetrics.totalLoads > 0
      ? ((loadMetrics.cacheHits / loadMetrics.totalLoads) * 100).toFixed(1) + '%'
      : '0%'
  };
}

/**
 * Clear the component cache (useful for testing)
 */
export function clearComponentCache() {
  loadedComponents.clear();
  loadMetrics = {
    totalLoads: 0,
    cacheHits: 0,
    cacheMisses: 0,
    loadErrors: 0,
  };
}

/**
 * Check if a component loader exists
 */
export function hasComponentLoader(name: string): boolean {
  return componentLoaders.hasOwnProperty(name);
}

/**
 * Get all available component names
 */
export function getAvailableComponents(): string[] {
  return Object.keys(componentLoaders);
}

/**
 * Get a preloaded component from cache (synchronous)
 * Returns null if component hasn't been preloaded yet
 * Use this in the hydration phase after preloadTemplateComponents has completed
 *
 * @param name - Component name (case-insensitive)
 * @returns Cached component or null if not loaded
 */
export function getLoadedComponent(name: string): React.ComponentType<any> | null {
  // Normalize component name for case-insensitive lookup
  const normalizedName = normalizeComponentName(name);
  const component = loadedComponents.get(normalizedName);

  if (!component) {
    console.warn(`[DynamicRegistry] Component ${name} not found in cache. Was preloadTemplateComponents called?`);
    return null;
  }
  return component;
}
