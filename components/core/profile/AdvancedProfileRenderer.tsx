// Advanced profile renderer with islands architecture
// Main orchestrator - imports from decomposed files

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { ProfileUser } from './ProfileModeRenderer';
import type { CompiledTemplate, Island } from '@/lib/templates/compilation/compiler';
import { extractVisualBuilderClasses } from '@/lib/utils/css/visual-builder-class-extractor';
import { GlobalTemplateStateProvider } from '@/lib/templates/state/TemplateStateProvider';
import { ToastProvider } from '@/lib/templates/state/ToastProvider';
import TemplateErrorBoundary from '@/components/features/templates/TemplateErrorBoundary';
import { useIslandManager } from '@/components/islands/ProfileIslandWrapper';
import { ResidentDataProvider } from '@/components/features/templates/ResidentDataProvider';
import { preloadTemplateComponents } from '@/lib/templates/core/dynamic-registry';

// Import and re-export types
export type {
  ExtendedIsland,
  HtmlNode,
  AdvancedProfileRendererProps,
  ProfileContentRendererProps,
  StaticHTMLWithIslandsProps,
  AdvancedProfileFallbackProps,
  HydrationDebugInfoProps
} from './types';

// Import decomposed components
import { StaticHTMLWithIslands } from './HTMLIslandHydration';
import { ProductionIslandRenderer } from './IslandRenderers';
import { HydrationDebugInfo } from './IslandErrorBoundary';
import type {
  ExtendedIsland,
  AdvancedProfileRendererProps,
  ProfileContentRendererProps,
  AdvancedProfileFallbackProps
} from './types';

// Advanced profile renderer component
export default function AdvancedProfileRenderer({
  user,
  residentData,
  templateType,
  onFallback,
  onIslandsReady,
  onIslandError,
  isInVisualBuilder = false
}: AdvancedProfileRendererProps) {
  const [isHydrated, setIsHydrated] = useState(false);
  const [componentsReady, setComponentsReady] = useState(false);
  const [hydrationError, setHydrationError] = useState<string | null>(null);

  // Get compiled template from user profile and CSS mode first
  const compiledTemplate = user.profile?.compiledTemplate as CompiledTemplate | null;
  const templateIslands = user.profile?.templateIslands as ExtendedIsland[] | null;
  const customCSS = user.profile?.customCSS;

  // Get islands from compiled template or fallback to stored islands (memoized to avoid re-renders)
  const islands = useMemo(() => {
    const islandsData = compiledTemplate?.islands || templateIslands || [];
    return islandsData;
  }, [compiledTemplate?.islands, templateIslands]);

  // Extract Visual Builder classes from CSS to apply to HTML elements
  const visualBuilderClasses = useMemo(() => {
    if (!customCSS) return [];
    return extractVisualBuilderClasses(customCSS);
  }, [customCSS]);

  const islandIds = useMemo(() => islands.map(island => island.id), [islands]);

  // Use island manager to track hydration state
  const { loadedIslands, failedIslands, islandsReady, handleIslandRender: managerHandleIslandRender, handleIslandError: managerHandleIslandError } = useIslandManager(islandIds);

  // Handle island render success
  const handleIslandRender = useCallback((islandId: string) => {
    managerHandleIslandRender(islandId);
  }, [managerHandleIslandRender]);

  // Handle island render errors
  const handleIslandError = useCallback((error: Error, islandId: string) => {
    console.error(`❌ Island ${islandId} failed to render:`, error);
    managerHandleIslandError(error, islandId);
    onIslandError?.(error, islandId);
  }, [managerHandleIslandError, onIslandError]);

  // Hydrate islands when component mounts (WITH DYNAMIC COMPONENT PRELOADING)
  useEffect(() => {
    if (!componentsReady && compiledTemplate?.staticHTML && islands.length > 0) {
      (async () => {
        try {
          // PHASE 1: PRE-LOAD all components used in this template
          // This loads components dynamically instead of bundling all 128+ components
          await preloadTemplateComponents(islands);

          // Mark components as ready and start hydration
          setComponentsReady(true);
          setIsHydrated(true);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown hydration error';
          console.error('[AdvancedProfileRenderer] Preload error:', errorMessage);
          setHydrationError(errorMessage);
          onFallback?.(errorMessage);
        }
      })();
    } else if (islands.length === 0) {
      // No islands to preload, mark as ready immediately
      setComponentsReady(true);
      setIsHydrated(true);
    }
  }, [compiledTemplate?.staticHTML, islands.length, componentsReady, onFallback]);

  // Notify when all islands are ready (FIXED: memoize sizes to prevent infinite loops)
  const loadedCount = useMemo(() => loadedIslands.size, [loadedIslands]);
  const failedCount = useMemo(() => failedIslands.size, [failedIslands]);

  useEffect(() => {
    if (islandsReady) {
      onIslandsReady?.();
    }
  }, [islandsReady, islands.length, loadedCount, failedCount, onIslandsReady]);

  // Validate compiled template exists (after all hooks)
  if (!compiledTemplate?.staticHTML) {
    console.error('AdvancedProfileRenderer: No compiled template available');
    onFallback?.('No compiled template available');
    return <AdvancedProfileFallback reason="No compiled template" />;
  }

  // If hydration failed, show fallback
  if (hydrationError) {
    return <AdvancedProfileFallback reason={hydrationError} />;
  }

  // Wait for components to be preloaded before rendering (prevents premature component access)
  if (islands.length > 0 && !componentsReady) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="text-gray-500 text-sm">Loading components...</div>
      </div>
    );
  }

  return (
    <TemplateErrorBoundary
      componentName="AdvancedProfileRenderer"
      fallbackMessage="The template could not be rendered due to an error. This may be caused by invalid template syntax or missing required properties."
    >
      <GlobalTemplateStateProvider>
        <ResidentDataProvider data={residentData}>
          <ToastProvider>
            {/* CSS now injected in head via _app.tsx for proper cascade order */}

            {/* UNIFIED: Minimal wrapper for both template types - non-interfering container for CSS scoping */}
            <div
              id={`profile-${user.id}`}
              className={`profile-template-root ${visualBuilderClasses.join(' ')}`}
              style={{
                position: 'static',    // Don't create positioning context
                zIndex: 'auto',        // Don't create stacking context
                overflow: 'visible',   // Don't clip content
                isolation: 'auto',     // Don't create isolation context
                minHeight: '100vh',    // Ensure wrapper fills viewport for backgrounds
                width: '100%',         // Fill container width
                display: 'block'       // Block layout for proper sizing
              }}
            >
              <ProfileContentRenderer
                compiledTemplate={compiledTemplate}
                islands={islands}
                residentData={residentData}
                onIslandRender={handleIslandRender}
                onIslandError={handleIslandError}
                visualBuilderClasses={visualBuilderClasses}
                isInVisualBuilder={isInVisualBuilder}
                templateType={templateType}
                profileId={`profile-${user.id}`}
              />
            </div>

            {/* Hydration status indicator (dev mode only) */}
            {process.env.NODE_ENV === 'development' && (
              <div style={{ position: 'fixed', top: 0, right: 0, zIndex: 9999 }}>
                <HydrationDebugInfo
                  totalIslands={islands.length}
                  loadedIslands={loadedIslands}
                  failedIslands={failedIslands}
                  isHydrated={isHydrated}
                />
              </div>
            )}
          </ToastProvider>
        </ResidentDataProvider>
      </GlobalTemplateStateProvider>
    </TemplateErrorBoundary>
  );
}

