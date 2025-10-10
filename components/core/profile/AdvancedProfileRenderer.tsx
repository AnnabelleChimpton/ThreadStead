// Advanced profile renderer with islands architecture
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { ProfileUser } from './ProfileModeRenderer';
import type { ResidentData } from '@/components/features/templates/ResidentDataProvider';
import { ResidentDataProvider } from '@/components/features/templates/ResidentDataProvider';
import type { CompiledTemplate, Island } from '@/lib/templates/compilation/compiler';
import { componentRegistry } from '@/lib/templates/core/template-registry';
import { generateOptimizedCSS, type CSSMode, type TemplateMode } from '@/lib/utils/css/layers';
import { useSiteCSS } from '@/hooks/useSiteCSS';
import { extractVisualBuilderClasses, generateContainerClasses } from '@/lib/utils/css/visual-builder-class-extractor';
import { type TemplateType } from '@/lib/utils/template-type-detector';
import {
  getCurrentBreakpoint,
  getOptimalSpan,
  COMPONENT_SIZE_METADATA,
  GRID_BREAKPOINTS,
  getComponentSizingCategory,
  type GridBreakpoint
} from '@/lib/templates/visual-builder/grid-utils';
import { separateCSSProps, applyCSSProps } from '@/lib/templates/styling/universal-css-props';
import { GlobalTemplateStateProvider } from '@/lib/templates/state/TemplateStateProvider';
import { ToastProvider } from '@/lib/templates/state/ToastProvider';
import TemplateErrorBoundary from '@/components/features/templates/TemplateErrorBoundary';
import { normalizeAttributeName, POSITIONING_ATTRIBUTES } from '@/lib/templates/core/attribute-mappings';

// Extended Island type with htmlStructure for runtime rendering
interface ExtendedIsland extends Island {
  htmlStructure?: HtmlNode[];
}

interface HtmlNode {
  type: 'component' | 'html' | 'text';
  componentId?: string;
  tagName?: string;
  attributes?: Record<string, unknown>;
  children?: HtmlNode[];
  content?: string;
}
import { useIslandManager } from '@/components/islands/ProfileIslandWrapper';

// No need for ProfileIslandWrapper anymore - using direct rendering

