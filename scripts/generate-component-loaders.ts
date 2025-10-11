// Auto-generate component loaders for dynamic-registry.ts
// Run this script when new components are added to ensure loader map stays in sync

import fs from 'fs';
import path from 'path';

const registrationFiles = [
  'lib/templates/core/component-registrations-display.ts',
  'lib/templates/core/component-registrations-state.ts',
  'lib/templates/core/component-registrations-actions.ts',
  'lib/templates/core/component-registrations-conditional.ts',
  'lib/templates/core/component-registrations-events.ts',
];

interface ComponentImport {
  name: string;
  path: string;
  isNamed: boolean; // true if it's a named export like { Grid, GridItem }
  exports?: string[]; // for named exports
}

/**
 * Extract import statements from registration files
 */
function extractImports(filePath: string): ComponentImport[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const imports: ComponentImport[] = [];

  // Match default imports: import ProfilePhoto from '@/...'
  const defaultImportRegex = /import\s+(\w+)\s+from\s+['"]([^'"]+)['"]/g;
  let match;

  while ((match = defaultImportRegex.exec(content)) !== null) {
    const [, name, importPath] = match;

    // Skip non-component imports (utilities, types, etc.)
    if (
      importPath.includes('template-registry') ||
      importPath.includes('universal-styling') ||
      importPath === 'react'
    ) {
      continue;
    }

    imports.push({
      name,
      path: importPath,
      isNamed: false
    });
  }

  // Match named imports: import { Grid, GridItem } from '@/...'
  const namedImportRegex = /import\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/g;

  while ((match = namedImportRegex.exec(content)) !== null) {
    const [, names, importPath] = match;

    // Skip non-component imports
    if (
      importPath.includes('template-registry') ||
      importPath.includes('universal-styling') ||
      importPath === 'react'
    ) {
      continue;
    }

    // Parse individual named exports
    const exportNames = names
      .split(',')
      .map(n => n.trim())
      .filter(n => n.length > 0);

    // Add each named export as a separate component
    exportNames.forEach(name => {
      imports.push({
        name,
        path: importPath,
        isNamed: true,
        exports: exportNames
      });
    });
  }

  return imports;
}

/**
 * Generate loader entry for a component
 */
function generateLoaderEntry(componentImport: ComponentImport): string {
  const { name, path, isNamed } = componentImport;

  if (isNamed) {
    // Named export: Grid: () => import('...').then(m => ({ default: m.Grid }))
    return `  ${name}: () => import('${path}').then(m => ({ default: m.${name} }))`;
  } else {
    // Default export: ProfilePhoto: () => import('...')
    return `  ${name}: () => import('${path}')`;
  }
}

/**
 * Generate the complete dynamic-registry.ts file
 */
