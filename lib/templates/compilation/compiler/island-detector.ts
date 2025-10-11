// Island detection for template compilation
import type { TemplateNode } from '@/lib/templates/compilation/template-parser';
import { componentRegistry, validateAndCoerceProps, validateStandardizedProps } from '@/lib/templates/core/template-registry';
import type { Island } from './types';
import { normalizeVariableName } from '@/lib/templates/state/variable-utils';
import { normalizeAttributeName } from '@/lib/templates/core/attribute-mappings';
import { separateCSSProps, applyCSSProps } from '@/lib/templates/styling/universal-css-props';
import { parseStyleString } from '@/lib/templates/positioning/positioning-utils';
import { stripPositioningFromStyle } from '@/components/features/templates/visual-builder/canvas-renderer/utils/css-utilities';
import type React from 'react';

// Generate unique island ID based on component type and path
export function generateIslandId(componentType: string, path: string[]): string {
  const pathStr = path.join('-');
  const hash = hashString(pathStr);
  return `island-${componentType.toLowerCase()}-${hash}`;
}

// Simple hash function for island IDs
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Phase 2: Strip positioning properties from props
 * This mirrors the logic in HTMLIslandHydration.tsx but is run at compile-time
 * Removes positioning from both flat props and the style property
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

  // Also strip positioning from the style property
  if (cleanedProps.style) {
    if (typeof cleanedProps.style === 'string') {
      // Parse style string, strip positioning, convert back to string
      const parsedStyle = parseStyleString(cleanedProps.style);
      const cleanedStyle = stripPositioningFromStyle(parsedStyle) as React.CSSProperties;

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
      cleanedProps.style = stripPositioningFromStyle(cleanedProps.style) as React.CSSProperties;

      // Remove style property if empty
      if (Object.keys(cleanedProps.style).length === 0) {
        delete cleanedProps.style;
      }
    }
  }

  return cleanedProps;
}