// Advanced profile renderer props
export interface AdvancedProfileRendererProps {
  user: ProfileUser;
  residentData: ResidentData;
  templateType: TemplateType;
  onFallback?: (reason: string) => void;
  onIslandsReady?: () => void;
  isInVisualBuilder?: boolean;
  onIslandError?: (error: Error, islandId: string) => void;
}

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
  const [hydrationError, setHydrationError] = useState<string | null>(null);

  // Get compiled template from user profile and CSS mode first
  const compiledTemplate = user.profile?.compiledTemplate as CompiledTemplate | null;
  const templateIslands = user.profile?.templateIslands as ExtendedIsland[] | null;
  const customCSS = user.profile?.customCSS;
  const cssMode = (user.profile?.cssMode || 'inherit') as CSSMode;

  const { css: siteWideCSS } = useSiteCSS({
    skipDOMInjection: true, // We handle CSS injection ourselves
    cssMode
  });

  // Create a stable ID for this profile to scope the CSS (FIXED: removed Date.now() to prevent infinite loops)
  const profileId = useMemo(() => `profile-${user.id}`, [user.id]);

  // Get islands from compiled template or fallback to stored islands (memoized to avoid re-renders)
  const islands = useMemo(() => {
    const islandsData = compiledTemplate?.islands || templateIslands || [];

    return islandsData;
  }, [compiledTemplate?.islands, templateIslands]);

  // Generate properly layered CSS with strict mode isolation
  const layeredCSS = useMemo(() => {
    return generateOptimizedCSS({
      cssMode,
      templateMode: 'advanced',
      // For 'disable' mode: exclude ALL system CSS, only user CSS allowed
      globalCSS: '', // Never include global CSS for advanced templates
      siteWideCSS: cssMode !== 'disable' ? siteWideCSS : '', // Exclude site CSS in disable mode
      userCustomCSS: customCSS || '',
      profileId,
      templateHtml: compiledTemplate?.staticHTML || '' // Enable body style transformation for legacy templates
    });
  }, [customCSS, cssMode, profileId, siteWideCSS, compiledTemplate?.staticHTML]);

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

  // Hydrate islands when component mounts
  useEffect(() => {
    if (!isHydrated && compiledTemplate?.staticHTML && islands.length > 0) {
      try {
        // Start hydration process
        setIsHydrated(true);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown hydration error';
        setHydrationError(errorMessage);
        onFallback?.(errorMessage);
      }
    }
  }, [compiledTemplate?.staticHTML, islands.length, isHydrated, onFallback]);

  // Notify when all islands are ready (FIXED: memoize sizes to prevent infinite loops)
  const loadedCount = useMemo(() => loadedIslands.size, [loadedIslands]);
  const failedCount = useMemo(() => failedIslands.size, [failedIslands]);

  useEffect(() => {
    if (islandsReady) {
      onIslandsReady?.();
    }
  }, [islandsReady, islands.length, loadedCount, failedCount, onIslandsReady]);

  // Render the compiled template

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



  return (
    <TemplateErrorBoundary
      componentName="AdvancedProfileRenderer"
      fallbackMessage="The template could not be rendered due to an error. This may be caused by invalid template syntax or missing required properties."
    >
      <GlobalTemplateStateProvider>
        <ResidentDataProvider data={residentData}>
          <ToastProvider>
            {/* Layered CSS styles */}
            {layeredCSS && (
              <style dangerouslySetInnerHTML={{ __html: layeredCSS }} />
            )}

          {/* UNIFIED: Minimal wrapper for both template types - non-interfering container for CSS scoping */}
          <div
            id={`profile-${user.id}`}
            className="profile-template-root"
            style={{
              position: 'static',    // Don't create positioning context
              zIndex: 'auto',        // Don't create stacking context
              overflow: 'visible',   // Don't clip content
              isolation: 'auto'      // Don't create isolation context
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

// Direct islands renderer (same as preview approach)
interface DirectIslandsRendererProps {
  islands: Island[];
  residentData: ResidentData;
  onIslandRender: (islandId: string) => void;
  onIslandError: (error: Error, islandId: string) => void;
}

// Profile content renderer - handles both islands and static HTML (like preview)
interface ProfileContentRendererProps {
  compiledTemplate: CompiledTemplate | null;
  islands: Island[];
  residentData: ResidentData;
  onIslandRender: (islandId: string) => void;
  onIslandError: (error: Error, islandId: string) => void;
  visualBuilderClasses?: string[];
  isInVisualBuilder?: boolean;
  templateType?: TemplateType;
  profileId?: string;
}

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

// Component that renders static HTML and replaces placeholders with actual islands
interface StaticHTMLWithIslandsProps {
  staticHTML: string;
  islands: Island[];
  residentData: ResidentData;
  onIslandRender: (islandId: string) => void;
  onIslandError: (error: Error, islandId: string) => void;
  visualBuilderClasses?: string[];
  isInVisualBuilder?: boolean;
  templateType?: TemplateType;
  profileId?: string;
}

function StaticHTMLWithIslands({
  staticHTML,
  islands,
  residentData,
  onIslandRender,
  onIslandError,
  visualBuilderClasses = [],
  isInVisualBuilder = false,
  templateType = 'legacy',
  profileId
}: StaticHTMLWithIslandsProps) {
  // QUICK WIN #5: Memoization for domToReact results
  // Create memo cache for converted React elements
  const memoCache = React.useMemo(() => new Map<string, React.ReactNode>(), []);

  // Create cache key from islands to detect when they change
  const islandsCacheKey = React.useMemo(() => {
    return islands.map(i => `${i.id}:${JSON.stringify(i.props)}`).join('|');
  }, [islands]);

  // Clear cache when islands change
  React.useEffect(() => {
    memoCache.clear();
  }, [islandsCacheKey, memoCache]);

  // Debug: Check for positioning data in staticHTML
  const hasPositioningInHTML = staticHTML.includes('data-positioning-mode') || staticHTML.includes('data-pixel-position');

  if (hasPositioningInHTML) {
  }

  // Create a map of island ID to island data for quick lookup
  const islandMap = new Map(islands.map(island => [island.id, island]));

  // Parse static HTML and replace placeholders with React components
  const renderHTMLWithIslands = () => {
    
    // Instead of regex, parse the HTML properly and work with the DOM tree
    if (typeof document === 'undefined') {
      // SSR fallback: inject Visual Builder classes and profileId into static HTML
      let processedHTML = staticHTML;

      // For Visual Builder templates, inject profileId at the container level
      if (templateType === 'visual-builder' && profileId) {
        // Try to add profileId to the main container
        processedHTML = processedHTML.replace(
          /(<div[^>]*class="[^"]*pure-absolute-container[^"]*"[^>]*)/,
          `$1 id="${profileId}"`
        );

        // If no pure-absolute-container found, wrap the entire content
        if (!processedHTML.includes(`id="${profileId}"`)) {
          processedHTML = `<div id="${profileId}">${processedHTML}</div>`;
        }
      }

      if (visualBuilderClasses.length > 0) {
        const vbClassString = visualBuilderClasses.join(' ');

        // Look for advanced-template-container first (Visual Builder templates)
        processedHTML = processedHTML.replace(
          /class="(advanced-template-container[^"]*?)"/g,
          `class="$1 ${vbClassString}"`
        );

        // Fallback: if no advanced-template-container, look for pure-absolute-container
        if (!processedHTML.includes(vbClassString)) {
          processedHTML = processedHTML.replace(
            /class="(pure-absolute-container[^"]*?)"/g,
            `class="$1 ${vbClassString}"`
          );
        }

        // Final fallback: template-container
        if (!processedHTML.includes(vbClassString)) {
          processedHTML = processedHTML.replace(
            /class="(template-container[^"]*?)"/g,
            `class="$1 ${vbClassString}"`
          );
        }

        // Visual Builder container creation logic
        if (templateType === 'visual-builder') {
          // Check if we have a suitable container (profile container or pure-absolute-container)
          const hasProfileContainer = processedHTML.includes(`id="${profileId}"`) &&
                                     (processedHTML.includes('pure-absolute-container') ||
                                      processedHTML.includes('advanced-template-container'));
          const hasVBClasses = visualBuilderClasses.some(cls => processedHTML.includes(cls));

          // Create container if we don't have a proper Visual Builder container
          if (!hasProfileContainer || !hasVBClasses) {
            const idAttr = profileId ? ` id="${profileId}"` : '';
            const classAttr = `class="pure-absolute-container ${vbClassString}"`;
            processedHTML = `<div${idAttr} ${classAttr}>${processedHTML}</div>`;
          }
        }
      }

      return [<div key="fallback" dangerouslySetInnerHTML={{ __html: processedHTML }} />];
    }
    
    // Parse the entire static HTML into a DOM tree
    const container = document.createElement('div');

    // Inject Visual Builder classes into the container element
    let processedHTML = staticHTML;
    if (visualBuilderClasses.length > 0) {
      const vbClassString = visualBuilderClasses.join(' ');

      // Look for advanced-template-container first (Visual Builder templates)
      processedHTML = processedHTML.replace(
        /class="(advanced-template-container[^"]*?)"/g,
        `class="$1 ${vbClassString}"`
      );

      // Fallback: if no advanced-template-container, look for pure-absolute-container
      if (!processedHTML.includes(vbClassString)) {
        processedHTML = processedHTML.replace(
          /class="(pure-absolute-container[^"]*?)"/g,
          `class="$1 ${vbClassString}"`
        );
      }

      // Final fallback: template-container
      if (!processedHTML.includes(vbClassString)) {
        processedHTML = processedHTML.replace(
          /class="(template-container[^"]*?)"/g,
          `class="$1 ${vbClassString}"`
        );
      }

      // Visual Builder container creation logic (client-side)
      if (templateType === 'visual-builder') {
        const hasPositioningContainer = processedHTML.includes('pure-absolute-container') ||
                                       processedHTML.includes('advanced-template-container');
        const hasProfileId = processedHTML.includes(`id="${profileId}"`);

        // If we already have a positioning container, add ID and classes to it instead of wrapping
        if (hasPositioningContainer && !hasProfileId && profileId) {
          // Add ID to the existing positioning container
          processedHTML = processedHTML.replace(
            /<div([^>]*class="[^"]*(?:pure-absolute-container|advanced-template-container)[^"]*"[^>]*)>/,
            `<div id="${profileId}"$1>`
          );
        } else if (!hasPositioningContainer) {
          // Only create a new wrapper if there's no positioning container at all
          const idAttr = profileId ? ` id="${profileId}"` : '';
          const classAttr = `class="pure-absolute-container ${vbClassString}"`;
          processedHTML = `<div${idAttr} ${classAttr}>${processedHTML}</div>`;
        }
      }
    }

    container.innerHTML = processedHTML;

    // Find all island placeholders in the DOM tree
    const placeholders = container.querySelectorAll('[data-island]');

    // Create a counter object to ensure unique keys across the entire tree
    const keyCounter = { value: 0 };

    // Helper function to convert DOM node to React element
    const domToReact = (node: Node, islands: Island[], residentData: any, onIslandRender: (islandId: string) => void, onIslandError: (error: Error, islandId: string) => void, isNestedComponent = false, isInVisualBuilder = false): React.ReactNode => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent?.trim();
        return text ? text : null;
      }
      
      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as Element;
        
        // Check if this is an island placeholder
        const islandId = element.getAttribute('data-island');
        const componentName = element.getAttribute('data-component');

        if (islandId && componentName) {
          // QUICK WIN #5: Check memo cache for this island
          if (memoCache.has(islandId)) {
            return memoCache.get(islandId);
          }

          const island = islands.find(i => i.id === islandId);
          if (island) {
            try {
              const Component = getComponent(island.component);
              if (Component) {
                // Recursively process children inside this island placeholder
                const childElements = Array.from(element.childNodes).map((child, index) =>
                  domToReact(child, islands, residentData, onIslandRender, onIslandError, true, isInVisualBuilder)
                ).filter(child => child !== null && child !== '');

                // Parse children for component props
                let processedChildren = childElements.length > 0 ? childElements : undefined;

                // PHASE 4 FIX: Inject var prop into Validate children when parent is TInput
                // This must happen BEFORE creating componentProps to avoid cloning issues
                if ((island.component === 'TInput' || island.component === 'tinput') && island.props.var && processedChildren) {
                  const varName = island.props.var;

                  // processedChildren is an array, not React children, so map over it directly
                  processedChildren = processedChildren.map((child: any) => {
                    if (React.isValidElement(child)) {
                      const childType = (child.type as any)?.name || (child.type as any)?.displayName;
                      if (childType === 'ResidentDataProvider') {
                        const innerChild = (child.props as any)?.children;
                        if (React.isValidElement(innerChild)) {
                          const innerType = (innerChild.type as any)?.name || (innerChild.type as any)?.displayName;
                          if (innerType === 'Validate') {
                            const newValidate = React.cloneElement(innerChild, { var: varName, ...(innerChild.props as any) } as any);
                            return React.cloneElement(child, { ...(child.props as any), children: newValidate } as any);
                          }
                        }
                      }
                    }
                    return child;
                  });
                }

                // PROPS-BASED POSITIONING: Get positioning data directly from island props
                const positioningData = island.props._positioning;

                // CRITICAL FIX: Add CSS properties to the style prop for legacy components
                // while keeping them as flat props for standardized components
                //
                // Legacy components (Heading, TextElement) expect CSS in 'style' prop
                // Standardized components (GridLayout, Paragraph) use separateCSSProps internally
                const { cssProps, componentProps: otherProps } = separateCSSProps(island.props);
                const generatedStyles = applyCSSProps(cssProps);

                // Merge with existing style prop (user may have custom styles in the style prop)
                // CRITICAL: Parse style if it's a string (islands may store style as string)
                const existingStyle = typeof island.props.style === 'string'
                  ? parseStyleString(island.props.style)
                  : (island.props.style as React.CSSProperties) || {};
                const finalStyles = {
                  ...existingStyle,
                  ...generatedStyles
                };

                // Create base component with props and set positioning mode
                // KEEP both flat CSS props AND merged style for compatibility:
                // - Standardized components will use separateCSSProps and ignore flat CSS props
                // - Legacy components will use the style prop
                const componentProps: any = {
                  ...island.props, // Keep all original props including flat CSS props
                  style: finalStyles // Add/override with merged styles for legacy components
                };

                // Set positioning mode for components that have positioning data
                if (positioningData) {
                  componentProps._positioningMode = 'absolute';
                }

                const renderedElement = (
                  <ResidentDataProvider key={island.id} data={residentData}>
                    <Component
                      {...componentProps}
                    >
                      {processedChildren}
                    </Component>
                  </ResidentDataProvider>
                );

                // Apply positioning if present - handle legacy, simple absolute, and responsive formats
                // CRITICAL FIX: Only apply positioning wrapper to top-level components
                // Nested components should render naturally within their parent containers

                // Check for ResponsivePosition format (has breakpoints property)
                const isResponsivePosition = positioningData && 'breakpoints' in positioningData;

                const shouldApplyPositioning = !isNestedComponent && positioningData && (
                  positioningData.mode === 'absolute' ||    // Old format
                  positioningData.isResponsive === false || // Simple absolute format
                  isResponsivePosition                      // PHASE 4.2: Responsive format
                );

                if (shouldApplyPositioning) {
                  // Helper function to parse width/height values (handles both numbers and strings with px)
                  const parsePositionValue = (value: any): number => {
                    if (typeof value === 'number') return value;
                    if (typeof value === 'string') {
                      // Remove 'px' suffix if present and parse as number
                      return parseInt(value.replace(/px$/, ''), 10) || 0;
                    }
                    return 0;
                  };

                  // PHASE 4.2: Extract position data based on format
                  let effectivePosition: { x: number; y: number; zIndex?: number };

                  if (isResponsivePosition) {
                    // ResponsivePosition format: use desktop breakpoint position
                    // Note: For Phase 4.2, we default to desktop. Future phases may use CSS media queries
                    // or client-side breakpoint detection for truly responsive positioning
                    const breakpointData = positioningData.breakpoints.desktop;
                    effectivePosition = {
                      x: parsePositionValue(breakpointData.x),
                      y: parsePositionValue(breakpointData.y),
                      zIndex: breakpointData.zIndex
                    };
                  } else {
                    // Legacy or simple absolute format
                    effectivePosition = {
                      x: parsePositionValue(positioningData.x),
                      y: parsePositionValue(positioningData.y),
                      zIndex: positioningData.zIndex
                    };
                  }

                  // Smart sizing detection based on component type
                  const componentType = island.component.toLowerCase();

                  // FIXED: Remove forced width/height constraints - let components size naturally
                  const containerStyle: React.CSSProperties = {
                    position: 'absolute',
                    left: `${effectivePosition.x}px`,
                    top: `${effectivePosition.y}px`,
                    zIndex: componentType === 'threadsteadnavigation'
                      ? 999998  // Navigation gets highest z-index so dropdowns render above other components
                      : (effectivePosition.zIndex || 1)
                    // Removed forced width/height - components will use their natural size
                  };

                  const positionedElement = React.createElement(
                    'div',
                    {
                      key: island.id,
                      style: containerStyle,
                      'data-component-id': island.id
                    },
                    renderedElement
                  );

                  onIslandRender(island.id);

                  // QUICK WIN #5: Cache the positioned element
                  memoCache.set(islandId, positionedElement);
                  return positionedElement;
                } else if (positioningData && positioningData.mode === 'grid') {
                  // Handle grid positioning from props
                  const gridStyle: React.CSSProperties = {
                    gridColumn: `${positioningData.column} / span ${positioningData.span || 1}`,
                    gridRow: `${positioningData.row} / span 1`,
                    zIndex: 1
                  };

                  const gridElement = React.createElement(
                    'div',
                    {
                      key: island.id,
                      style: gridStyle,
                      'data-component-id': island.id
                    },
                    renderedElement
                  );

                  onIslandRender(island.id);

                  // QUICK WIN #5: Cache the grid element
                  memoCache.set(islandId, gridElement);
                  return gridElement;
                } else {
                  // No positioning - render component normally
                  onIslandRender(island.id);

                  // QUICK WIN #5: Cache the rendered element
                  memoCache.set(islandId, renderedElement);
                  return renderedElement;
                }
              }
            } catch (error) {
              console.error(`❌ Error rendering island ${island.id}:`, error);
              onIslandError(error instanceof Error ? error : new Error(String(error)), island.id);
            }
          }
        }
        
        // Check if this is a registered component (but not an island)
        const tagName = element.tagName.toLowerCase();
        const elementComponentName = element.tagName; // Keep original case for component lookup
        const registration = componentRegistry.get(elementComponentName);

        // Debug: Check if this element has positioning data
        const hasPositioningData = element.hasAttribute('data-positioning-mode') ||
                                   element.hasAttribute('data-pixel-position') ||
                                   element.hasAttribute('data-position');
        if (hasPositioningData) {
        }

        if (registration) {
          // This is a registered component but not an island - render as component
          const Component = getComponent(elementComponentName);
          if (Component) {
            const props: any = {};

            // Copy attributes as props with centralized attribute normalization
            // This eliminates ~125 lines of duplicate attribute mapping code
            for (let i = 0; i < element.attributes.length; i++) {
              const attr = element.attributes[i];
              const propName = normalizeAttributeName(attr.name);

              // Special handling for style attribute - convert CSS string to React style object
              if (propName === 'style') {
                props[propName] = parseStyleString(attr.value);
              } else {
                props[propName] = attr.value;
              }
            }
            
            // Add a stable key for React reconciliation (FIXED: removed Math.random() to prevent infinite loops)
            props.key = `${elementComponentName}-${element.getAttribute('data-island') || 'component'}`;

            // Add Visual Builder flag when rendering in Visual Builder context
            if (isInVisualBuilder) {
              props._isInVisualBuilder = true;
            }

            // Recursively process children
            const children = Array.from(element.childNodes).map((child, index) =>
              domToReact(child, islands, residentData, onIslandRender, onIslandError, isNestedComponent, isInVisualBuilder)
            ).filter(child => child !== null && child !== '');

            const processedChildren = children.length > 0 ? children : undefined;

            // Check for absolute positioning data (same logic as template renderer)
            const positioningMode = props['data-positioning-mode'] || props['dataPositioningMode'];

            if (positioningMode === 'absolute') {

              let pixelPosition;
              const pixelPositionData = props['data-pixel-position'] || props['dataPixelPosition'];
              const positionData = props['data-position'] || props['dataPosition'];

              if (pixelPositionData) {
                try {
                  pixelPosition = JSON.parse(String(pixelPositionData));
                } catch (e) {
                  // Fallback to simple position format
                  if (positionData) {
                    const [x, y] = String(positionData).split(',').map(Number);
                    if (!isNaN(x) && !isNaN(y)) {
                      pixelPosition = { x, y, positioning: 'absolute' };
                    }
                  }
                }
              }

              // Apply _size properties to component props if they exist
              const componentProps = { ...props };
              if (props._size) {
                componentProps._positioningMode = 'absolute';
              }

              // Create component with absolute positioning wrapper
              const component = (
                <ResidentDataProvider data={residentData}>
                  <Component {...componentProps}>
                    {processedChildren}
                  </Component>
                </ResidentDataProvider>
              );

              if (pixelPosition && typeof pixelPosition.x === 'number' && typeof pixelPosition.y === 'number') {
                // Apply component size from _size prop if available
                const componentSize = componentProps._size;
                const containerStyle: React.CSSProperties = {
                  position: 'absolute',
                  left: `${pixelPosition.x}px`,
                  top: `${pixelPosition.y}px`,
                  zIndex: 1,
                };

                // Apply size properties if they exist
                if (componentSize) {
                  if (componentSize.width && componentSize.width !== 'auto') {
                    containerStyle.width = componentSize.width;
                  }
                  if (componentSize.height && componentSize.height !== 'auto') {
                    containerStyle.height = componentSize.height;
                  }
                }

                return React.createElement(
                  'div',
                  {
                    key: props.key,
                    style: containerStyle,
                    className: props.className as string,
                  },
                  component
                );
              } else {
                return component;
              }
            }

            // Default rendering without positioning
            // Apply _size properties to component props if they exist
            const componentProps = { ...props };
            if (props._size) {
              componentProps._positioningMode = 'absolute';
            }

            const component = (
              <ResidentDataProvider key={props.key} data={residentData}>
                <Component {...componentProps}>
                  {processedChildren}
                </Component>
              </ResidentDataProvider>
            );

            // Apply size styling if _size exists
            const componentSize = componentProps._size;
            if (componentSize) {
              const containerStyle: React.CSSProperties = {};

              if (componentSize.width && componentSize.width !== 'auto') {
                containerStyle.width = componentSize.width;
              }
              if (componentSize.height && componentSize.height !== 'auto') {
                containerStyle.height = componentSize.height;
              }

              if (Object.keys(containerStyle).length > 0) {
                return React.createElement('div', {
                  key: props.key,
                  style: containerStyle
                }, component);
              }
            }

            return component;
          }
        }
        
        // Regular HTML element - convert to React element
        const props: any = {};


        // Copy attributes
        for (let i = 0; i < element.attributes.length; i++) {
          const attr = element.attributes[i];
          let propName = attr.name;

          // Convert HTML attributes to React props
          if (propName === 'class') {
            propName = 'className';
            props[propName] = attr.value; // CRITICAL: Actually set the className prop!
          } else if (propName === 'style') {
            // Convert CSS string to React style object
            props[propName] = parseStyleString(attr.value);
          } else if (propName.includes('-')) {
            // PRESERVE positioning data attributes in original form for template renderer
            if (propName === 'data-positioning-mode' ||
                propName === 'data-pixel-position' ||
                propName === 'data-position' ||
                propName === 'data-grid-position') {
              // Keep these attributes as-is for positioning logic
              props[propName] = attr.value;
            } else {
              // Convert other kebab-case to camelCase
              propName = propName.replace(/-([a-z])/g, (match, letter) => letter.toUpperCase());
              props[propName] = attr.value;
            }
          } else {
            props[propName] = attr.value;
          }
        }
        
        // Add a stable key for React reconciliation (FIXED: use global counter for unique keys)
        props.key = `${tagName}-${keyCounter.value++}`;

        // Recursively process children
        const children = Array.from(element.childNodes).map((child, index) =>
          domToReact(child, islands, residentData, onIslandRender, onIslandError, isNestedComponent, isInVisualBuilder)
        ).filter(child => child !== null && child !== '');
        
        if (children.length === 0) {
          return React.createElement(tagName, props);
        } else if (children.length === 1 && typeof children[0] === 'string') {
          return React.createElement(tagName, props, children[0]);
        } else {
          return React.createElement(tagName, props, ...children);
        }
      }
      
      return null;
    };

    // Helper function to get component from registry
    const getComponent = (componentName: string) => {
      try {
        const registration = componentRegistry.get(componentName);
        if (registration) {
          return registration.component;
        }
        
        // Special cases for sub-components
        if (componentName === 'Tab') {
          const tabRegistration = componentRegistry.get('Tab');
          if (tabRegistration) {
            return tabRegistration.component;
          }
        }
        if (componentName === 'When') {
          const chooseRegistration = componentRegistry.get('Choose');
          if (chooseRegistration) {
            const ChooseComponent = chooseRegistration.component as any;
            return ChooseComponent.When || null;
          }
        }
        if (componentName === 'Otherwise') {
          const chooseRegistration = componentRegistry.get('Choose');
          if (chooseRegistration) {
            const ChooseComponent = chooseRegistration.component as any;
            return ChooseComponent.Otherwise || null;
          }
        }
        
        return null;
      } catch (error) {
        console.error(`Error loading component ${componentName}:`, error);
        return null;
      }
    };
    
    // Convert the entire DOM tree to React, replacing placeholders as we go
    const processedContent = Array.from(container.childNodes).map((node, index) =>
      domToReact(node, islands, residentData, onIslandRender, onIslandError, false, isInVisualBuilder)
    ).filter(child => child !== null && child !== '');

    // Return processed content
    return processedContent;
  };
  
  // Use useEffect to process the HTML after component mounts
  const [processedContent, setProcessedContent] = React.useState<React.ReactNode[]>([]);
  const [hydrationComplete, setHydrationComplete] = React.useState(false);
  
  React.useEffect(() => {
    try {
      const content = renderHTMLWithIslands();
      setProcessedContent(content);
      setHydrationComplete(true);
    } catch (error) {
      console.error('❌ Error processing HTML with islands:', error);
      // Fallback to the existing ProductionIslandRendererWithHTMLChildren approach
      
      // Use the existing parseHTMLToReactChildren approach as fallback
      const fallbackContent = [
        <div
          key="fallback-container"
          style={{
            position: 'relative',
            width: '100%',
            minHeight: '100vh',
            // Apply same responsive padding as Visual Builder canvas
            padding: `${getCurrentBreakpoint().containerPadding}px`,
            boxSizing: 'border-box'
          }}
          data-wysiwyg-padding={getCurrentBreakpoint().containerPadding}
          data-wysiwyg-breakpoint={getCurrentBreakpoint().name}
        >
          {islands.map(island => (
            <ProductionIslandRendererWithHTMLChildren
              key={island.id}
              island={island}
              allIslands={islands}
              residentData={residentData}
              htmlChildren={null}
              onIslandRender={onIslandRender}
              onIslandError={onIslandError}
            />
          ))}
        </div>
      ];
      setProcessedContent(fallbackContent);
    }
  }, [staticHTML, islands]);
  
  return (
    <>
      {processedContent}
    </>
  );
}