function generateDynamicRegistry() {
  console.log('🔍 Scanning registration files...\n');

  const allImports: ComponentImport[] = [];
  const seenComponents = new Set<string>();

  // Extract imports from all registration files
  registrationFiles.forEach(file => {
    const filePath = path.join(process.cwd(), file);
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️  File not found: ${file}`);
      return;
    }

    const imports = extractImports(filePath);
    console.log(`📄 ${file}: Found ${imports.length} imports`);

    imports.forEach(imp => {
      if (!seenComponents.has(imp.name)) {
        allImports.push(imp);
        seenComponents.add(imp.name);
      }
    });
  });

  console.log(`\n✅ Total unique components: ${allImports.length}\n`);

  // Group imports by category for better readability
  const categories = {
    display: [] as ComponentImport[],
    state: [] as ComponentImport[],
    actions: [] as ComponentImport[],
    conditional: [] as ComponentImport[],
    events: [] as ComponentImport[],
    other: [] as ComponentImport[]
  };

  allImports.forEach(imp => {
    if (imp.path.includes('/state/')) {
      if (imp.path.includes('/actions/')) {
        categories.actions.push(imp);
      } else if (imp.path.includes('/events/') || imp.path.includes('/loops/') || imp.path.includes('/temporal/')) {
        categories.events.push(imp);
      } else {
        categories.state.push(imp);
      }
    } else if (imp.path.includes('/conditional/')) {
      categories.conditional.push(imp);
    } else if (
      imp.path.includes('/templates/') &&
      !imp.path.includes('/state/') &&
      !imp.path.includes('/conditional/')
    ) {
      categories.display.push(imp);
    } else {
      categories.other.push(imp);
    }
  });

  // Generate loader map entries
  const displayLoaders = categories.display.map(generateLoaderEntry).join(',\n');
  const stateLoaders = categories.state.map(generateLoaderEntry).join(',\n');
  const actionLoaders = categories.actions.map(generateLoaderEntry).join(',\n');
  const conditionalLoaders = categories.conditional.map(generateLoaderEntry).join(',\n');
  const eventLoaders = categories.events.map(generateLoaderEntry).join(',\n');
  const otherLoaders = categories.other.map(generateLoaderEntry).join(',\n');

  // Generate the output file
  const output = `// AUTO-GENERATED by scripts/generate-component-loaders.ts
// DO NOT EDIT THIS FILE DIRECTLY
// Run: npm run generate-component-loaders

// Dynamic Component Registry for Code Splitting
// Phase 1: Component Code Splitting Implementation
// Loads components on-demand rather than eagerly importing all ${allImports.length}+ components

import { ComponentRegistry } from './template-registry-class';
import type { ComponentRegistration } from './template-registry-types';
import React from 'react';

/**
 * Component loader map - defines how to dynamically import each component
 * Organized by category for maintainability
 */
const componentLoaders: Record<string, () => Promise<{ default: React.ComponentType<any> }>> = {
  // ========== Display Components (${categories.display.length}) ==========
${displayLoaders},

  // ========== State Components (${categories.state.length}) ==========
${stateLoaders},

  // ========== Action Components (${categories.actions.length}) ==========
${actionLoaders},

  // ========== Conditional Components (${categories.conditional.length}) ==========
${conditionalLoaders},

  // ========== Event & Loop Components (${categories.events.length}) ==========
${eventLoaders}${categories.other.length > 0 ? `,

  // ========== Other Components (${categories.other.length}) ==========
${otherLoaders}` : ''}
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
 * Load a single component dynamically
 * Returns cached component if already loaded
 *
 * @param name - Component name to load
 * @returns Component or null if not found/failed
 */
export async function loadComponent(name: string): Promise<React.ComponentType<any> | null> {
  // Check cache first
  if (loadedComponents.has(name)) {
    loadMetrics.cacheHits++;
    loadMetrics.totalLoads++;
    return loadedComponents.get(name)!;
  }

  // Get loader for this component
  const loader = componentLoaders[name];
  if (!loader) {
    console.error(\`[DynamicRegistry] No loader found for component: \${name}\`);
    loadMetrics.loadErrors++;
    return null;
  }

  try {
    loadMetrics.cacheMisses++;
    loadMetrics.totalLoads++;

    const module = await loader();
    const component = module.default;

    // Cache the loaded component
    loadedComponents.set(name, component);

    console.log(\`[DynamicRegistry] Loaded component: \${name}\`);
    return component;
  } catch (error) {
    console.error(\`[DynamicRegistry] Failed to load component \${name}:\`, error);
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

  console.log(\`[DynamicRegistry] Preloading \${componentNames.size} unique components from \${islands.length} islands...\`);

  // Load all components in parallel
  const loadPromises = Array.from(componentNames).map(name => loadComponent(name));

  // Wait for all loads to complete
  const results = await Promise.all(loadPromises);

  // Count successes and failures
  const loaded = results.filter(r => r !== null).length;
  const failed = results.filter(r => r === null).length;

  const endTime = performance.now();
  const duration = (endTime - startTime).toFixed(0);

  console.log(
    \`[DynamicRegistry] Preloading complete in \${duration}ms | \` +
    \`Loaded: \${loaded}, Failed: \${failed}, Cache hits: \${loadMetrics.cacheHits}/\${loadMetrics.totalLoads}\`
  );

  if (failed > 0) {
    console.warn(\`[DynamicRegistry] \${failed} component(s) failed to load\`);
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
  console.log('[DynamicRegistry] Cache cleared');
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
`;

  return output;
}

/**
 * Main execution
 */
function main() {
  console.log('🚀 Component Loader Generator\n');
  console.log('Generating dynamic component loaders for code splitting...\n');

  try {
    const output = generateDynamicRegistry();

    // Write to file
    const outputPath = path.join(process.cwd(), 'lib/templates/core/dynamic-registry.ts');
    fs.writeFileSync(outputPath, output, 'utf-8');

    console.log(`\n✅ Successfully generated: ${outputPath}`);
    console.log('\n📊 Summary:');
    console.log('   - All component imports have been converted to dynamic imports');
    console.log('   - Components will be loaded on-demand when templates use them');
    console.log('   - Expected bundle size reduction: 66-90%\n');
  } catch (error) {
    console.error('\n❌ Error generating component loaders:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { generateDynamicRegistry };
