// Advanced profile renderer with islands architecture
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { ProfileUser } from './ProfileModeRenderer';
import type { ResidentData } from '@/components/template/ResidentDataProvider';
import { ResidentDataProvider } from '@/components/template/ResidentDataProvider';
import type { CompiledTemplate, Island } from '@/lib/template-compiler';
import { componentRegistry } from '@/lib/template-registry';
import { generateOptimizedCSS, type CSSMode, type TemplateMode } from '@/lib/css-layers';
import { useSiteCSS } from '@/hooks/useSiteCSS';

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
  onFallback?: (reason: string) => void;
  onIslandsReady?: () => void;
  onIslandError?: (error: Error, islandId: string) => void;
}

// Advanced profile renderer component
export default function AdvancedProfileRenderer({ 
  user, 
  residentData, 
  onFallback,
  onIslandsReady,
  onIslandError
}: AdvancedProfileRendererProps) {
  const [isHydrated, setIsHydrated] = useState(false);
  const [hydrationError, setHydrationError] = useState<string | null>(null);
  
  const { css: siteWideCSS } = useSiteCSS();
  
  // Get compiled template from user profile
  const compiledTemplate = user.profile?.compiledTemplate as CompiledTemplate | null;
  const templateIslands = user.profile?.templateIslands as ExtendedIsland[] | null;
  const customCSS = user.profile?.customCSS;
  const cssMode = (user.profile?.cssMode || 'inherit') as CSSMode;

  // Create a unique ID for this profile to scope the CSS
  const profileId = useMemo(() => `profile-${user.id}-${Date.now()}`, [user.id]);

  // Get islands from compiled template or fallback to stored islands (memoized to avoid re-renders)
  const islands = useMemo(() => {
    return compiledTemplate?.islands || templateIslands || [];
  }, [compiledTemplate?.islands, templateIslands]);

  // Generate properly layered CSS instead of the !important nightmare
  const layeredCSS = useMemo(() => {
    console.log('AdvancedProfileRenderer: Generating layered CSS', {
      customCSSLength: customCSS?.length || 0,
      cssMode,
      profileId,
      hasSiteCSS: !!siteWideCSS
    });
    
    return generateOptimizedCSS({
      cssMode,
      templateMode: 'advanced',
      siteWideCSS: cssMode !== 'disable' ? siteWideCSS : '',
      userCustomCSS: customCSS || '',
      profileId
    });
  }, [customCSS, cssMode, profileId, siteWideCSS]);
  
  const islandIds = useMemo(() => islands.map(island => island.id), [islands]);

  // Use island manager to track hydration state (kept for debugging)
  const { loadedIslands, failedIslands, islandsReady } = useIslandManager(islandIds);

  // Handle island render success
  const handleIslandRender = useCallback((islandId: string) => {
    // Island rendered successfully
  }, []);

  // Handle island render errors
  const handleIslandError = useCallback((error: Error, islandId: string) => {
    console.error(`Island ${islandId} failed to render:`, error);
    onIslandError?.(error, islandId);
  }, [onIslandError]);

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

  // Notify when all islands are ready
  useEffect(() => {
    if (islandsReady) {
      onIslandsReady?.();
    }
  }, [islandsReady, islands.length, loadedIslands.size, failedIslands.size, onIslandsReady]);

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
    <>
      {/* Layered CSS styles - no more !important nightmare! */}
      {layeredCSS && (
        <style dangerouslySetInnerHTML={{ __html: layeredCSS }} />
      )}
      
      {/* No wrapper div - let advanced templates control their own layout completely */}
      <ProfileContentRenderer 
        compiledTemplate={compiledTemplate}
        islands={islands}
        residentData={residentData}
        onIslandRender={handleIslandRender}
        onIslandError={handleIslandError}
      />
      
      {/* Hydration status indicator (dev mode only) - positioned absolutely to avoid layout interference */}
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
    </>
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
}