// Parse HTML content to React children
function parseHTMLToReactChildren(
  html: string, 
  allIslands: Island[], 
  residentData: ResidentData, 
  onIslandRender: (islandId: string) => void, 
  onIslandError: (error: Error, islandId: string) => void
): React.ReactNode {
  
  if (!html || html.trim() === '') {
    return null;
  }
  
  // Check if we're in a browser environment
  if (typeof document === 'undefined') {
    return null;
  }
  
  // Create a temporary div to parse the HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;

  // Process the parsed HTML nodes

  // Create a counter object to ensure unique keys across the entire tree
  const keyCounter = { value: 0 };

  // Convert DOM nodes to React elements
  return domToReact(tempDiv, allIslands, residentData, onIslandRender, onIslandError, false, keyCounter);
}

// Convert DOM nodes to React elements recursively
function domToReact(
  node: Node,
  allIslands: Island[],
  residentData: ResidentData,
  onIslandRender: (islandId: string) => void,
  onIslandError: (error: Error, islandId: string) => void,
  isInVisualBuilder = false,
  keyCounter = { value: 0 }
): React.ReactNode {
  // Text node
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent;
  }
  
  // Element node
  if (node.nodeType === Node.ELEMENT_NODE) {
    const element = node as Element;
    const tagName = element.tagName.toLowerCase();
    
    // Check if this is an island placeholder
    const islandId = element.getAttribute('data-island');
    if (islandId) {
      const island = allIslands.find(i => i.id === islandId);
      if (island) {
        // Parse the inner HTML of this island to get its HTML children
        const innerHTMLContent = element.innerHTML;
        const parsedInnerChildren = innerHTMLContent ? 
          parseHTMLToReactChildren(innerHTMLContent, allIslands, residentData, onIslandRender, onIslandError) : 
          null;
        
        return (
          <ProductionIslandRendererWithHTMLChildren 
            key={island.id}
            island={island}
            allIslands={allIslands}
            residentData={residentData}
            htmlChildren={parsedInnerChildren}
            onIslandRender={onIslandRender}
            onIslandError={onIslandError}
          />
        );
      }
    }
    
    // Regular HTML element - convert attributes (FIXED: use global counter for unique keys)
    const props: any = { key: `element-${element.tagName}-${keyCounter.value++}` };

    // Copy attributes as props with centralized attribute normalization
    // This eliminates another ~125 lines of duplicate attribute mapping code
    for (let i = 0; i < element.attributes.length; i++) {
      const attr = element.attributes[i];
      const propName = normalizeAttributeName(attr.name);

      // Special handling for style attribute - convert CSS string to React style object
      if (propName === 'style') {
        props[propName] = parseStyleString(attr.value);
      } else {
        props[propName] = attr.value;
      }
    }
    
    // Check if this is a grid container and enhance with CSS Grid styles
    const isGridContainer = props.className &&
                           (props.className.includes('template-container') &&
                            props.className.includes('grid-container'));

    if (isGridContainer) {

      // Parse existing style or create new one
      const existingStyle = props.style || '';
      const existingStyleObj = typeof existingStyle === 'string' ?
        parseStyleString(existingStyle) : existingStyle;

      // Extract grid configuration from style
      const gridColumns = existingStyleObj.gridTemplateColumns || 'repeat(12, 1fr)';
      const gridGap = existingStyleObj.gap || '16px';

      // Enhance with CSS Grid styles
      props.style = {
        ...existingStyleObj,
        display: 'grid',
        gridTemplateColumns: gridColumns,
        gap: gridGap,
        width: existingStyleObj.width || '800px',
        minHeight: existingStyleObj.minHeight || existingStyleObj.height || '600px',
      };

    }

    // Convert children recursively
    const children = Array.from(node.childNodes)
      .map(child => domToReact(child, allIslands, residentData, onIslandRender, onIslandError, isInVisualBuilder, keyCounter))
      .filter(child => child !== null && child !== '');

    // Create React element
    return React.createElement(tagName, props, ...children);
  }
  
  return null;
}

