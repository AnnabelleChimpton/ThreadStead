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
  TextElement: () => import('@/components/features/templates/TextElement'),
  Heading: () => import('@/components/features/templates/Heading'),
  Paragraph: () => import('@/components/features/templates/Paragraph'),

  // Profile Components
  ProfilePhoto: () => import('@/components/features/templates/ProfilePhoto'),
  DisplayName: () => import('@/components/features/templates/DisplayName'),
  Bio: () => import('@/components/features/templates/Bio'),
  BlogPosts: () => import('@/components/features/templates/BlogPosts'),
  Guestbook: () => import('@/components/features/templates/Guestbook'),
  FollowButton: () => import('@/components/features/templates/FollowButton'),
  MutualFriends: () => import('@/components/features/templates/MutualFriends'),
  FriendBadge: () => import('@/components/features/templates/FriendBadge'),
  FriendDisplay: () => import('@/components/features/templates/FriendDisplay'),
  WebsiteDisplay: () => import('@/components/features/templates/WebsiteDisplay'),
  NotificationCenter: () => import('@/components/features/templates/NotificationCenter'),
  NotificationBell: () => import('@/components/features/templates/NotificationBell'),
  UserAccount: () => import('@/components/features/templates/UserAccount'),
  SiteBranding: () => import('@/components/features/templates/SiteBranding'),
  Breadcrumb: () => import('@/components/features/templates/Breadcrumb'),

  // Layout Components
  FlexContainer: () => import('@/components/features/templates/FlexContainer'),
  GridLayout: () => import('@/components/features/templates/GridLayout'),
  Grid: () => import('@/components/features/templates/layout/Grid').then(m => ({ default: m.Grid })),
  GridItem: () => import('@/components/features/templates/layout/Grid').then(m => ({ default: m.GridItem })),
  SplitLayout: () => import('@/components/features/templates/SplitLayout'),
  CenteredBox: () => import('@/components/features/templates/CenteredBox'),

  // Decorative Components
  GradientBox: () => import('@/components/features/templates/GradientBox'),
  NeonBorder: () => import('@/components/features/templates/NeonBorder'),
  RetroTerminal: () => import('@/components/features/templates/RetroTerminal'),
  PolaroidFrame: () => import('@/components/features/templates/PolaroidFrame'),
  StickyNote: () => import('@/components/features/templates/StickyNote'),
  RevealBox: () => import('@/components/features/templates/RevealBox'),
  FloatingBadge: () => import('@/components/features/templates/FloatingBadge'),

  // Text Effects
  WaveText: () => import('@/components/features/templates/WaveText'),
  GlitchText: () => import('@/components/features/templates/GlitchText'),

  // Tabs
  Tabs: () => import('@/components/features/templates/Tabs'),
  Tab: () => import('@/components/features/templates/Tabs').then(m => ({ default: m.Tab })),

  // Profile Features
  ProfileHero: () => import('@/components/features/templates/ProfileHero'),
  ProfileHeader: () => import('@/components/features/templates/ProfileHeader'),
  MediaGrid: () => import('@/components/features/templates/MediaGrid'),
  ProfileBadges: () => import('@/components/features/templates/ProfileBadges'),
  RetroCard: () => import('@/components/ui/layout/RetroCard'),
  UserImage: () => import('@/components/features/templates/UserImage'),

  // Complex Display Components
  ProgressTracker: () => import('@/components/features/templates/ProgressTracker'),
  ProgressItem: () => import('@/components/features/templates/ProgressTracker').then(m => ({ default: m.ProgressItem })),
  ImageCarousel: () => import('@/components/features/templates/ImageCarousel'),
  CarouselImage: () => import('@/components/features/templates/ImageCarousel').then(m => ({ default: m.CarouselImage })),
  ContactCard: () => import('@/components/features/templates/ContactCard'),
  ContactMethod: () => import('@/components/features/templates/ContactCard').then(m => ({ default: m.ContactMethod })),
  SkillChart: () => import('@/components/features/templates/SkillChart'),
  Skill: () => import('@/components/features/templates/SkillChart').then(m => ({ default: m.Skill })),

  // Retro Components
  CRTMonitor: () => import('@/components/features/templates/CRTMonitor'),
  NeonSign: () => import('@/components/features/templates/NeonSign'),
  ArcadeButton: () => import('@/components/features/templates/ArcadeButton'),
  PixelArtFrame: () => import('@/components/features/templates/PixelArtFrame'),
  RetroGrid: () => import('@/components/features/templates/RetroGrid'),
  VHSTape: () => import('@/components/features/templates/VHSTape'),
  CassetteTape: () => import('@/components/features/templates/CassetteTape'),
  RetroTV: () => import('@/components/features/templates/RetroTV'),
  Boombox: () => import('@/components/features/templates/Boombox'),
  MatrixRain: () => import('@/components/features/templates/MatrixRain'),

  // Navigation
  ThreadsteadNavigation: () => import('@/components/features/templates/NavigationPreview'),

  // ========== State Components ==========
  // Debug
  DebugValue: () => import('@/components/features/templates/DebugValue'),

  // Variables
  Var: () => import('@/components/features/templates/state/Var'),
  Option: () => import('@/components/features/templates/state/Var').then(m => ({ default: m.Option })),
  ShowVar: () => import('@/components/features/templates/state/ShowVar'),

  // Interactive
  Button: () => import('@/components/features/templates/Button'),
  EventDiv: () => import('@/components/features/templates/EventDiv'),

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
  CustomHTMLElement: () => import('@/components/features/templates/CustomHTMLElement'),

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
  ArrayAt: () => import('@/components/features/templates/state/actions/ArrayAt'),

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
  Get: () => import('@/components/features/templates/state/actions/Get'),
  Filter: () => import('@/components/features/templates/state/actions/Filter'),
  Find: () => import('@/components/features/templates/state/actions/Find'),
  Transform: () => import('@/components/features/templates/state/actions/Transform'),
  Sort: () => import('@/components/features/templates/state/actions/Sort'),

  // Advanced State Management
  Clone: () => import('@/components/features/templates/state/actions/Clone'),
  Merge: () => import('@/components/features/templates/state/actions/Merge'),
  ObjectSet: () => import('@/components/features/templates/state/actions/ObjectSet'),
  Extract: () => import('@/components/features/templates/state/actions/Extract'),
  Property: () => import('@/components/features/templates/state/actions/Property'),
  ConditionalAttr: () => import('@/components/features/templates/state/actions/ConditionalAttr'),

  // ========== Conditional Components ==========
  // Display Conditionals
  Show: () => import('@/components/features/templates/conditional/Show'),
  Choose: () => import('@/components/features/templates/conditional/Choose'),
  When: () => import('@/components/features/templates/conditional/Choose').then(m => ({ default: m.When })),
  Otherwise: () => import('@/components/features/templates/conditional/Choose').then(m => ({ default: m.Otherwise })),
  IfOwner: () => import('@/components/features/templates/conditional/IfOwner'),
  IfVisitor: () => import('@/components/features/templates/conditional/IfOwner').then(m => ({ default: m.IfVisitor })),

  // Action Conditionals
  If: () => import('@/components/features/templates/state/conditional/If'),
  ElseIf: () => import('@/components/features/templates/state/conditional/ElseIf'),
  Else: () => import('@/components/features/templates/state/conditional/Else'),
  Switch: () => import('@/components/features/templates/state/conditional/Switch'),
  Case: () => import('@/components/features/templates/state/conditional/Case'),
  Default: () => import('@/components/features/templates/state/conditional/Default'),

  // ========== Event & Loop Components ==========
  // Event Handlers
  OnClick: () => import('@/components/features/templates/state/events/OnClick'),
  OnChange: () => import('@/components/features/templates/state/events/OnChange'),
  OnMount: () => import('@/components/features/templates/state/events/OnMount'),
  OnInterval: () => import('@/components/features/templates/state/events/OnInterval'),
  OnHover: () => import('@/components/features/templates/state/events/OnHover'),
  OnMouseEnter: () => import('@/components/features/templates/state/events/OnMouseEnter'),
  OnMouseLeave: () => import('@/components/features/templates/state/events/OnMouseLeave'),
  OnKeyPress: () => import('@/components/features/templates/state/events/OnKeyPress'),
  OnVisible: () => import('@/components/features/templates/state/events/OnVisible'),

  // Loops
  ForEach: () => import('@/components/features/templates/state/loops/ForEach'),
  Break: () => import('@/components/features/templates/state/loops/Break'),
  Continue: () => import('@/components/features/templates/state/loops/Continue'),

  // Validation
  Validate: () => import('@/components/features/templates/state/validation/Validate'),

  // Temporal Controls
  Delay: () => import('@/components/features/templates/state/temporal/Delay'),
  Sequence: () => import('@/components/features/templates/state/temporal/Sequence'),
  Step: () => import('@/components/features/templates/state/temporal/Step'),
  Timeout: () => import('@/components/features/templates/state/temporal/Timeout'),
  OnTimeout: () => import('@/components/features/templates/state/temporal/OnTimeout'),
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
