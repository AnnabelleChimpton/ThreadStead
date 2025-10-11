// Island renderer components for production template rendering

import React, { useState, useEffect, useMemo } from 'react';
import type { Island } from '@/lib/templates/compilation/compiler';
import type { ResidentData } from '@/components/features/templates/ResidentDataProvider';
import { ResidentDataProvider } from '@/components/features/templates/ResidentDataProvider';
import { componentRegistry } from '@/lib/templates/core/template-registry';
import { getCurrentBreakpoint } from '@/lib/templates/visual-builder/grid-utils';
import type { ExtendedIsland, HtmlNode, DirectIslandsRendererProps } from './types';
import { parseStyleString } from './DOMConversionUtils';
import { IslandErrorBoundary } from './IslandErrorBoundary';

// Enhanced island renderer that combines island children with HTML children
// QUICK WIN #1: Memoized to prevent unnecessary re-renders
export const ProductionIslandRendererWithHTMLChildren = React.memo(function ProductionIslandRendererWithHTMLChildren({
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

// Production island renderer (copy of SimpleIslandRenderer from preview)
// QUICK WIN #1: Memoized to prevent unnecessary re-renders when parent state changes
// Custom comparison ensures we only re-render when island props or data actually change
export const ProductionIslandRenderer = React.memo(function ProductionIslandRenderer({
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

// Direct islands renderer
export function DirectIslandsRenderer({
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

// Direct island renderer component with nested children support (from template editor)
export function DirectIslandRenderer({ island, residentData }: { island: ExtendedIsland, residentData: ResidentData }) {
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

// Static HTML renderer with island placeholders (LEGACY - UNUSED)
export function StaticHTMLRenderer({
  html,
  islands,
  residentData,
  onIslandRender,
  onIslandError
}: {
  html: string;
  islands: Island[];
  residentData: ResidentData;
  onIslandRender: (islandId: string) => void;
  onIslandError: (error: Error, islandId: string) => void;
}) {
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
