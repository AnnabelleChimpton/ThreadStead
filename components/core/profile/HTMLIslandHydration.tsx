// Static HTML processing with island placeholder replacement
// This is the core HTML-to-React conversion with positioning logic

import React from 'react';
import type { Island } from '@/lib/templates/compilation/compiler';
import type { ResidentData } from '@/components/features/templates/ResidentDataProvider';
import { ResidentDataProvider } from '@/components/features/templates/ResidentDataProvider';
import { componentRegistry } from '@/lib/templates/core/template-registry';
import { normalizeAttributeName } from '@/lib/templates/core/attribute-mappings';
import { separateCSSProps, applyCSSProps } from '@/lib/templates/styling/universal-css-props';
import { getCurrentBreakpoint } from '@/lib/templates/visual-builder/grid-utils';
import type { StaticHTMLWithIslandsProps } from './types';
import { parseStyleString } from './DOMConversionUtils';
import { ProductionIslandRendererWithHTMLChildren } from './IslandRenderers';
import { IslandErrorBoundary } from './IslandErrorBoundary';
// P2.2: Positioning Strategy Pattern
import { positioningRegistry } from '@/lib/templates/positioning';

/**
 * Strip positioning properties from a style object
 * Used when positioning is handled by wrapper (via positioning strategies)
 *
 * When a component has positioning data (_positioning prop), the positioning strategy
 * creates a wrapper div with positioning. The component itself should NOT have
 * positioning in its inline style, as this would cause double positioning.
 */
function stripPositioningFromStyle(style: React.CSSProperties): React.CSSProperties {
  const {
    position,
    top,
    right,
    bottom,
    left,
    zIndex,
    ...cleanedStyle
  } = style;
  return cleanedStyle;
}

/**
 * Strip positioning properties from component props (flat CSS props AND style property)
 * Visual Builder HTML includes inline positioning styles that get parsed as flat props.
 * We need to remove these BEFORE separateCSSProps processes them.
 *
 * CRITICAL: Also strips positioning from the style property (string or object)
 * because separateCSSProps will parse style strings and merge them into cssProps.
 */
function stripPositioningFromProps(props: Record<string, any>): Record<string, any> {
  const {
    position,
    top,
    right,
    bottom,
    left,
    zIndex,
    ...cleanedProps
  } = props;

  // CRITICAL FIX: Also strip positioning from the style property
  // separateCSSProps parses style strings and merges them into cssProps
  // So we must clean the style property to prevent positioning from being re-extracted
  if (cleanedProps.style) {
    if (typeof cleanedProps.style === 'string') {
      // Parse style string, strip positioning, convert back to string
      const parsedStyle = parseStyleString(cleanedProps.style);
      const cleanedStyle = stripPositioningFromStyle(parsedStyle);

      // Convert back to style string (only if there are remaining styles)
      const styleEntries = Object.entries(cleanedStyle);
      if (styleEntries.length > 0) {
        cleanedProps.style = styleEntries
          .map(([key, value]) => {
            // Convert camelCase to kebab-case
            const kebabKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
            return `${kebabKey}: ${value}`;
          })
          .join('; ');
      } else {
        // No styles left after stripping, remove style property
        delete cleanedProps.style;
      }
    } else if (typeof cleanedProps.style === 'object') {
      // Style is already an object, strip positioning
      cleanedProps.style = stripPositioningFromStyle(cleanedProps.style);

      // Remove style property if empty
      if (Object.keys(cleanedProps.style).length === 0) {
        delete cleanedProps.style;
      }
    }
  }

  return cleanedProps;
}

