// Island detection for template compilation
import type { TemplateNode } from '@/lib/templates/compilation/template-parser';
import { componentRegistry, validateAndCoerceProps } from '@/lib/templates/core/template-registry';
import { findPropSchema, type PropSchema } from '@/lib/templates/core/template-registry-types';
import type { Island } from './types';
import { normalizeVariableName } from '@/lib/templates/state/variable-utils';
import { normalizeAttributeName } from '@/lib/templates/core/attribute-mappings';
import { separateCSSProps, applyCSSProps } from '@/lib/templates/styling/universal-css-props';
import { parseStyleString } from '@/lib/utils/css/parse-style-string';
import type React from 'react';

/**
 * A component's own style never carries position/top/right/bottom/left/
 * z-index/transform: the compiler has always dropped them (they belonged to
 * the old Visual Builder's positioning wrapper), and pages are built on that.
 */
function stripPositionFromStyle(style: React.CSSProperties): React.CSSProperties {
  const { position, top, right, bottom, left, zIndex, transform, ...rest } = style;
  return rest;
}

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

/** A declared prop the component takes as a prop (not one marked `css`). */
function isComponentOwnProp(schemas: Record<string, PropSchema>, name: string): boolean {
  const declared = findPropSchema(schemas, name);
  return declared !== undefined && !declared[1].css;
}

/**
 * Split validated props into the ones the component declares, under the
 * name its implementation reads (`componentProp`), and the rest. A declared
 * prop named like CSS used to be turned into inline style before the
 * component saw it, so `<NeonBorder color="pink">` stayed blue and
 * `<SkillChart display="radial">` became `style.display` (engine audit R2).
 */
export function splitDeclaredProps(
  props: Record<string, any>,
  schemas: Record<string, PropSchema>
): { declaredProps: Record<string, any>; undeclared: Record<string, any> } {
  const declaredProps: Record<string, any> = {};
  const undeclared: Record<string, any> = {};
  for (const [key, value] of Object.entries(props)) {
    // `style` is always the style attribute, even where a registry lists it
    const schema = key !== 'style' && Object.prototype.hasOwnProperty.call(schemas, key) ? schemas[key] : undefined;
    if (schema && !schema.css) {
      declaredProps[schema.componentProp ?? key] = value;
    } else {
      undeclared[key] = value;
    }
  }
  return { declaredProps, undeclared };
}

// Identify interactive components and create islands (new version with transformed AST)
export function identifyIslandsWithTransform(ast: TemplateNode): { islands: Island[], transformedAst: TemplateNode } {
  const islands: Island[] = [];
  let nodeCount = 0;
  let componentCount = 0;
  
  function traverse(node: TemplateNode, path: string[] = []): TemplateNode {
    nodeCount++;
    if (node.type === 'element' && node.tagName) {
      // Only component tags (written PascalCase, marked by the parser) become
      // islands. Plain HTML that shares a component's name stays HTML:
      // <button>, <select>, <option>, <var>, SVG <filter>.
      const registration = node.component ? componentRegistry.get(node.tagName) : undefined;

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

        // The template parser already told the author about each prop
        // problem, with its line (template-parser reportComponentProps).
        const props = validateAndCoerceProps(rawProps, registration.props, {
          componentType: node.tagName,
          hasChildren: childIslands.length > 0,
          report: () => {}
        });

        // PHASE 2: Pre-compute props at compile-time
        // This moves prop processing from runtime (hydration) to compile-time
        // Expected: 20-40% faster renders
        const islandProps = props as Record<string, any>;

        // Declared props reach the component (props win). Only what's left,
        // undeclared CSS-named attributes and props marked `css`, becomes
        // inline style, the way those attributes work on plain HTML.
        const { declaredProps, undeclared } = splitDeclaredProps(islandProps, registration.props);
        const { cssProps, componentProps: otherComponentProps } = separateCSSProps(undeclared);
        // aria-* as written reach the component too (a Button's aria-expanded,
        // aria-controls): no registry lists them, so they were dropped and a
        // toggle couldn't say whether it was on (template audit 14 #4).
        // The sanitizer camel-cases them and prefixes the ids they point at.
        const ariaProps = Object.fromEntries(
          Object.entries(rawProps)
            .filter(([key]) => /^aria[A-Z]/.test(key))
            .map(([key, value]) => [`aria-${key.slice(4).toLowerCase()}`, Array.isArray(value) ? value.join(' ') : String(value)])
        );
        const separatedComponentProps = { ...otherComponentProps, ...declaredProps, ...ariaProps };

        // Convert CSS props to inline styles
        const generatedStyles = applyCSSProps(cssProps);

        // Handle existing style prop (parse if string, drop position)
        const existingStyle = typeof islandProps.style === 'string'
          ? parseStyleString(islandProps.style)
          : (islandProps.style as React.CSSProperties) || {};
        const cleanedExistingStyle = stripPositionFromStyle(existingStyle);

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
        
        // Return a placeholder node with the island identifiers
        const preservedProperties: Record<string, any> = {
          'data-island': islandId,
          'data-component': node.tagName
        };

        if (node.properties) {
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
            // A declared prop named like CSS (`<SkillChart display="radial">`)
            // is the component's, not the placeholder's style
            if (isComponentOwnProp(registration.props, cssProp)) continue;
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
          children: processedChildren,
          // An editor compile: where the component's tag is (Alt-click on it)
          ...(node.tsAt !== undefined && { tsAt: node.tsAt }),
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
      const registration = node.component ? componentRegistry.get(node.tagName) : undefined;
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