// Extract positioning data from node properties and standardize it
// This function consolidates all positioning formats into a single standardized object
function extractPositioningFromProperties(properties: Record<string, any>): any | null {
  // Check for pure positioning data first (new format) - try both kebab-case and camelCase
  const purePositioningValue = properties['data-pure-positioning'] || properties['dataPurePositioning'];

  if (purePositioningValue) {
    try {
      // Handle HTML-escaped quotes in the JSON string
      const unescaped = String(purePositioningValue).replace(/&quot;/g, '"');
      const parsed = JSON.parse(unescaped);
      return parsed;
    } catch (e) {
      console.warn('Failed to parse data-pure-positioning:', purePositioningValue, 'Error:', e);
    }
  }

  // Check for legacy absolute positioning
  const positioningMode = properties['data-positioning-mode'] || properties['dataPositioningMode'];
  if (positioningMode === 'absolute') {
    const pixelPosition = properties['data-pixel-position'] || properties['dataPixelPosition'];
    const position = properties['data-position'] || properties['dataPosition'];

    if (pixelPosition) {
      try {
        const parsedPosition = JSON.parse(String(pixelPosition));
        return {
          mode: 'absolute',
          x: parsedPosition.x || 0,
          y: parsedPosition.y || 0,
          width: parsedPosition.width || 200,
          height: parsedPosition.height || 150,
          zIndex: parsedPosition.zIndex || 1
        };
      } catch (e) {
        console.warn('Failed to parse pixel position data:', pixelPosition);
      }
    } else if (position) {
      const [x, y] = String(position).split(',').map(Number);
      if (!isNaN(x) && !isNaN(y)) {
        return {
          mode: 'absolute',
          x,
          y,
          width: 200,
          height: 150,
          zIndex: 1
        };
      }
    }
  }

  // Check for legacy grid positioning
  if (positioningMode === 'grid') {
    const gridPosition = properties['data-grid-position'] || properties['dataGridPosition'];
    const column = properties['data-grid-column'] || properties['dataGridColumn'];
    const row = properties['data-grid-row'] || properties['dataGridRow'];
    const span = properties['data-grid-span'] || properties['dataGridSpan'];

    if (gridPosition) {
      try {
        const parsedGrid = JSON.parse(String(gridPosition));
        return {
          mode: 'grid',
          column: parsedGrid.column || 1,
          row: parsedGrid.row || 1,
          span: parsedGrid.span || 1,
          breakpoint: parsedGrid.breakpoint
        };
      } catch (e) {
        console.warn('Failed to parse grid position data:', gridPosition);
      }
    } else if (column && row) {
      return {
        mode: 'grid',
        column: parseInt(String(column), 10) || 1,
        row: parseInt(String(row), 10) || 1,
        span: parseInt(String(span), 10) || 1
      };
    }
  }

  // NEW: Check for Visual Builder positioning attributes (data-x, data-y format)
  // This is the format output by the Visual Builder's HTML generator
  const dataX = properties['data-x'] || properties['dataX'];
  const dataY = properties['data-y'] || properties['dataY'];

  if (dataX !== undefined && dataY !== undefined) {
    const x = parseFloat(String(dataX));
    const y = parseFloat(String(dataY));

    if (!isNaN(x) && !isNaN(y)) {
      const dataWidth = properties['data-width'] || properties['dataWidth'];
      const dataHeight = properties['data-height'] || properties['dataHeight'];
      const dataResponsive = properties['data-responsive'] || properties['dataResponsive'];

      // Check if this is responsive positioning (has breakpoints)
      const isResponsive = dataResponsive === 'true' || dataResponsive === true;

      if (isResponsive) {
        // Responsive positioning - create breakpoints object
        // Currently Visual Builder only outputs desktop, but structure supports all breakpoints
        return {
          breakpoints: {
            desktop: {
              x,
              y,
              zIndex: 1, // Default z-index, can be overridden
              width: dataWidth ? parseFloat(String(dataWidth)) : undefined,
              height: dataHeight ? parseFloat(String(dataHeight)) : undefined
            }
          }
        };
      } else {
        // Simple absolute positioning (data-responsive="false")
        return {
          mode: 'absolute',
          x,
          y,
          width: dataWidth ? parseFloat(String(dataWidth)) : 200,
          height: dataHeight ? parseFloat(String(dataHeight)) : 150,
          zIndex: 1
        };
      }
    }
  }

  return null;
}