function ProfileContentRenderer({ 
  compiledTemplate,
  islands, 
  residentData, 
  onIslandRender, 
  onIslandError 
}: ProfileContentRendererProps) {
  // Same logic as preview's renderIslandsDirectly
  if (!compiledTemplate) {
    return <div className="p-4 text-gray-500">No template compiled</div>;
  }

  const hasIslands = islands && islands.length > 0;
  const hasStaticHTML = compiledTemplate.staticHTML && compiledTemplate.staticHTML.trim();

  console.log('ProfileContentRenderer debug:', {
    hasIslands,
    islandsLength: islands?.length || 0,
    hasStaticHTML,
    staticHTMLLength: compiledTemplate.staticHTML?.length || 0,
    bothPresent: hasIslands && hasStaticHTML,
    firstIsland: islands?.[0],
    islandIds: islands?.map(i => i.id),
    compiledTemplate: compiledTemplate
  });

  if (!hasIslands && !hasStaticHTML) {
    return <div className="p-4 text-gray-500">No content to render</div>;
  }

  // NEW APPROACH: Render static HTML first, then hydrate islands into placeholders
  if (hasIslands && hasStaticHTML) {
    console.log('Rendering static HTML with islands hydrated into placeholders');
    
    // Create a combined approach: render static HTML and replace placeholders with islands
    return (
      <StaticHTMLWithIslands 
        staticHTML={compiledTemplate.staticHTML}
        islands={islands}
        residentData={residentData}
        onIslandRender={onIslandRender}
        onIslandError={onIslandError}
      />
    );
  }

  // Fallback: If we only have islands (no static HTML), render them directly
  if (hasIslands) {
    console.log('Rendering islands only (no static HTML)');
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
    console.log('Rendering static HTML only');
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
}

function StaticHTMLWithIslands({ 
  staticHTML, 
  islands, 
  residentData, 
  onIslandRender, 
  onIslandError 
}: StaticHTMLWithIslandsProps) {
  // Create a map of island ID to island data for quick lookup
  const islandMap = new Map(islands.map(island => [island.id, island]));
  
  // Parse static HTML and replace placeholders with React components
  const renderHTMLWithIslands = () => {
    // Create a temporary div to parse the HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = staticHTML;
    
    // Find all island placeholders
    const placeholders = tempDiv.querySelectorAll('[data-island]');
    console.log('Found placeholders:', placeholders.length);
    
    // Replace each placeholder with a React component placeholder
    const replacements: Array<{id: string, component: React.ReactElement}> = [];
    
    placeholders.forEach(placeholder => {
      const islandId = placeholder.getAttribute('data-island');
      const componentName = placeholder.getAttribute('data-component');
      
      if (islandId && islandMap.has(islandId)) {
        const island = islandMap.get(islandId)!;
        console.log(`Replacing placeholder for ${componentName} (${islandId})`);
        
        // Create a unique marker for this island
        const markerId = `ISLAND_MARKER_${islandId}`;
        placeholder.outerHTML = `<div data-react-placeholder="${markerId}"></div>`;
        
        // Create the React component for this island
        const component = (
          <ProductionIslandRenderer 
            key={island.id}
            island={island}
            allIslands={islands}
            residentData={residentData}
            onIslandRender={onIslandRender}
            onIslandError={onIslandError}
          />
        );
        
        replacements.push({ id: markerId, component });
      }
    });
    
    // Get the modified HTML
    const processedHTML = tempDiv.innerHTML;
    
    // Now we need to render this HTML with React components embedded
    // For now, let's use a simpler approach: split the HTML at placeholders
    const parts = [];
    let lastIndex = 0;
    
    replacements.forEach(({ id, component }, index) => {
      const markerHTML = `<div data-react-placeholder="${id}"></div>`;
      const markerIndex = processedHTML.indexOf(markerHTML, lastIndex);
      
      if (markerIndex !== -1) {
        // Add HTML before the marker
        if (markerIndex > lastIndex) {
          const htmlPart = processedHTML.substring(lastIndex, markerIndex);
          parts.push(
            <div 
              key={`html-${index}`}
              dangerouslySetInnerHTML={{ __html: htmlPart }}
            />
          );
        }
        
        // Add the React component
        parts.push(component);
        
        lastIndex = markerIndex + markerHTML.length;
      }
    });
    
    // Add remaining HTML after the last marker
    if (lastIndex < processedHTML.length) {
      const remainingHTML = processedHTML.substring(lastIndex);
      parts.push(
        <div 
          key="html-final"
          dangerouslySetInnerHTML={{ __html: remainingHTML }}
        />
      );
    }
    
    return parts;
  };
  
  // Use useEffect to process the HTML after component mounts
  const [processedContent, setProcessedContent] = React.useState<React.ReactElement[]>([]);
  
  React.useEffect(() => {
    try {
      const content = renderHTMLWithIslands();
      setProcessedContent(content);
    } catch (error) {
      console.error('Error processing HTML with islands:', error);
      // Fallback to static HTML only
      setProcessedContent([
        <div 
          key="fallback"
          className="static-html-content"
          dangerouslySetInnerHTML={{ __html: staticHTML }}
        />
      ]);
    }
  }, [staticHTML, islands]);
  
  return (
    <>
      {processedContent}
    </>
  );
}

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
function ProductionIslandRenderer({ 
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
                    <ProductionIslandRenderer 
                      key={grandChild.id}
                      island={grandChild}
                      allIslands={allIslands}
                      residentData={residentData}
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
            <ProductionIslandRenderer 
              key={childIsland.id}
              island={childIsland}
              allIslands={allIslands}
              residentData={residentData}
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
                    <ProductionIslandRenderer 
                      key={grandChild.id}
                      island={grandChild}
                      allIslands={allIslands}
                      residentData={residentData}
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
            <ProductionIslandRenderer 
              key={childIsland.id}
              island={childIsland}
              allIslands={allIslands}
              residentData={residentData}
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
    }

    onIslandRender(island.id);
    
    return (
      <ResidentDataProvider data={residentData}>
        <Component {...island.props}>
          {children}
        </Component>
      </ResidentDataProvider>
    );
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
}

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

  console.log('StaticHTMLRenderer: Initializing with:', {
    htmlLength: html.length,
    islandsCount: islands.length,
    residentDataKeys: Object.keys(residentData)
  });

  // Create a map for quick island lookup
  const islandMap = useMemo(() => {
    const map = new Map<string, Island>();
    islands.forEach(island => {
      map.set(island.id, island);
    });
    return map;
  }, [islands]);

  // Note: We no longer need complex hydration effects since we're using direct rendering

  console.log('StaticHTMLRenderer: About to render HTML:', html.substring(0, 200) + '...');

  return (
    <>
      {/* Static HTML content */}
      <div 
        dangerouslySetInnerHTML={{ __html: html }}
        data-profile-mode="advanced-islands"
        className="static-html-content"
      />
      
      {/* Render islands directly like in template editor */}
      <div className="profile-islands-container">
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
        console.log(`Loading component ${island.component} for profile rendering`, { hasChildren: (island.children?.length ?? 0) > 0 });
        
        // Get the component from registry
        const registration = componentRegistry.get(island.component);
        
        if (!registration) {
          throw new Error(`Component ${island.component} not found in registry`);
        }
        
        setComponent(() => registration.component);
        console.log(`Successfully loaded ${island.component}`);
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

  return (
    <ResidentDataProvider data={residentData}>
      <Component {...island.props}>
        {renderStructuredContent()}
      </Component>
    </ResidentDataProvider>
  );
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