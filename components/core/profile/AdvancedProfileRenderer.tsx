// Advanced profile renderer with islands architecture
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { ProfileUser } from './ProfileModeRenderer';
import type { ResidentData } from '@/components/features/templates/ResidentDataProvider';
import { ResidentDataProvider } from '@/components/features/templates/ResidentDataProvider';
import type { CompiledTemplate, Island } from '@/lib/templates/compilation/compiler';
import { componentRegistry } from '@/lib/templates/core/template-registry';
import { generateOptimizedCSS, type CSSMode, type TemplateMode } from '@/lib/utils/css/layers';
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
    return generateOptimizedCSS({
      cssMode,
      templateMode: 'advanced',
      siteWideCSS: cssMode !== 'disable' ? siteWideCSS : '',
      userCustomCSS: customCSS || '',
      profileId
    });
  }, [customCSS, cssMode, profileId, siteWideCSS]);
  
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

  // Notify when all islands are ready
  useEffect(() => {
    if (islandsReady) {
      onIslandsReady?.();
    }
  }, [islandsReady, islands.length, loadedIslands.size, failedIslands.size, onIslandsReady]);

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
    
    // Instead of regex, parse the HTML properly and work with the DOM tree
    if (typeof document === 'undefined') {
      return [<div key="fallback" dangerouslySetInnerHTML={{ __html: staticHTML }} />];
    }
    
    // Parse the entire static HTML into a DOM tree
    const container = document.createElement('div');
    container.innerHTML = staticHTML;
    
    // Find all island placeholders in the DOM tree
    const placeholders = container.querySelectorAll('[data-island]');
    
    // Helper function to convert DOM node to React element
    const domToReact = (node: Node, islands: Island[], residentData: any, onIslandRender: (islandId: string) => void, onIslandError: (error: Error, islandId: string) => void): React.ReactNode => {
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
          const island = islands.find(i => i.id === islandId);
          if (island) {
            
            try {
              const Component = getComponent(island.component);
              if (Component) {
                // Recursively process children inside this island placeholder
                const childElements = Array.from(element.childNodes).map((child, index) => 
                  domToReact(child, islands, residentData, onIslandRender, onIslandError)
                ).filter(child => child !== null && child !== '');
                
                // Parse children for component props
                
                const processedChildren = childElements.length > 0 ? childElements : undefined;
                
                const renderedElement = (
                  <ResidentDataProvider key={island.id} data={residentData}>
                    <Component 
                      {...island.props}
                    >
                      {processedChildren}
                    </Component>
                  </ResidentDataProvider>
                );
                
                onIslandRender(island.id);
                return renderedElement;
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
        
        if (registration) {
          // This is a registered component but not an island - render as component
          const Component = getComponent(elementComponentName);
          if (Component) {
            const props: any = {};
            
            // Copy attributes as props
            for (let i = 0; i < element.attributes.length; i++) {
              const attr = element.attributes[i];
              let propName = attr.name;
              
              // Convert HTML attributes to React props
              if (propName === 'class') {
                propName = 'className';
              } else if (propName.includes('-')) {
                // Convert kebab-case to camelCase for data attributes and others
                propName = propName.replace(/-([a-z])/g, (match, letter) => letter.toUpperCase());
              }
              
              props[propName] = attr.value;
            }
            
            // Add a key for React reconciliation
            props.key = `${elementComponentName}-${Math.random().toString(36).substr(2, 9)}`;
            
            // Recursively process children
            const children = Array.from(element.childNodes).map((child, index) => 
              domToReact(child, islands, residentData, onIslandRender, onIslandError)
            ).filter(child => child !== null && child !== '');
            
            const processedChildren = children.length > 0 ? children : undefined;
            
            return (
              <ResidentDataProvider key={props.key} data={residentData}>
                <Component {...props}>
                  {processedChildren}
                </Component>
              </ResidentDataProvider>
            );
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
          } else if (propName.includes('-')) {
            // Convert kebab-case to camelCase for data attributes and others
            propName = propName.replace(/-([a-z])/g, (match, letter) => letter.toUpperCase());
          }
          
          props[propName] = attr.value;
        }
        
        // Add a key for React reconciliation
        props.key = `${tagName}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Recursively process children
        const children = Array.from(element.childNodes).map((child, index) => 
          domToReact(child, islands, residentData, onIslandRender, onIslandError)
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
      domToReact(node, islands, residentData, onIslandRender, onIslandError)
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
        <div key="fallback-container">
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
  
  // Convert DOM nodes to React elements
  return domToReact(tempDiv, allIslands, residentData, onIslandRender, onIslandError);
}

// Convert DOM nodes to React elements recursively
function domToReact(
  node: Node, 
  allIslands: Island[], 
  residentData: ResidentData, 
  onIslandRender: (islandId: string) => void, 
  onIslandError: (error: Error, islandId: string) => void
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
    
    // Regular HTML element - convert attributes
    const props: any = { key: Math.random() };
    for (let i = 0; i < element.attributes.length; i++) {
      const attr = element.attributes[i];
      let propName = attr.name;
      
      // Convert HTML attributes to React props
      if (propName === 'class') propName = 'className';
      if (propName === 'for') propName = 'htmlFor';
      
      props[propName] = attr.value;
    }
    
    // Convert children recursively
    const children = Array.from(node.childNodes)
      .map(child => domToReact(child, allIslands, residentData, onIslandRender, onIslandError))
      .filter(child => child !== null && child !== '');
    
    // Create React element
    return React.createElement(tagName, props, ...children);
  }
  
  return null;
}

// Enhanced island renderer that combines island children with HTML children
function ProductionIslandRendererWithHTMLChildren({ 
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

    
    onIslandRender(island.id);
    
    return (
      <ResidentDataProvider data={residentData}>
        <Component {...island.props}>
          {combinedChildren}
        </Component>
      </ResidentDataProvider>
    );
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