// Component that renders static HTML and replaces placeholders with actual islands
export function StaticHTMLWithIslands({
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

      // Visual Builder container creation logic (SSR)
      // NOTE: We no longer inject VB classes into inner HTML - only outer profile-template-root has them
      // This prevents redundant backgrounds and cleaner rendering
      if (templateType === 'visual-builder' && visualBuilderClasses.length > 0) {
        const vbClassString = visualBuilderClasses.join(' ');
        const hasPositioningContainer = processedHTML.includes('pure-absolute-container') ||
                                       processedHTML.includes('advanced-template-container');
        const hasProfileId = processedHTML.includes(`id="${profileId}"`);

        // Create container if we don't have a proper positioning container
        if (!hasPositioningContainer) {
          const idAttr = profileId ? ` id="${profileId}"` : '';
          const classAttr = `class="pure-absolute-container"`;  // No VB classes here - outer div has them
          processedHTML = `<div${idAttr} ${classAttr}>${processedHTML}</div>`;
        }
      }

      return [<div key="fallback" dangerouslySetInnerHTML={{ __html: processedHTML }} />];
    }

    // Parse the entire static HTML into a DOM tree
    const container = document.createElement('div');

    // Visual Builder container creation logic (client-side)
    // NOTE: We no longer inject VB classes into inner HTML - only outer profile-template-root has them
    // This prevents redundant backgrounds and cleaner rendering
    let processedHTML = staticHTML;
    if (templateType === 'visual-builder' && visualBuilderClasses.length > 0) {
      const hasPositioningContainer = processedHTML.includes('pure-absolute-container') ||
                                     processedHTML.includes('advanced-template-container');
      const hasProfileId = processedHTML.includes(`id="${profileId}"`);

      // If we already have a positioning container, add ID to it (but NOT VB classes)
      if (hasPositioningContainer && !hasProfileId && profileId) {
        // Add ID to the existing positioning container
        processedHTML = processedHTML.replace(
          /<div([^>]*class="[^"]*(?:pure-absolute-container|advanced-template-container)[^"]*"[^>]*)>/,
          `<div id="${profileId}"$1>`
        );
      } else if (!hasPositioningContainer) {
        // Only create a new wrapper if there's no positioning container at all
        const idAttr = profileId ? ` id="${profileId}"` : '';
        const classAttr = `class="pure-absolute-container"`;  // No VB classes here - outer div has them
        processedHTML = `<div${idAttr} ${classAttr}>${processedHTML}</div>`;
      }
    }

    // Parse HTML into DOM tree first
    container.innerHTML = processedHTML;

    // CRITICAL FIX: Make inner container background transparent when VB theme/pattern exists
    // This ensures only the outer profile-template-root shows the theme/pattern background
    // Prevents redundant backgrounds and ensures consistent rendering
    const hasThemeOrPattern = visualBuilderClasses.some(cls =>
      cls.startsWith('vb-theme-') || cls.startsWith('vb-pattern-')
    );

    if (hasThemeOrPattern) {
      // Find container divs with positioning classes
      const containerDivs = container.querySelectorAll('.pure-absolute-container, .advanced-template-container');
      containerDivs.forEach(div => {
        const elem = div as HTMLElement;
        // Remove any existing background-color
        if (elem.style.backgroundColor) {
          elem.style.removeProperty('background-color');
        }
        // Set to transparent to show outer theme/pattern through
        elem.style.backgroundColor = 'transparent';

        // CRITICAL: Remove VB classes from inner container's className
        // These are baked into staticHTML from database and create redundancy
        const classList = Array.from(elem.classList);
        const vbClasses = classList.filter(cls =>
          cls.startsWith('vb-theme-') ||
          cls.startsWith('vb-pattern-') ||
          cls.startsWith('vb-effect-')
        );

        vbClasses.forEach(vbClass => {
          elem.classList.remove(vbClass);
        });
      });
    }

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

                // CRITICAL FIX: Strip positioning from flat props BEFORE processing
                // Visual Builder HTML has inline positioning (position: absolute; left: X; top: Y)
                // which gets parsed as flat props. We must remove these to avoid double positioning.
                const cleanedIslandProps = positioningData
                  ? stripPositioningFromProps(island.props)
                  : island.props;

                // CRITICAL FIX: Add CSS properties to the style prop for legacy components
                // while keeping them as flat props for standardized components
                //
                // Legacy components (Heading, TextElement) expect CSS in 'style' prop
                // Standardized components (GridLayout, Paragraph) use separateCSSProps internally
                const { cssProps, componentProps: otherProps } = separateCSSProps(cleanedIslandProps);
                const generatedStyles = applyCSSProps(cssProps);

                // Merge with existing style prop (user may have custom styles in the style prop)
                // CRITICAL: Parse style if it's a string (islands may store style as string)
                const existingStyle = typeof cleanedIslandProps.style === 'string'
                  ? parseStyleString(cleanedIslandProps.style)
                  : (cleanedIslandProps.style as React.CSSProperties) || {};

                // NEW: Strip positioning styles if component has positioning data
                // The positioning strategy creates a wrapper with positioning, so the component
                // itself should NOT have positioning styles (prevents double positioning)
                const shouldStripPositioning = positioningData !== undefined;
                const cleanedExistingStyle = shouldStripPositioning
                  ? stripPositioningFromStyle(existingStyle)
                  : existingStyle;

                const finalStyles = {
                  ...cleanedExistingStyle, // Use cleaned style (no positioning)
                  ...generatedStyles
                };

                // Create base component with props and set positioning mode
                // KEEP both flat CSS props AND merged style for compatibility:
                // - Standardized components will use separateCSSProps and ignore flat CSS props
                // - Legacy components will use the style prop
                // Use cleanedIslandProps (positioning already stripped from flat props)
                const componentProps: any = {
                  ...cleanedIslandProps, // Use cleaned props (no positioning in flat props)
                  style: finalStyles // Add/override with merged styles for legacy components
                };

                // Set positioning mode for components that have positioning data
                if (positioningData) {
                  componentProps._positioningMode = 'absolute';
                }

                // P3.3: Wrap island in error boundary for graceful error handling
                const renderedElement = (
                  <IslandErrorBoundary islandId={island.id} key={island.id}>
                    <ResidentDataProvider data={residentData}>
                      <Component
                        {...componentProps}
                      >
                        {processedChildren}
                      </Component>
                    </ResidentDataProvider>
                  </IslandErrorBoundary>
                );

                // P2.2: Apply positioning using strategy pattern
                // This replaces 100+ lines of conditional positioning logic with a clean
                // delegation to specialized positioning strategies
                const positionedElement = positioningRegistry.applyPositioning(
                  renderedElement,
                  {
                    island,
                    isNestedComponent,
                  },
                  {
                    componentType: island.component.toLowerCase(),
                    islandId: island.id,
                  }
                );

                // Notify that island has been rendered
                onIslandRender(island.id);

                // QUICK WIN #5: Cache the positioned element
                memoCache.set(islandId, positionedElement);
                return positionedElement;
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