// Profile content renderer - handles both islands and static HTML
function ProfileContentRenderer({
  compiledTemplate,
  islands,
  residentData,
  onIslandRender,
  onIslandError,
  visualBuilderClasses = [],
  isInVisualBuilder = false,
  templateType = 'legacy',
  profileId
}: ProfileContentRendererProps) {
  // Same logic as preview's renderIslandsDirectly
  if (!compiledTemplate) {
    return <div className="p-4 text-gray-500">No template compiled</div>;
  }

  const hasIslands = islands && islands.length > 0;
  const hasStaticHTML = compiledTemplate.staticHTML && compiledTemplate.staticHTML.trim();

  if (!hasIslands && !hasStaticHTML) {
    return <div className="p-4 text-gray-500">No content to render</div>;
  }

  // NEW APPROACH: Render static HTML first, then hydrate islands into placeholders
  if (hasIslands && hasStaticHTML) {
    // Create a combined approach: render static HTML and replace placeholders with islands
    return (
      <StaticHTMLWithIslands
        staticHTML={compiledTemplate.staticHTML}
        islands={islands}
        residentData={residentData}
        onIslandRender={onIslandRender}
        onIslandError={onIslandError}
        visualBuilderClasses={visualBuilderClasses}
        isInVisualBuilder={isInVisualBuilder}
        templateType={templateType}
        profileId={profileId}
      />
    );
  }

  // Fallback: If we only have islands (no static HTML), render them directly
  if (hasIslands) {
    const rootIslands = islands; // All islands are root islands in this structure

    return (
      <>
        {rootIslands.map(island => (
          <ProductionIslandRenderer
            key={island.id}
            island={island}
            allIslands={islands}
            residentData={residentData}
            onIslandRender={onIslandRender}
            onIslandError={onIslandError}
          />
        ))}
      </>
    );
  }

  // If we only have static HTML (no islands), render it directly
  if (hasStaticHTML) {
    return (
      <div dangerouslySetInnerHTML={{ __html: compiledTemplate.staticHTML }} />
    );
  }

  return null;
}

// Fallback component when advanced rendering fails
function AdvancedProfileFallback({ reason }: AdvancedProfileFallbackProps) {
  return (
    <div className="advanced-profile-fallback">
      <div className="fallback-content">
        <div className="fallback-icon">⚠️</div>
        <div className="fallback-message">
          <h3>Advanced Template Unavailable</h3>
          <p>Falling back to enhanced mode.</p>
          {process.env.NODE_ENV === 'development' && (
            <details className="fallback-details">
              <summary>Technical details</summary>
              <p>{reason}</p>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}