// Helper function to parse CSS style string into object
function parseStyleString(styleString: string): Record<string, string> {
  const styles: Record<string, string> = {};
  if (!styleString) return styles;

  styleString.split(';').forEach(declaration => {
    const colonIndex = declaration.indexOf(':');
    if (colonIndex > 0) {
      const property = declaration.slice(0, colonIndex).trim();
      const value = declaration.slice(colonIndex + 1).trim();
      if (property && value) {
        // Convert kebab-case to camelCase for React style objects
        const camelProperty = property.replace(/-([a-z])/g, (match, letter) => letter.toUpperCase());
        styles[camelProperty] = value;
      }
    }
  });

  return styles;
}

// Enhanced island renderer that combines island children with HTML children
// QUICK WIN #1: Memoized to prevent unnecessary re-renders
const ProductionIslandRendererWithHTMLChildren = React.memo(function ProductionIslandRendererWithHTMLChildren({
  island,
  allIslands,
  residentData,
  htmlChildren,
  onIslandRender,
  onIslandError
}: {
  island: Island,
  allIslands: Island[],
  residentData: ResidentData,
  htmlChildren: React.ReactNode,
  onIslandRender: (islandId: string) => void,
  onIslandError: (error: Error, islandId: string) => void
}) {
  try {
    const getComponent = (componentName: string) => {
      try {
        const registration = componentRegistry.get(componentName);
        if (registration) {
          return registration.component;
        }
        
        // Special cases for sub-components (keep existing logic)
        if (componentName === 'Tab') {
          const tabsRegistration = componentRegistry.get('Tabs');
          if (tabsRegistration) {
            const TabsComponent = tabsRegistration.component as any;
            return TabsComponent.Tab || null;
          }
        }
        if (componentName === 'When') {
          const chooseRegistration = componentRegistry.get('Choose');
          if (chooseRegistration) {
            const ChooseComponent = chooseRegistration.component as any;
            return ChooseComponent.When || null;
          }
        }
        if (componentName === 'Otherwise') {
          const chooseRegistration = componentRegistry.get('Choose');
          if (chooseRegistration) {
            const ChooseComponent = chooseRegistration.component as any;
            return ChooseComponent.Otherwise || null;
          }
        }
        
        return null;
      } catch (error) {
        onIslandError(error instanceof Error ? error : new Error(String(error)), island.id);
        return null;
      }
    };

    const Component = getComponent(island.component);
    if (!Component) {
      const error = new Error(`Component ${island.component} not found`);
      onIslandError(error, island.id);
      return (
        <div style={{ color: 'red', border: '1px solid red', padding: '4px' }}>
          Component {island.component} not found
        </div>
      );
    }

    // Combine island children (React components) with HTML children
    const islandChildren = island.children || [];
    let combinedChildren;
    
    if (htmlChildren) {
      // If we have HTML children, they already contain everything we need
      // (both static HTML and embedded React components from island placeholders)
      combinedChildren = htmlChildren;
    } else if (islandChildren.length > 0) {
      // Only island children (existing logic for Tabs, etc.)
      if (island.component === 'Tabs') {
        combinedChildren = islandChildren.map(childIsland => {
          if (childIsland.component === 'Tab') {
            const TabComponent = getComponent('Tab');
            if (TabComponent) {
              const tabChildren = childIsland.children || [];
              const tabContent = tabChildren.length > 0 ? (
                <>
                  {tabChildren.map(grandChild => (
                    <ProductionIslandRendererWithHTMLChildren 
                      key={grandChild.id}
                      island={grandChild}
                      allIslands={allIslands}
                      residentData={residentData}
                      htmlChildren={null}
                      onIslandRender={onIslandRender}
                      onIslandError={onIslandError}
                    />
                  ))}
                </>
              ) : 'Empty tab';
              return (
                <TabComponent key={childIsland.id} {...childIsland.props}>
                  {tabContent}
                </TabComponent>
              );
            }
          }
          
          return (
            <ProductionIslandRendererWithHTMLChildren 
              key={childIsland.id}
              island={childIsland}
              allIslands={allIslands}
              residentData={residentData}
              htmlChildren={null}
              onIslandRender={onIslandRender}
              onIslandError={onIslandError}
            />
          );
        });
      } else if (island.component === 'Choose') {
        combinedChildren = islandChildren.map(childIsland => {
          if (childIsland.component === 'When' || childIsland.component === 'Otherwise') {
            const ChildComponent = getComponent(childIsland.component);
            if (ChildComponent) {
              const conditionalChildren = childIsland.children || [];
              const conditionalContent = conditionalChildren.length > 0 ? (
                <>
                  {conditionalChildren.map(grandChild => (
                    <ProductionIslandRendererWithHTMLChildren 
                      key={grandChild.id}
                      island={grandChild}
                      allIslands={allIslands}
                      residentData={residentData}
                      htmlChildren={null}
                      onIslandRender={onIslandRender}
                      onIslandError={onIslandError}
                    />
                  ))}
                </>
              ) : '';
              return (
                <ChildComponent key={childIsland.id} {...childIsland.props}>
                  {conditionalContent}
                </ChildComponent>
              );
            }
          }
          
          return (
            <ProductionIslandRendererWithHTMLChildren 
              key={childIsland.id}
              island={childIsland}
              allIslands={allIslands}
              residentData={residentData}
              htmlChildren={null}
              onIslandRender={onIslandRender}
              onIslandError={onIslandError}
            />
          );
        });
      } else {
        // General case for other components with island children
        combinedChildren = (
          <>
            {islandChildren.map(childIsland => (
              <ProductionIslandRendererWithHTMLChildren 
                key={childIsland.id}
                island={childIsland}
                allIslands={allIslands}
                residentData={residentData}
                htmlChildren={null}
                onIslandRender={onIslandRender}
                onIslandError={onIslandError}
              />
            ))}
          </>
        );
      }
    } else if (htmlChildren) {
      // Only HTML children
      combinedChildren = htmlChildren;
    }

    // Apply _size properties to component props if they exist
    const componentProps = { ...island.props };

    // CRITICAL: Parse style if it's a string (islands may store style as string)
    if (typeof componentProps.style === 'string') {
      componentProps.style = parseStyleString(componentProps.style);
    }

    if (island.props._size) {
      componentProps._positioningMode = 'absolute';
    }

    onIslandRender(island.id);

    const component = (
      <ResidentDataProvider data={residentData}>
        <Component {...componentProps}>
          {combinedChildren}
        </Component>
      </ResidentDataProvider>
    );

    // Apply size styling if _size exists
    const componentSize = island.props._size;
    if (componentSize) {
      const containerStyle: React.CSSProperties = {};

      if (componentSize.width && componentSize.width !== 'auto') {
        containerStyle.width = componentSize.width;
      }
      if (componentSize.height && componentSize.height !== 'auto') {
        containerStyle.height = componentSize.height;
      }

      if (Object.keys(containerStyle).length > 0) {
        return React.createElement('div', {
          key: island.id,
          style: containerStyle
        }, component);
      }
    }

    return component;
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error(`ProductionIslandRendererWithHTMLChildren: Error in ${island.component}:`, err);
    onIslandError(err, island.id);
    return (
      <div style={{ color: 'red', border: '1px solid red', padding: '4px' }}>
        Error rendering {island.component}: {err.message}
      </div>
    );
  }
}, (prevProps, nextProps) => {
  // Custom comparison for React.memo optimization
  // Return true if props are equal (skip re-render), false if different (re-render)

  // Quick checks
  if (prevProps.island.id !== nextProps.island.id) return false;
  if (prevProps.island.component !== nextProps.island.component) return false;

  // Deep comparison of island props
  const prevPropsStr = JSON.stringify(prevProps.island.props);
  const nextPropsStr = JSON.stringify(nextProps.island.props);
  if (prevPropsStr !== nextPropsStr) return false;

  // Check residentData reference
  if (prevProps.residentData !== nextProps.residentData) return false;

  // Check htmlChildren reference (shallow comparison)
  if (prevProps.htmlChildren !== nextProps.htmlChildren) return false;

  // Props are equal - skip re-render
  return true;
});