// Identify interactive components and create islands (new version with transformed AST)
export function identifyIslandsWithTransform(ast: TemplateNode): { islands: Island[], transformedAst: TemplateNode } {
  const islands: Island[] = [];
  let nodeCount = 0;
  let componentCount = 0;
  
  function traverse(node: TemplateNode, path: string[] = []): TemplateNode {
    nodeCount++;
    if (node.type === 'element' && node.tagName) {
      // Check if this node is a registered component
      const registration = componentRegistry.get(node.tagName);

      if (registration) {
        // This is an interactive component - create an island
        componentCount++;
        const islandId = generateIslandId(node.tagName, path);
        
        // Process children first to create nested islands
        const processedChildren: TemplateNode[] = [];
        const childIslands: Island[] = [];
        
        
        if (node.children) {
          for (let i = 0; i < node.children.length; i++) {
            const child = node.children[i];
            const processedChild = traverse(child, [...path, node.tagName, i.toString()]);
            processedChildren.push(processedChild);
            
            // If the processed child is a component placeholder, track it as a child island
            if (processedChild.type === 'element' && 
                processedChild.properties && 
                processedChild.properties['data-island']) {
              const childIslandId = processedChild.properties['data-island'];
              const childIsland = islands.find(island => island.id === childIslandId);
              if (childIsland) {
                childIslands.push(childIsland);
              }
            }
          }
        }
        

        // Validate and coerce props from node properties
        const rawProps = node.properties || {};

        // STYLING ATTRIBUTE NORMALIZATION
        // Use centralized attribute mapping system to normalize all attribute names
        // This eliminates 154 lines of duplicate mapping code
        const normalizedProps: Record<string, any> = {};
        for (const [htmlAttr, value] of Object.entries(rawProps)) {
          const normalizedName = normalizeAttributeName(htmlAttr);
          normalizedProps[normalizedName] = value;
        }
        // Replace rawProps with normalized version
        Object.assign(rawProps, normalizedProps);
        // Remove old unnormalized keys (if they differ from normalized)
        for (const htmlAttr of Object.keys(normalizedProps)) {
          const originalKey = Object.keys(rawProps).find(k => normalizeAttributeName(k) === htmlAttr && k !== htmlAttr);
          if (originalKey && originalKey !== htmlAttr) {
            delete rawProps[originalKey];
          }
        }

        // Normalize variable names by stripping user-content- prefix
        // rehype-sanitize adds this prefix for DOM clobbering security,
        // but we strip it here so components work with clean names
        if (rawProps['name'] && typeof rawProps['name'] === 'string') {
          rawProps['name'] = normalizeVariableName(rawProps['name']);
        }

        // Convert dataComponentSize attribute back to _size prop if present
        if (rawProps['dataComponentSize'] || rawProps['data-component-size']) {
          try {
            const sizeAttr = rawProps['dataComponentSize'] || rawProps['data-component-size'];
            const sizeData = JSON.parse(String(sizeAttr));
            rawProps._size = sizeData;
          } catch (e) {
            console.warn('Failed to parse dataComponentSize in island detector:', rawProps['dataComponentSize'] || rawProps['data-component-size']);
          }
        }

        // PROPS-BASED POSITIONING: Extract positioning data and put it directly in props
        // This eliminates the need for HTML attribute parsing in the Profile Renderer
        const positioningData = extractPositioningFromProperties(node.properties || {});
        if (positioningData) {
          rawProps._positioning = positioningData;
        }

        // NEW: Check if this is a standardized component or legacy component
        const componentInfo = componentRegistry.getAnyComponent(node.tagName);
        let props: Record<string, unknown>;

        if (componentInfo?.type === 'standardized') {
          // Handle standardized component with CSS property validation
          props = validateStandardizedProps(rawProps, node.tagName);
        } else if (componentInfo?.type === 'legacy') {
          // Handle legacy component with old schema validation
          props = validateAndCoerceProps(rawProps, componentInfo.registration.props, {
            componentType: node.tagName,
            hasChildren: childIslands.length > 0
          });
        } else {
          // Fallback: try legacy validation (for backward compatibility)
          const registration = componentRegistry.get(node.tagName);
          if (registration) {
            props = validateAndCoerceProps(rawProps, registration.props, {
              componentType: node.tagName,
              hasChildren: childIslands.length > 0
            });
          } else {
            // Component not found in either registry
            props = rawProps; // Use raw props as fallback
          }
        }

        // PHASE 2: Pre-compute props at compile-time
        // This moves prop processing from runtime (hydration) to compile-time
        // Expected: 20-40% faster renders
        const cleanedIslandProps = positioningData
          ? stripPositioningFromProps(props as Record<string, any>)
          : (props as Record<string, any>);

        // Separate CSS props from component props
        const { cssProps, componentProps: separatedComponentProps } = separateCSSProps(cleanedIslandProps);

        // Convert CSS props to inline styles
        const generatedStyles = applyCSSProps(cssProps);

        // Handle existing style prop (parse if string, strip positioning)
        const existingStyle = typeof cleanedIslandProps.style === 'string'
          ? parseStyleString(cleanedIslandProps.style)
          : (cleanedIslandProps.style as React.CSSProperties) || {};

        // Strip positioning from existing styles if component has positioning data
        const shouldStripPositioning = positioningData !== undefined;
        const cleanedExistingStyle = shouldStripPositioning
          ? (stripPositioningFromStyle(existingStyle) as React.CSSProperties)
          : existingStyle;

        // Merge all styles (existing styles + generated styles from CSS props)
        const finalStyles: React.CSSProperties = {
          ...cleanedExistingStyle,
          ...generatedStyles
        };

        // Create island configuration with children and pre-computed props
        const island: Island = {
          id: islandId,
          component: node.tagName,
          props,
          children: childIslands,
          placeholder: `<div data-island="${islandId}" data-component="${node.tagName}"></div>`,
          // Phase 2: Pre-computed props for faster hydration
          _precomputed: {
            styles: finalStyles,
            componentProps: separatedComponentProps
          }
        };

        islands.push(island);
        
        // Return a placeholder node with both island identifiers AND positioning attributes
        // We preserve positioning attributes in the static HTML for CSS styling
        const preservedProperties: Record<string, any> = {
          'data-island': islandId,
          'data-component': node.tagName
        };

        // Preserve original positioning attributes in the placeholder
        // This allows the static HTML to have positioning data for CSS
        if (node.properties) {
          // Preserve pure positioning attribute
          if (node.properties['data-pure-positioning'] || node.properties['dataPurePositioning']) {
            preservedProperties['data-pure-positioning'] =
              node.properties['data-pure-positioning'] || node.properties['dataPurePositioning'];
          }

          // Also preserve legacy positioning attributes for backward compatibility
          if (node.properties['data-positioning-mode'] || node.properties['dataPositioningMode']) {
            preservedProperties['data-positioning-mode'] =
              node.properties['data-positioning-mode'] || node.properties['dataPositioningMode'];
          }
          if (node.properties['data-pixel-position'] || node.properties['dataPixelPosition']) {
            preservedProperties['data-pixel-position'] =
              node.properties['data-pixel-position'] || node.properties['dataPixelPosition'];
          }

          // NEW: Preserve CSS styling properties in static HTML placeholder
          // This ensures CSS styling appears in both static HTML and hydrated components
          const cssProperties = [
            'backgroundColor', 'background-color', 'backgroundcolor',
            'color', 'textColor', 'text-color', 'textcolor',
            'fontSize', 'font-size', 'fontsize',
            'fontFamily', 'font-family', 'fontfamily',
            'fontWeight', 'font-weight', 'fontweight',
            'textAlign', 'text-align', 'textalign',
            'padding', 'margin',
            'border', 'borderRadius', 'border-radius', 'borderradius',
            'width', 'height', 'minWidth', 'min-width', 'minwidth',
            'maxWidth', 'max-width', 'maxwidth', 'minHeight', 'min-height', 'minheight',
            'maxHeight', 'max-height', 'maxheight',
            'gap', 'rowGap', 'row-gap', 'rowgap', 'columnGap', 'column-gap', 'columngap',
            'opacity', 'display', 'position', 'top', 'right', 'bottom', 'left', 'zIndex', 'z-index', 'zindex',
            'gridTemplateColumns', 'grid-template-columns', 'gridtemplatecolumns',
            'gridTemplateRows', 'grid-template-rows', 'gridtemplaterows',
            'justifyContent', 'justify-content', 'justifycontent',
            'alignItems', 'align-items', 'alignitems',
            'flexDirection', 'flex-direction', 'flexdirection'
          ];

          // Build inline style string from CSS properties
          const styleValues: string[] = [];

          for (const cssProp of cssProperties) {
            const value = node.properties[cssProp];
            if (value && typeof value === 'string') {
              // Convert camelCase to kebab-case for CSS
              const cssProperty = cssProp
                .replace(/([A-Z])/g, '-$1')
                .toLowerCase()
                .replace(/^-/, ''); // Remove leading dash

              styleValues.push(`${cssProperty}: ${value}`);
            }
          }

          // Apply styles to placeholder if any CSS properties were found
          if (styleValues.length > 0) {
            preservedProperties['style'] = styleValues.join('; ');
          }

          // NEW: Preserve event component props (OnKeyPress, OnChange, etc.)
          // These components need their config props in the static HTML for domToReact
          const eventComponentProps: Record<string, string[]> = {
            'OnKeyPress': ['keyname', 'keyName'],
            'OnChange': ['var'],
            'OnMount': [],
            'OnInterval': ['seconds', 'milliseconds'],
            'OnVisible': ['threshold', 'once']
          };

          const componentPropsList = eventComponentProps[node.tagName];
          if (componentPropsList) {
            for (const propName of componentPropsList) {
              const value = node.properties[propName];
              if (value !== undefined && value !== null && value !== '') {
                preservedProperties[propName] = value;
              }
            }
          }
        }

        const placeholder: TemplateNode = {
          type: 'element',
          tagName: 'div',
          properties: preservedProperties,
          children: processedChildren
        };

        return placeholder;
      }
    }
    
    // Regular HTML element or text - process children
    const processedChildren = node.children?.map((child, index) => 
      traverse(child, [...path, node.tagName || 'node', index.toString()])
    );
    
    return {
      ...node,
      children: processedChildren
    };
  }
  
  const transformedAst = traverse(ast);
  
  
  // Fix parent-child relationships by analyzing the transformed AST
  const islandsWithFixedChildren = fixIslandParentChildRelationships(islands, transformedAst);
  
  
  return { islands: islandsWithFixedChildren, transformedAst };
}

