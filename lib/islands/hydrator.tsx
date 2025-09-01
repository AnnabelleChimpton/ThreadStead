// Client-side island hydration system
import React from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import type { ResidentData } from '@/components/template/ResidentDataProvider';
import type { Island } from '@/lib/template-compiler';
import type { ProfileMode } from '@/components/profile/ProfileModeRenderer';


// Hydration context interface
export interface HydrationContext {
  residentData: ResidentData;
  profileMode: ProfileMode;
  islands: Island[];
  containerId: string;
}

// Hydration result interface
export interface HydrationResult {
  hydratedCount: number;
  failedCount: number;
  errors: HydrationError[];
  startTime: number;
  endTime: number;
}

// Hydration error interface
export interface HydrationError {
  islandId: string;
  componentType: string;
  error: Error;
  element?: Element;
}

// Island registry for dynamic loading
interface IslandRegistry {
  [key: string]: () => Promise<React.ComponentType<any>>;
}

// Cleanup function to unmount all React roots in a specific container
export function cleanupIslandsInContainer(containerId: string): void {
  console.log(`🧹 CLEANUP CALLED for container: ${containerId}`);
  console.trace('Cleanup called from:'); // Show the call stack
  
  const container = document.getElementById(containerId);
  if (!container) {
    console.log(`Container ${containerId} not found during cleanup`);
    return;
  }

  // Find all hydrated islands and unmount their React roots
  const hydratedElements = container.querySelectorAll('[data-hydrated="true"]');
  console.log(`Found ${hydratedElements.length} hydrated elements to cleanup`);
  
  hydratedElements.forEach(element => {
    const islandId = element.getAttribute('data-island');
    console.log(`🧹 Cleaning up island: ${islandId}`);
    
    if (islandId) {
      const root = islandRoots.get(islandId);
      if (root) {
        console.log('Unmounting React root for island:', islandId);
        try {
          root.unmount();
        } catch (error) {
          console.error(`Failed to unmount island ${islandId}:`, error);
        }
        islandRoots.delete(islandId);
      }
    }
    
    // Remove hydration attributes
    element.removeAttribute('data-hydrated');
    element.removeAttribute('data-hydrating');
    element.removeAttribute('data-hydration-time');
  });
  
  console.log(`🧹 Cleaned up ${hydratedElements.length} islands in container ${containerId}`);
}

// Main hydration function for profile islands
export async function hydrateProfileIslands(context: HydrationContext): Promise<HydrationResult> {
  const startTime = performance.now();
  const container = document.getElementById(context.containerId);
  
  if (!container) {
    throw new Error(`Container with ID "${context.containerId}" not found`);
  }

  const errors: HydrationError[] = [];
  let hydratedCount = 0;
  let failedCount = 0;

  // Find all island placeholders
  const placeholders = container.querySelectorAll('[data-island]');
  
  console.log(`Found ${placeholders.length} island placeholders to hydrate`);
  console.log('Islands to hydrate:', context.islands);
  console.log('Container HTML:', container.innerHTML.substring(0, 500));
  
  // Hydrate each island
  await Promise.allSettled(
    Array.from(placeholders).map(async (placeholder) => {
      const islandId = placeholder.getAttribute('data-island');
      const componentType = placeholder.getAttribute('data-component');
      
      if (!islandId || !componentType) {
        console.warn('Island placeholder missing required attributes:', placeholder);
        return;
      }

      // Find island configuration
      const islandConfig = context.islands.find(i => i.id === islandId);
      if (!islandConfig) {
        console.warn(`Island configuration not found for ${islandId}`);
        return;
      }

      try {
        // Hydrate the individual island
        await hydrateIsland({
          element: placeholder,
          island: islandConfig,
          context
        });
        
        hydratedCount++;
        console.log(`✅ Successfully hydrated island: ${islandId} (${componentType})`);
        
      } catch (error) {
        failedCount++;
        const hydrationError: HydrationError = {
          islandId,
          componentType,
          error: error instanceof Error ? error : new Error(String(error)),
          element: placeholder
        };
        
        errors.push(hydrationError);
        console.error(`❌ Failed to hydrate island: ${islandId}`, error);
        
        // Show error state in the placeholder
        showIslandError(placeholder, hydrationError);
      }
    })
  );

  const endTime = performance.now();
  
  const result: HydrationResult = {
    hydratedCount,
    failedCount,
    errors,
    startTime,
    endTime
  };

  console.log(`Island hydration completed in ${(endTime - startTime).toFixed(2)}ms`, result);
  
  return result;
}