function DirectIslandsRenderer({ 
  islands, 
  residentData, 
  onIslandRender, 
  onIslandError 
}: DirectIslandsRendererProps) {
  // All islands are root islands in this structure
  const rootIslands = islands;
  
  return (
    <div className="islands-container">
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
    </div>
  );
}

// Production island renderer (copy of SimpleIslandRenderer from preview)
// QUICK WIN #1: Memoized to prevent unnecessary re-renders when parent state changes
// Custom comparison ensures we only re-render when island props or data actually change
const ProductionIslandRenderer = React.memo(function ProductionIslandRenderer({
  island,
  allIslands,
  residentData,
  onIslandRender,
  onIslandError
}: {
  island: Island,
  allIslands: Island[],
  residentData: ResidentData,
  onIslandRender: (islandId: string) => void,
  onIslandError: (error: Error, islandId: string) => void
}) {
  try {
    const getComponent = (componentName: string) => {
      try {
        const registration = componentRegistry.get(componentName);
        if (registration) {
          return registration.component;
        }
        
        // Special cases for sub-components
        if (componentName === 'Tab') {
          const tabRegistration = componentRegistry.get('Tab');
          if (tabRegistration) {
            return tabRegistration.component;
          }
        }
        if (componentName === 'When') {
          const chooseRegistration = componentRegistry.get('Choose');
          if (chooseRegistration) {
            const ChooseComponent = chooseRegistration.component as any;
            return ChooseComponent.When || null;
          }
        }
        if (componentName === 'Otherwise') {
          const chooseRegistration = componentRegistry.get('Choose');
          if (chooseRegistration) {
            const ChooseComponent = chooseRegistration.component as any;
            return ChooseComponent.Otherwise || null;
          }
        }
        if (componentName === 'IfVisitor') {
          const ifOwnerRegistration = componentRegistry.get('IfOwner');
          if (ifOwnerRegistration) {
            const IfOwnerComponent = ifOwnerRegistration.component as any;
            return IfOwnerComponent.IfVisitor || null;
          }
        }
        
        return null;
      } catch (error) {
        console.error(`ProductionIslandRenderer: Error loading component ${componentName}:`, error);
        onIslandError(error instanceof Error ? error : new Error(String(error)), island.id);
        return null;
      }
    };

    const Component = getComponent(island.component);

    if (!Component) {
      const error = new Error(`Component ${island.component} not found`);
      onIslandError(error, island.id);
      return (
        <div style={{ color: 'red', border: '1px solid red', padding: '4px' }}>
          Component {island.component} not found
        </div>
      );
    }

    // Use children from island structure
    const childIslands = island.children || [];

    // Render child islands as children (same logic as preview)
    let children;
    
    if (childIslands.length > 0) {
      if (island.component === 'Tabs') {
        children = childIslands.map(childIsland => {
          if (childIsland.component === 'Tab') {
            const TabComponent = getComponent('Tab');
            if (TabComponent) {
              const tabChildren = childIsland.children || [];
              const tabContent = tabChildren.length > 0 ? (
                <>
                  {tabChildren.map(grandChild => (
                    <ProductionIslandRendererWithHTMLChildren 
                      key={grandChild.id}
                      island={grandChild}
                      allIslands={allIslands}
                      residentData={residentData}
                      htmlChildren={null}
                      onIslandRender={onIslandRender}
                      onIslandError={onIslandError}
                    />
                  ))}
                </>
              ) : 'Empty tab';

              return (
                <TabComponent key={childIsland.id} {...childIsland.props}>
                  {tabContent}
                </TabComponent>
              );
            }
          }
          
          return (
            <ProductionIslandRendererWithHTMLChildren 
              key={childIsland.id}
              island={childIsland}
              allIslands={allIslands}
              residentData={residentData}
              htmlChildren={null}
              onIslandRender={onIslandRender}
              onIslandError={onIslandError}
            />
          );
        });
      } else if (island.component === 'Choose') {
        // Special handling for Choose component - render When/Otherwise children directly
        children = childIslands.map(childIsland => {
          if (childIsland.component === 'When' || childIsland.component === 'Otherwise') {
            const ChildComponent = getComponent(childIsland.component);
            if (ChildComponent) {
              const conditionalChildren = childIsland.children || [];
              const conditionalContent = conditionalChildren.length > 0 ? (
                <>
                  {conditionalChildren.map(grandChild => (
                    <ProductionIslandRendererWithHTMLChildren 
                      key={grandChild.id}
                      island={grandChild}
                      allIslands={allIslands}
                      residentData={residentData}
                      htmlChildren={null}
                      onIslandRender={onIslandRender}
                      onIslandError={onIslandError}
                    />
                  ))}
                </>
              ) : '';

              return (
                <ChildComponent key={childIsland.id} {...childIsland.props}>
                  {conditionalContent}
                </ChildComponent>
              );
            }
          }
          
          return (
            <ProductionIslandRendererWithHTMLChildren 
              key={childIsland.id}
              island={childIsland}
              allIslands={allIslands}
              residentData={residentData}
              htmlChildren={null}
              onIslandRender={onIslandRender}
              onIslandError={onIslandError}
            />
          );
        });
      } else {
        children = (
          <>
            {childIslands.map(childIsland => (
              <ProductionIslandRenderer 
                key={childIsland.id}
                island={childIsland}
                allIslands={allIslands}
                residentData={residentData}
                onIslandRender={onIslandRender}
                onIslandError={onIslandError}
              />
            ))}
          </>
        );
      }
    } else {
    }

    // Apply _size properties to component props if they exist
    const componentProps = { ...island.props };

    // CRITICAL: Parse style if it's a string (islands may store style as string)
    if (typeof componentProps.style === 'string') {
      componentProps.style = parseStyleString(componentProps.style);
    }

    if (island.props._size) {
      componentProps._positioningMode = 'absolute';
    }

    onIslandRender(island.id);

    // No need to wrap in ResidentDataProvider - it's provided at root level
    const component = (
      <Component {...componentProps}>
        {children}
      </Component>
    );

    // Apply size styling if _size exists
    const componentSize = island.props._size;
    if (componentSize) {
      const containerStyle: React.CSSProperties = {};

      if (componentSize.width && componentSize.width !== 'auto') {
        containerStyle.width = componentSize.width;
      }
      if (componentSize.height && componentSize.height !== 'auto') {
        containerStyle.height = componentSize.height;
      }

      if (Object.keys(containerStyle).length > 0) {
        return React.createElement('div', {
          key: island.id,
          style: containerStyle
        }, component);
      }
    }

    return component;
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error(`ProductionIslandRenderer: Error in ${island.component}:`, err);
    onIslandError(err, island.id);
    return (
      <div style={{ color: 'red', border: '1px solid red', padding: '4px' }}>
        <strong>ProductionIslandRenderer Error:</strong> {err.message}
      </div>
    );
  }
}, (prevProps, nextProps) => {
  // Custom comparison for React.memo optimization
  // Return true if props are equal (skip re-render), false if different (re-render)

  // Quick checks for obvious changes
  if (prevProps.island.id !== nextProps.island.id) return false;
  if (prevProps.island.component !== nextProps.island.component) return false;

  // Deep comparison of island props (where most changes occur)
  const prevPropsStr = JSON.stringify(prevProps.island.props);
  const nextPropsStr = JSON.stringify(nextProps.island.props);
  if (prevPropsStr !== nextPropsStr) return false;

  // Check if residentData reference changed (usually stable per profile)
  if (prevProps.residentData !== nextProps.residentData) return false;

  // Props are equal - skip re-render
  return true;
});

