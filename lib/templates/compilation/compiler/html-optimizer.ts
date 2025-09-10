// HTML optimization and static generation
import type { TemplateNode } from '@/lib/templates/compilation/template-parser';
import type { Island } from './types';

// Generate optimized static HTML with island placeholders
export function generateStaticHTML(ast: TemplateNode, islands: Island[]): string {
  const islandMap = new Map(islands.map(i => [i.id, i]));
  let nodeCount = 0;
  let islandReplacements = 0;
  
  function renderNode(node: TemplateNode): string {
    nodeCount++;
    
    if (nodeCount <= 5) {
      console.log(`🎨 Rendering node ${nodeCount}:`, { type: node.type, tagName: node.tagName });
    }
    if (node.type === 'text') {
      return escapeHtml(node.value || '');
    }
    
    if (node.type === 'element' && node.tagName) {
      // Check if this node should be rendered as an island placeholder
      const islandId = node.properties?.['data-island'] as string;
      if (islandId && islandMap.has(islandId)) {
        const island = islandMap.get(islandId)!;
        islandReplacements++;
        
        if (islandReplacements <= 3) {
          console.log(`🏝️ Rendering island ${islandReplacements}:`, { islandId, component: island.component, hasChildren: !!node.children?.length });
        }
        
        // Render as normal div with data-island attributes, but include children
        const attrs = renderAttributes(node.properties || {});
        const children = node.children?.map(renderNode).join('') || '';
        return `<div${attrs ? ` ${attrs}` : ''}>${children}</div>`;
      }
      
      // Regular HTML rendering
      const attrs = renderAttributes(node.properties || {});
      const children = node.children?.map(renderNode).join('') || '';
      
      // Handle self-closing tags
      const voidElements = new Set(['br', 'hr', 'img', 'input', 'meta', 'link']);
      if (voidElements.has(node.tagName.toLowerCase()) && !children) {
        return `<${node.tagName}${attrs ? ` ${attrs}` : ''} />`;
      }
      
      return `<${node.tagName}${attrs ? ` ${attrs}` : ''}>${children}</${node.tagName}>`;
    }
    
    if (node.type === 'root') {
      return node.children?.map(renderNode).join('') || '';
    }
    
    return '';
  }
  
  const result = renderNode(ast);
  
  console.log(`🎯 Static HTML generation complete:`, {
    totalNodesRendered: nodeCount,
    totalIslandReplacements: islandReplacements,
    expectedIslands: islands.length,
    resultLength: result.length
  });
  
  return result;
}

// Render HTML attributes safely
function renderAttributes(properties: Record<string, any>): string {
  return Object.entries(properties)
    .filter(([key, value]) => value != null)
    .map(([key, value]) => {
      // Convert JSX attributes to HTML attributes
      let htmlKey = key;
      if (key === 'className') {
        htmlKey = 'class';
      }
      
      // Handle boolean attributes
      if (typeof value === 'boolean') {
        return value ? htmlKey : '';
      }
      
      // Handle array values (like classList)
      if (Array.isArray(value)) {
        return `${htmlKey}="${escapeHtml(value.join(' '))}"`;
      }
      
      return `${htmlKey}="${escapeHtml(String(value))}"`;
    })
    .filter(attr => attr)
    .join(' ');
}

// Escape HTML entities for safe rendering
export function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Optimize CSS by minifying and removing duplicates
export function optimizeCSS(css: string): string {
  return css
    // Remove comments
    .replace(/\/\*[\s\S]*?\*\//g, '')
    // Remove extra whitespace
    .replace(/\s+/g, ' ')
    // Remove whitespace around certain characters
    .replace(/\s*([{}:;,>+~])\s*/g, '$1')
    .trim();
}

// Calculate performance metrics for the template
export interface TemplateMetrics {
  nodeCount: number;
  islandCount: number;
  htmlSize: number;
  estimatedRenderTime: number;
}

export function calculateMetrics(
  staticHTML: string, 
  islands: Island[], 
  ast: TemplateNode
): TemplateMetrics {
  const nodeCount = countNodes(ast);
  const htmlSize = new Blob([staticHTML]).size;
  
  // Estimate render time based on complexity
  const estimatedRenderTime = (nodeCount * 0.1) + (islands.length * 5); // ms
  
  return {
    nodeCount,
    islandCount: islands.length,
    htmlSize,
    estimatedRenderTime
  };
}

// Count total nodes in AST
function countNodes(node: TemplateNode): number {
  let count = 1;
  if (node.children) {
    for (const child of node.children) {
      count += countNodes(child);
    }
  }
  return count;
}