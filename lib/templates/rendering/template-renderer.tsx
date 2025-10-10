import React from 'react';
import { componentRegistry, validateAndCoerceProps } from '../core/template-registry';
import type { TemplateNode } from '../compilation/template-parser';
import { ResidentDataProvider } from '@/components/features/templates/ResidentDataProvider';
import GridCompatibleWrapper from '@/components/features/templates/GridCompatibleWrapper';
import { isGridCompatible, getComponentGridBehavior } from '../visual-builder/grid-compatibility';

/**
 * Convert kebab-case to camelCase
 * greater-than → greaterThan
 * less-than-or-equal → lessThanOrEqual
 */
function kebabToCamelCase(str: string): string {
  return str.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Normalize property keys from HTML attributes to React props
 * Handles both kebab-case and lowercase conversion to camelCase
 */
function normalizeProps(props: Record<string, unknown>): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(props)) {
    // Convert kebab-case to camelCase (e.g., greater-than → greaterThan)
    const camelKey = kebabToCamelCase(key);
    normalized[camelKey] = value;
  }

  return normalized;
}

// Transform AST to React elements
export function transformNodeToReact(node: TemplateNode, key?: string | number): React.ReactNode {
  if (node.type === 'text') {
    return node.value;
  }

  if (node.type === 'root') {
    const children = node.children?.map((child, index) =>
      transformNodeToReact(child, index)
    );
    return children;
  }

  if (node.type === 'element' && node.tagName) {
    const tagName = node.tagName;
    
    // Check if this is a registered component (try both original and capitalized)
    let componentRegistration = componentRegistry.get(tagName);
    
    if (!componentRegistration && tagName) {
      // Try case-insensitive match with registered components
      const allTags = componentRegistry.getAllowedTags();
      const exactMatch = allTags.find(tag => tag.toLowerCase() === tagName.toLowerCase());
      if (exactMatch) {
        componentRegistration = componentRegistry.get(exactMatch);
      }
    }
    
    if (componentRegistration) {
      // Transform custom component
      const { component: Component, props: propSchemas } = componentRegistration;

      // DEBUG: Log node properties for Show component
      if (tagName === 'Show') {
        console.log('[transformNodeToReact] Show node.properties:', node.properties);
      }

      // Extract and normalize props from properties (kebab-case → camelCase)
      const rawProps = normalizeProps({ ...node.properties });
      
      // Handle className/class attributes specially
      if (rawProps.class && !rawProps.className) {
        rawProps.className = rawProps.class;
        delete rawProps.class;
      }
      
      // Handle children for components that support them (like Tabs)
      const children = node.children?.map((child, index) =>
        transformNodeToReact(child, index)
      );

      // Validate props with context about children and component type
      const validatedProps = validateAndCoerceProps(rawProps, propSchemas, {
        hasChildren: children && children.length > 0,
        componentType: tagName
      });
      
      try {
        // Use a cleaner approach to create React elements
        const props = { ...validatedProps };
        if (key !== undefined) props.key = key;
        
        // Check positioning mode and handle accordingly (support both kebab-case and camelCase)
        const positioningMode = rawProps['data-positioning-mode'] || rawProps['dataPositioningMode'];

        // NEW FORMAT: Check for individual positioning attributes (data-x, data-y)
        const hasNewPositioningFormat = rawProps['data-x'] !== undefined || rawProps['dataX'] !== undefined;

        if (hasNewPositioningFormat) {
          // New positioning format with inline styles already present in the style prop
          // Just render the component normally - positioning is already in the style attribute
          return React.createElement(Component, { ...props, key }, ...(children || []));
        } else if (positioningMode === 'absolute') {
          // OLD FORMAT: Handle legacy absolute pixel positioning from visual builder

          let pixelPosition;
          const pixelPositionData = rawProps['data-pixel-position'] || rawProps['dataPixelPosition'];
          const positionData = rawProps['data-position'] || rawProps['dataPosition'];

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

          // Create component with absolute positioning
          const component = React.createElement(Component, props, ...(children || []));

          if (pixelPosition && typeof pixelPosition.x === 'number' && typeof pixelPosition.y === 'number') {
            return React.createElement(
              'div',
              {
                key,
                style: {
                  position: 'absolute',
                  left: `${pixelPosition.x}px`,
                  top: `${pixelPosition.y}px`,
                  zIndex: 1,
                },
                className: props.className as string,
              },
              component
            );
          } else {
            // No valid position data, render normally
            return React.createElement(Component, { ...props, key }, ...(children || []));
          }
        } else if (isGridCompatible(tagName)) {
          // Handle grid positioning (existing logic)
          const gridBehavior = getComponentGridBehavior(tagName);

          // Extract grid position from data attributes if present
          let gridPosition;
          if (rawProps['data-grid-position']) {
            try {
              gridPosition = JSON.parse(String(rawProps['data-grid-position']));
            } catch (e) {
              // Ignore invalid grid position data
            }
          }

          // Create the component wrapped in grid compatibility
          const component = React.createElement(Component, props, ...(children || []));

          return React.createElement(
            GridCompatibleWrapper,
            {
              key,
              componentType: tagName,
              className: props.className as string,
              style: props.style as React.CSSProperties,
              gridPosition,
              // Check if we're in a grid container context
              forceGridMode: rawProps['data-positioning-mode'] === 'grid'
            },
            component
          );
        } else {
          // Default rendering without special positioning
          return React.createElement(
            Component,
            props,
            ...(children || [])
          );
        }
      } catch (error) {
        console.error(`Error creating React element for ${tagName}:`, error);
        return React.createElement('div', { key }, `Error: Failed to render ${tagName}`);
      }
    } else {
      // Handle data-attribute syntax for components
      if (node.properties?.['data-component']) {
        const componentName = String(node.properties['data-component']);
        let componentRegistration = componentRegistry.get(componentName);
        
        // Try capitalized version if not found
        if (!componentRegistration) {
          const capitalizedName = componentName.charAt(0).toUpperCase() + componentName.slice(1);
          componentRegistration = componentRegistry.get(capitalizedName);
        }
        
        if (componentRegistration) {
          const { component: Component, props: propSchemas } = componentRegistration;
          
          // Extract props from data-attributes
          const rawProps: Record<string, any> = {};
          for (const [key, value] of Object.entries(node.properties)) {
            if (key.startsWith('data-') && key !== 'data-component') {
              const propName = key.replace('data-', '');
              rawProps[propName] = value;
            }
          }
          
          // Handle className/class attributes specially for data-component syntax too
          if (node.properties.class) {
            rawProps.className = node.properties.class;
          }
          if (node.properties.className) {
            rawProps.className = node.properties.className;
          }

          // Check for children in data-component syntax too
          const children = node.children?.map((child, index) =>
            transformNodeToReact(child, index)
          );

          const validatedProps = validateAndCoerceProps(rawProps, propSchemas, {
            hasChildren: children && children.length > 0,
            componentType: componentName
          });

          // Check positioning mode for data-component syntax
          const positioningMode = node.properties['data-positioning-mode'];

          // NEW FORMAT: Check for individual positioning attributes (data-x, data-y)
          const hasNewPositioningFormat = node.properties['data-x'] !== undefined || node.properties['dataX'] !== undefined;

          if (hasNewPositioningFormat) {
            // New positioning format with inline styles already present in the style prop
            // Just render the component normally - positioning is already in the style attribute
            return React.createElement(Component, { ...validatedProps, key }, ...(children || []));
          } else if (positioningMode === 'absolute') {
            // OLD FORMAT: Handle legacy absolute pixel positioning
            let pixelPosition;
            if (node.properties['data-pixel-position']) {
              try {
                pixelPosition = JSON.parse(String(node.properties['data-pixel-position']));
              } catch (e) {
                // Fallback to simple data-position format
                if (node.properties['data-position']) {
                  const [x, y] = String(node.properties['data-position']).split(',').map(Number);
                  if (!isNaN(x) && !isNaN(y)) {
                    pixelPosition = { x, y, positioning: 'absolute' };
                  }
                }
              }
            }

            const component = React.createElement(Component, { ...validatedProps, key }, ...(children || []));

            if (pixelPosition && typeof pixelPosition.x === 'number' && typeof pixelPosition.y === 'number') {
              return React.createElement(
                'div',
                {
                  style: {
                    position: 'absolute',
                    left: `${pixelPosition.x}px`,
                    top: `${pixelPosition.y}px`,
                    zIndex: 1,
                  },
                  className: validatedProps.className as string,
                },
                component
              );
            } else {
              return component;
            }
          } else if (isGridCompatible(componentName)) {
            // Extract grid position from data attributes if present
            let gridPosition;
            if (node.properties['data-grid-position']) {
              try {
                gridPosition = JSON.parse(String(node.properties['data-grid-position']));
              } catch (e) {
                // Ignore invalid grid position data
              }
            }

            // Create the component wrapped in grid compatibility
            const component = React.createElement(Component, { ...validatedProps, key }, ...(children || []));

            return React.createElement(
              GridCompatibleWrapper,
              {
                componentType: componentName,
                className: validatedProps.className as string,
                style: validatedProps.style as React.CSSProperties,
                gridPosition,
                forceGridMode: node.properties['data-positioning-mode'] === 'grid'
              },
              component
            );
          } else {
            return React.createElement(Component, { ...validatedProps, key }, ...(children || []));
          }
        }
      }
      
      // Regular HTML element
      const allowedTags = ['div', 'p', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'section', 'article', 'main', 'header', 'footer', 'nav', 'aside', 'br', 'a', 'style'];
      
      if (allowedTags.includes(tagName.toLowerCase())) {
        const children = node.children?.map((child, index) => 
          transformNodeToReact(child, index)
        );
        
        // Special handling for style tags
        if (tagName === 'style') {
          // For style tags, render the CSS content directly as innerHTML
          const styleContent = children?.filter(child => typeof child === 'string').join('') || '';
          return React.createElement(
            'style',
            { 
              key,
              dangerouslySetInnerHTML: { __html: styleContent }
            }
          );
        }
        
        // Clean properties for regular HTML elements
        const cleanProperties = { ...node.properties };
        delete cleanProperties['data-component'];

        // Parse style attribute if it's a CSS string
        if (cleanProperties.style && typeof cleanProperties.style === 'string') {
          const styles: Record<string, string> = {};
          cleanProperties.style.split(';').forEach(declaration => {
            const colonIndex = declaration.indexOf(':');
            if (colonIndex > 0) {
              const property = declaration.slice(0, colonIndex).trim();
              const value = declaration.slice(colonIndex + 1).trim();
              if (property && value) {
                // Convert kebab-case to camelCase for React
                const camelProperty = property.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
                styles[camelProperty] = value;
              }
            }
          });
          cleanProperties.style = styles;
        }

        return React.createElement(
          tagName,
          { ...cleanProperties, key },
          children?.length ? children : undefined
        );
      }
    }
  }

  // Fallback: return nothing for unknown elements
  return null;
}