// Static HTML renderer with island placeholders (LEGACY - UNUSED)
interface StaticHTMLRendererProps {
  html: string;
  islands: Island[];
  residentData: ResidentData;
  onIslandRender: (islandId: string) => void;
  onIslandError: (error: Error, islandId: string) => void;
}

function StaticHTMLRenderer({ 
  html, 
  islands, 
  residentData, 
  onIslandRender, 
  onIslandError 
}: StaticHTMLRendererProps) {
  const [mountedIslands, setMountedIslands] = useState<Set<string>>(new Set());

  // Create a map for quick island lookup
  const islandMap = useMemo(() => {
    const map = new Map<string, Island>();
    islands.forEach(island => {
      map.set(island.id, island);
    });
    return map;
  }, [islands]);

  return (
    <>
      {/* Static HTML content */}
      <div 
        dangerouslySetInnerHTML={{ __html: html }}
        data-profile-mode="advanced-islands"
        className="static-html-content"
      />
      
      {/* Render islands directly like in template editor with responsive padding to match Visual Builder */}
      <div
        className="profile-islands-container"
        style={{
          position: 'relative',
          width: '100%',
          minHeight: '100vh',
          // Apply same responsive padding as Visual Builder canvas
          padding: `${getCurrentBreakpoint().containerPadding}px`,
          boxSizing: 'border-box'
        }}
        data-wysiwyg-padding={getCurrentBreakpoint().containerPadding}
        data-wysiwyg-breakpoint={getCurrentBreakpoint().name}
      >
        {/* Only render root-level components */}
        {islands.map((island) => (
          <IslandErrorBoundary key={island.id} islandId={island.id}>
            <DirectIslandRenderer
              island={island}
              residentData={residentData}
            />
          </IslandErrorBoundary>
        ))}
      </div>
    </>
  );
}