// Hydrate individual island
interface HydrateIslandParams {
  element: Element;
  island: Island;
  context: HydrationContext;
}

async function hydrateIsland({ element, island, context }: HydrateIslandParams): Promise<void> {
  console.log(`Starting hydration of island ${island.id} with component ${island.component}`);
  
  // Check if element is already hydrated to prevent double hydration
  if (element.hasAttribute('data-hydrated') || element.hasAttribute('data-hydrating')) {
    console.warn(`Island ${island.id} already hydrated or hydrating, skipping`);
    return;
  }
  
  // Mark as hydrating to prevent race conditions
  element.setAttribute('data-hydrating', 'true');
  
  try {
    // Dynamically import the ProfileIslandWrapper
    const { default: ProfileIslandWrapper } = await import('@/components/islands/ProfileIslandWrapper');
    
    // Check if element still exists in DOM and is connected
    if (!element.parentNode || !element.isConnected) {
      console.warn(`Island ${island.id} element removed from DOM during hydration`);
      element.removeAttribute('data-hydrating');
      return;
    }
    
    // Additional safety check: verify element is still in document
    if (!document.contains(element)) {
      console.warn(`Island ${island.id} element no longer in document`);
      element.removeAttribute('data-hydrating');
      return;
    }
    
    console.log(`Pre-hydration DOM check for ${island.id}:`, {
      element: element,
      hasParent: !!element.parentElement,
      isConnected: element.isConnected,
      innerHTML: element.innerHTML,
      clientRect: element.getBoundingClientRect()
    });
    
    // Clear existing content but preserve the element itself
    while (element.firstChild) {
      element.removeChild(element.firstChild);
    }
    
    // Reset styles that might interfere and add visual debugging
    (element as HTMLElement).style.backgroundColor = 'lightblue';
    (element as HTMLElement).style.border = '3px solid red';
    (element as HTMLElement).style.padding = '10px';
    (element as HTMLElement).style.minHeight = '100px';
    (element as HTMLElement).style.display = 'block';
    
    console.log(`Creating React root for ${island.id} in element:`, element);
    
    // Create React root directly in the element
    const root = createRoot(element);
    
    console.log(`React root created for ${island.id}:`, root);
    
    // Store root for cleanup later
    storeIslandRoot(island.id, root);
    
    // Create the island component
    const IslandComponent = (
      <ProfileIslandWrapper
        componentType={island.component}
        props={island.props}
        residentData={context.residentData}
        profileMode={context.profileMode}
        islandId={island.id}
        onError={(error, islandId) => {
          console.error(`Runtime error in island ${islandId}:`, error);
        }}
        onRender={(islandId) => {
          console.log(`Island ${islandId} rendered successfully`);
        }}
      />
    );
    
    console.log(`Rendering component for ${island.id}`);
    
    // Render the island component
    root.render(IslandComponent);
    
    console.log(`After render call for ${island.id}:`, {
      innerHTML: element.innerHTML,
      children: element.children.length,
      clientRect: element.getBoundingClientRect()
    });
    
    // Small delay to allow React to render, then check again
    setTimeout(() => {
      console.log(`Post-render check for ${island.id}:`, {
        innerHTML: element.innerHTML,
        children: element.children.length,
        hasContent: element.innerHTML.length > 0
      });
    }, 100);
    
    // Mark element as hydrated and remove hydrating flag
    element.removeAttribute('data-hydrating');
    element.setAttribute('data-hydrated', 'true');
    element.setAttribute('data-hydration-time', Date.now().toString());
    
  } catch (error) {
    // Clean up hydrating flag on error
    element.removeAttribute('data-hydrating');
    throw error;
  }
}