// Main render function that wraps the tree in ResidentDataProvider
export interface RenderOptions {
  ast: TemplateNode;
  residentData: any;
}

export function renderTemplate({ ast, residentData }: RenderOptions): React.ReactElement {

  const transformedContent = transformNodeToReact(ast);

  return (
    <ResidentDataProvider data={residentData}>
      <div className="template-content">
        {Array.isArray(transformedContent) ? transformedContent : transformedContent}
      </div>
    </ResidentDataProvider>
  );
}

// Preview mode with error boundaries and warnings
export interface PreviewOptions extends RenderOptions {
  showWarnings?: boolean;
}

export function PreviewRenderer({ ast, residentData, showWarnings = true }: PreviewOptions): React.ReactElement {
  try {
      const content = renderTemplate({ ast, residentData });
    
    return (
      <div className="template-preview">
        {showWarnings && (
          <div className="template-warnings mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm">
            <p className="font-medium text-yellow-800 mb-1">Preview Mode</p>
            <p className="text-yellow-700">This is a preview of your template. Some features may not be fully functional.</p>
          </div>
        )}
        <div className="template-content">
          {content}
        </div>
      </div>
    );
  } catch (error) {
    return (
      <div className="template-error p-4 bg-red-50 border border-red-200 rounded">
        <h4 className="font-medium text-red-800 mb-2">Render Error</h4>
        <p className="text-red-700 text-sm">{String(error)}</p>
      </div>
    );
  }
}