// Island detection for template compilation
import type { TemplateNode } from '@/lib/templates/compilation/template-parser';
import { componentRegistry, validateAndCoerceProps, validateStandardizedProps } from '@/lib/templates/core/template-registry';
import type { Island } from './types';

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

        // DEBUG: Log variable component detection (development only)
        if (process.env.NODE_ENV === 'development') {
          const lowerTagName = node.tagName.toLowerCase();
          if (lowerTagName === 'showvar') {
            console.log('[ISLAND-DETECTOR] ShowVar detected:', {
              islandId,
              props: node.properties,
              path,
              hasChildren: !!node.children?.length
            });
          }
          if (lowerTagName === 'var') {
            console.log('[ISLAND-DETECTOR] Var detected:', {
              islandId,
              rawProps: node.properties,
              path,
              hasChildren: !!node.children?.length
            });
          }
          if (lowerTagName === 'set') {
            console.log('[ISLAND-DETECTOR] Set detected:', {
              islandId,
              rawProps: node.properties,
              path,
              hasChildren: !!node.children?.length
            });
          }
        }
        
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
        // Map from actual lowercase HTML attributes to proper camelCase React props
        // HTML attributes are already normalized to lowercase when they reach here
        const styleAttributeMap: Record<string, string> = {
          // Universal styling props - map from lowercase HTML attrs to camelCase React props
          'backgroundcolor': 'backgroundColor',
          'textcolor': 'textColor',
          'bordercolor': 'borderColor',
          'accentcolor': 'accentColor',
          'borderradius': 'borderRadius',
          'borderwidth': 'borderWidth',
          'boxshadow': 'boxShadow',
          'fontsize': 'fontSize',
          'fontweight': 'fontWeight',
          'fontfamily': 'fontFamily',
          'textalign': 'textAlign',
          'lineheight': 'lineHeight',
          'customcss': 'customCSS',
          // Component-specific props - CRTMonitor
          'screencolor': 'screenColor',
          'phosphorglow': 'phosphorGlow',
          // Component-specific props - ArcadeButton
          'style3d': 'style3D',
          'clickeffect': 'clickEffect',
          // Component-specific props - PixelArtFrame
          'framecolor': 'frameColor',
          'framewidth': 'frameWidth',
          'borderstyle': 'borderStyle',
          'cornerstyle': 'cornerStyle',
          'shadoweffect': 'shadowEffect',
          'gloweffect': 'glowEffect',
          'innerpadding': 'innerPadding',
          // Component-specific props - RetroGrid
          'gridstyle': 'gridStyle',
          // Component-specific props - VHSTape
          'tapecolor': 'tapeColor',
          'labelstyle': 'labelStyle',
          'showbarcode': 'showBarcode',
          // Component-specific props - CassetteTape
          'showspokestorotate': 'showSpokesToRotate',
          // Component-specific props - RetroTV
          'tvstyle': 'tvStyle',
          'channelnumber': 'channelNumber',
          'showstatic': 'showStatic',
          'showscanlines': 'showScanlines',
          // Component-specific props - Boombox
          'showequalizer': 'showEqualizer',
          'showcassettedeck': 'showCassetteDeck',
          'showradio': 'showRadio',
          'isplaying': 'isPlaying',
          'currenttrack': 'currentTrack',
          // Component-specific props - MatrixRain
          'customcharacters': 'customCharacters',
          'fadeeffect': 'fadeEffect',
          'backgroundopacity': 'backgroundOpacity',
          // Component-specific props - CustomHTMLElement
          'tagname': 'tagName',
          'innerhtml': 'innerHTML',
          // Legacy CSS props - keep as lowercase
          'text-decoration': 'textdecoration',
          'font-style': 'fontstyle',
          'text-transform': 'texttransform',
          'letter-spacing': 'letterspacing',
          'word-spacing': 'wordspacing',
          'text-indent': 'textindent',
          'white-space': 'whitespace',
          'word-break': 'wordbreak',
          'word-wrap': 'wordwrap',
          'text-overflow': 'textoverflow',
          // Conditional component props (lowercased camelCase)
          'greaterthan': 'greaterThan',
          'lessthan': 'lessThan',
          'greaterthanorequal': 'greaterThanOrEqual',
          'lessthanorequal': 'lessThanOrEqual',
          'notequals': 'notEquals',
          'startswith': 'startsWith',
          'endswith': 'endsWith',
          // Conditional component props (kebab-case)
          'greater-than': 'greaterThan',
          'less-than': 'lessThan',
          'greater-than-or-equal': 'greaterThanOrEqual',
          'less-than-or-equal': 'lessThanOrEqual',
          'not-equals': 'notEquals',
          'starts-with': 'startsWith',
          'ends-with': 'endsWith',
          // Template variable component props (Var, ShowVar, Set, OnClick)
          'initial': 'initial',
          'persist': 'persist',
          'param': 'param',
          'default': 'default',
          'expression': 'expression',
          'var': 'var',
          'format': 'format',
          'fallback': 'fallback'
        };

        // Apply attribute name conversions for kebab-case to camelCase
        for (const [htmlAttr, reactProp] of Object.entries(styleAttributeMap)) {
          if (rawProps[htmlAttr] !== undefined) {
            rawProps[reactProp] = rawProps[htmlAttr];
            // Only delete the old attribute if it's actually different from the new one
            if (htmlAttr !== reactProp) {
              delete rawProps[htmlAttr];
            }
          }
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

        // DEBUG: Log props after validation (development only)
        if (process.env.NODE_ENV === 'development') {
          const lowerTagName = node.tagName.toLowerCase();
          if (lowerTagName === 'var') {
            console.log('[ISLAND-DETECTOR] Var props after validation:', {
              islandId,
              rawProps: node.properties,
              validatedProps: props
            });
          }
          if (lowerTagName === 'set') {
            console.log('[ISLAND-DETECTOR] Set props after validation:', {
              islandId,
              rawProps: node.properties,
              validatedProps: props
            });
          }
        }

        // Create island configuration with children
        const island: Island = {
          id: islandId,
          component: node.tagName,
          props,
          children: childIslands,
          placeholder: `<div data-island="${islandId}" data-component="${node.tagName}"></div>`
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
        }

        const placeholder: TemplateNode = {
          type: 'element',
          tagName: 'div',
          properties: preservedProperties,
          children: processedChildren
        };

        // DEBUG: Log ShowVar island creation
        if (node.tagName === 'ShowVar') {
          console.log('[ISLAND-DETECTOR] ShowVar island created:', {
            islandId,
            island,
            placeholder: {
              tagName: placeholder.tagName,
              properties: placeholder.properties,
              hasChildren: !!placeholder.children?.length
            }
          });
        }

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