// Fallback component when advanced rendering fails
interface AdvancedProfileFallbackProps {
  reason: string;
}

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

// Direct island renderer component with nested children support (from template editor)
function DirectIslandRenderer({ island, residentData }: { island: ExtendedIsland, residentData: ResidentData }) {
  const [Component, setComponent] = useState<React.ComponentType<Record<string, unknown>> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadComponent() {
      try {        
        // Get the component from registry
        const registration = componentRegistry.get(island.component);
        
        if (!registration) {
          throw new Error(`Component ${island.component} not found in registry`);
        }
        
        setComponent(() => registration.component);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error(`Failed to load component ${island.component}:`, errorMessage);
        setError(errorMessage);
      }
    }
    
    loadComponent();
  }, [island.component]);

  if (error) {
    return (
      <div className="island-error" style={{ color: 'red', padding: '8px', border: '1px solid red' }}>
        Error loading {island.component}: {error}
      </div>
    );
  }

  if (!Component) {
    return (
      <div className="island-loading" style={{ color: 'gray', padding: '8px' }}>
        Loading {island.component}...
      </div>
    );
  }

  // Render structured content (HTML + components)
  const renderStructuredContent = () => {
    if (!island.htmlStructure || island.htmlStructure.length === 0) {
      // Fallback to direct children rendering
      return island.children?.map((childIsland) => (
        <DirectIslandRenderer 
          key={childIsland.id}
          island={childIsland}
          residentData={residentData}
        />
      ));
    }

    const renderNode = (node: HtmlNode, index: number): React.ReactNode => {
      if (node.type === 'component') {
        // Find the component island by ID
        const childIsland = island.children?.find((child) => child.id === node.componentId);
        if (childIsland) {
          return (
            <DirectIslandRenderer 
              key={childIsland.id}
              island={childIsland}
              residentData={residentData}
            />
          );
        }
        return null;
      } else if (node.type === 'html') {
        const Tag = node.tagName as keyof React.JSX.IntrinsicElements;
        return (
          <Tag key={index} {...node.attributes}>
            {node.children?.map((child, childIndex) => 
              renderNode(child, childIndex)
            )}
          </Tag>
        );
      } else if (node.type === 'text') {
        return node.content;
      }
      return null;
    };

    return island.htmlStructure.map((node, index) => 
      renderNode(node, index)
    );
  };

  // Apply _size properties to component props if they exist
  const componentProps = { ...island.props };
  if (island.props._size) {
    componentProps._positioningMode = 'absolute';
  }

  const component = (
    <ResidentDataProvider data={residentData}>
      <Component {...componentProps}>
        {renderStructuredContent()}
      </Component>
    </ResidentDataProvider>
  );

  // Apply size styling if _size exists
  const componentSize = island.props._size;
  if (componentSize) {
    const containerStyle: React.CSSProperties = {};

    if (componentSize.width && componentSize.width !== 'auto') {
      containerStyle.width = componentSize.width;
    }
    if (componentSize.height && componentSize.height !== 'auto') {
      containerStyle.height = componentSize.height;
    }

    if (Object.keys(containerStyle).length > 0) {
      return React.createElement('div', {
        key: island.id,
        style: containerStyle
      }, component);
    }
  }

  return component;
}