// Island root storage for cleanup
const islandRoots = new Map<string, Root>();

function storeIslandRoot(islandId: string, root: Root): void {
  // Clean up existing root if it exists
  const existingRoot = islandRoots.get(islandId);
  if (existingRoot) {
    try {
      existingRoot.unmount();
    } catch (error) {
      console.warn(`Failed to unmount existing island ${islandId}:`, error);
    }
  }
  
  islandRoots.set(islandId, root);
}

// Cleanup all islands
export function cleanupIslands(): void {
  console.log(`Cleaning up ${islandRoots.size} islands`);
  
  islandRoots.forEach((root, islandId) => {
    try {
      root.unmount();
    } catch (error) {
      console.error(`Failed to unmount island ${islandId}:`, error);
    }
  });
  
  islandRoots.clear();
}

// Show error state in island placeholder
function showIslandError(element: Element, error: HydrationError): void {
  // Only set innerHTML if there's no React root managing this element
  if (!element.hasAttribute('data-hydrated')) {
    element.innerHTML = `
      <div class="island-hydration-error" data-island-id="${error.islandId}">
        <div class="error-content">
          <span class="error-icon">⚠️</span>
          <div class="error-text">
            <div class="error-title">Hydration Failed</div>
            <div class="error-details">${error.componentType} component could not be loaded</div>
            ${process.env.NODE_ENV === 'development' ? `
              <details class="error-stack">
                <summary>Error details</summary>
                <pre>${error.error.message}</pre>
              </details>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }
  
  element.setAttribute('data-hydration-error', 'true');
}

// Utility function to check if islands are supported
export function isIslandsSupported(): boolean {
  return typeof window !== 'undefined' && 
         typeof createRoot === 'function';
}

// Performance monitoring
export interface IslandPerformanceMetrics {
  islandId: string;
  componentType: string;
  hydrationTime: number;
  renderTime?: number;
  memoryUsage?: number;
}

const performanceMetrics = new Map<string, IslandPerformanceMetrics>();

export function trackIslandPerformance(islandId: string, componentType: string): void {
  if (!performance.mark) return;
  
  const startMark = `island-${islandId}-start`;
  const endMark = `island-${islandId}-end`;
  
  performance.mark(startMark);
  
  // Track when island finishes rendering
  setTimeout(() => {
    performance.mark(endMark);
    performance.measure(`island-${islandId}`, startMark, endMark);
    
    const measure = performance.getEntriesByName(`island-${islandId}`)[0];
    if (measure) {
      performanceMetrics.set(islandId, {
        islandId,
        componentType,
        hydrationTime: measure.duration
      });
    }
  }, 0);
}

export function getIslandPerformanceMetrics(): IslandPerformanceMetrics[] {
  return Array.from(performanceMetrics.values());
}

// Debug utilities
export function debugIslands(): void {
  if (process.env.NODE_ENV !== 'development') return;
  
  console.group('🏝️ Islands Debug Information');
  
  console.log('Hydrated Islands:', islandRoots.size);
  console.log('Island Roots:', islandRoots);
  
  const hydratedElements = document.querySelectorAll('[data-hydrated="true"]');
  console.log('Hydrated Elements:', hydratedElements.length);
  
  const errorElements = document.querySelectorAll('[data-hydration-error="true"]');
  console.log('Failed Elements:', errorElements.length);
  
  const metrics = getIslandPerformanceMetrics();
  if (metrics.length > 0) {
    console.table(metrics);
  }
  
  console.groupEnd();
}

// Make debug function available globally in development
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  (window as any).debugIslands = debugIslands;
  (window as any).cleanupIslands = cleanupIslands;
}