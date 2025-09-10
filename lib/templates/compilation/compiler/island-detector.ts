// Island detection for template compilation
import type { TemplateNode } from '@/lib/templates/compilation/template-parser';
import { componentRegistry, validateAndCoerceProps } from '@/lib/templates/core/template-registry';
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
        const props = node.properties ? 
          validateAndCoerceProps(node.properties, registration.props) : {};
        
        // Create island configuration with children
        const island: Island = {
          id: islandId,
          component: node.tagName,
          props,
          children: childIslands,
          placeholder: `<div data-island="${islandId}" data-component="${node.tagName}"></div>`
        };
        
        islands.push(island);
        
        // Return a placeholder node to replace the component
        // Include processed children so content isn't lost in static HTML
        const placeholder: TemplateNode = {
          type: 'element',
          tagName: 'div',
          properties: {
            'data-island': islandId,
            'data-component': node.tagName
          },
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
          validateAndCoerceProps(node.properties, registration.props) : {};
        
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