// Identify interactive components and create islands (legacy version)
export function identifyIslands(ast: TemplateNode): Island[] {
  const islands: Island[] = [];
  
  function traverse(node: TemplateNode, path: string[] = []): void {
    if (node.type === 'element' && node.tagName) {
      // Check if this node is a registered component
      const registration = componentRegistry.get(node.tagName);
      if (registration) {
        // This is an interactive component - create an island
        const islandId = generateIslandId(node.tagName, path);
        
        // Validate and coerce props from node properties
        const props = node.properties ?
          validateAndCoerceProps(node.properties, registration.props, {
            componentType: node.tagName
          }) : {};

        
        // Create island configuration
        const island: Island = {
          id: islandId,
          component: node.tagName,
          props,
          placeholder: `<div data-island="${islandId}" data-component="${node.tagName}"></div>`
        };
        
        islands.push(island);
      }
    }
    
    // Process children
    if (node.children) {
      node.children.forEach((child, index) => 
        traverse(child, [...path, node.tagName || 'node', index.toString()])
      );
    }
  }
  
  traverse(ast);
  return islands;
}

// Fix parent-child relationships by analyzing the transformed AST
function fixIslandParentChildRelationships(islands: Island[], ast: TemplateNode): Island[] {
  // Create a map of island ID to island for fast lookup - preserve existing children
  const islandMap = new Map(islands.map(island => [island.id, { ...island, children: island.children || [] }]));
  
  // Recursively find all data-island elements and build parent-child relationships
  function findIslandRelationships(node: TemplateNode, parentIslandId?: string): void {
    if (node.type === 'element' && node.properties && node.properties['data-island']) {
      const currentIslandId = node.properties['data-island'] as string;
      
      // If we have a parent island, add this island as its child
      if (parentIslandId && islandMap.has(parentIslandId) && islandMap.has(currentIslandId)) {
        const parentIsland = islandMap.get(parentIslandId)!;
        const currentIsland = islandMap.get(currentIslandId)!;
        
        // Avoid duplicates
        if (!parentIsland.children?.some(child => child.id === currentIslandId)) {
          parentIsland.children = parentIsland.children || [];
          parentIsland.children.push(currentIsland);
          
        }
      }
      
      // Continue traversing with this island as the parent
      if (node.children) {
        node.children.forEach(child => findIslandRelationships(child, currentIslandId));
      }
    } else {
      // Regular element - continue traversing with the same parent
      if (node.children) {
        node.children.forEach(child => findIslandRelationships(child, parentIslandId));
      }
    }
  }
  
  // Start the traversal
  findIslandRelationships(ast);
  
  // Convert back to array
  return Array.from(islandMap.values());
}

// Note: validateAndCoerceProps is imported from template-registry