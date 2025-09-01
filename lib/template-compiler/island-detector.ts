// Island detection for template compilation
import type { TemplateNode } from '@/lib/template-parser';
import { componentRegistry, validateAndCoerceProps } from '@/lib/template-registry';
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
  
  function traverse(node: TemplateNode, path: string[] = []): TemplateNode {
    if (node.type === 'element' && node.tagName) {
      // Check if this node is a registered component
      const registration = componentRegistry.get(node.tagName);
      if (registration) {
        // This is an interactive component - create an island
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
        return {
          type: 'element',
          tagName: 'div',
          properties: {
            'data-island': islandId,
            'data-component': node.tagName
          },
          children: []
        };
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
  return { islands, transformedAst };
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

// Note: validateAndCoerceProps is imported from template-registry