// Error boundary for islands rendering
class IslandErrorBoundary extends React.Component<
  { children: React.ReactNode; islandId: string },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode; islandId: string }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`Island ${this.props.islandId} rendering error:`, error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="island-error-fallback" style={{
          padding: '16px',
          background: '#fee',
          border: '1px solid #fcc',
          borderRadius: '4px',
          color: '#c33'
        }}>
          <h4>Island Error ({this.props.islandId})</h4>
          <p>Something went wrong rendering this component.</p>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details style={{ marginTop: '8px' }}>
              <summary style={{ cursor: 'pointer' }}>Error Details</summary>
              <pre style={{
                marginTop: '8px',
                padding: '8px',
                background: '#fdd',
                borderRadius: '4px',
                fontSize: '12px',
                overflow: 'auto'
              }}>
                {this.state.error.stack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

// Development hydration debug info
interface HydrationDebugInfoProps {
  totalIslands: number;
  loadedIslands: Set<string>;
  failedIslands: Map<string, Error>;
  isHydrated: boolean;
}

function HydrationDebugInfo({ 
  totalIslands, 
  loadedIslands, 
  failedIslands, 
  isHydrated 
}: HydrationDebugInfoProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="hydration-debug-info">
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="debug-toggle"
      >
        🏝️ Islands Debug ({loadedIslands.size}/{totalIslands})
      </button>
      
      {isExpanded && (
        <div className="debug-panel">
          <div className="debug-stats">
            <div>Total Islands: {totalIslands}</div>
            <div>Loaded: {loadedIslands.size}</div>
            <div>Failed: {failedIslands.size}</div>
            <div>Hydrated: {isHydrated ? '✅' : '⏳'}</div>
          </div>
          
          {failedIslands.size > 0 && (
            <div className="debug-failures">
              <h4>Failed Islands:</h4>
              {Array.from(failedIslands.entries()).map(([islandId, error]) => (
                <div key={islandId} className="debug-failure">
                  <strong>{islandId}:</strong> {error.message}
                </div>
              ))}
            </div>
          )}
          
          <div className="debug-loaded">
            <h4>Loaded Islands:</h4>
            {Array.from(loadedIslands).map(islandId => (
              <div key={islandId} className="debug-loaded-item">
                ✅ {islandId}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}