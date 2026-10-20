// HTML optimization and static generation
import { find, html as htmlSpace, svg as svgSpace, type Schema } from 'property-information';
import type { TemplateNode } from '@/lib/templates/compilation/template-parser';
import type { Island } from './types';

// Generate optimized static HTML with island placeholders
export function generateStaticHTML(ast: TemplateNode, islands: Island[]): string {
  const islandMap = new Map(islands.map(i => [i.id, i]));
  let nodeCount = 0;
  let islandReplacements = 0;


  function renderNode(node: TemplateNode, inSvg = false): string {
    nodeCount++;

    if (node.type === 'text') {
      return escapeHtml(node.value || '');
    }
    
    if (node.type === 'element' && node.tagName) {
      // Check if this node should be rendered as an island placeholder
      const islandId = node.properties?.['data-island'] as string;
      if (islandId && islandMap.has(islandId)) {
        const island = islandMap.get(islandId)!;
        islandReplacements++;

        // Render as inline span with data-island attributes (matches HTML custom element behavior)
        const attrs = renderAttributes(node.properties || {}, htmlSpace);
        const children = node.children?.map((child) => renderNode(child)).join('') || '';
        return `<span${attrs ? ` ${attrs}` : ''}>${children}</span>`;
      }
      
      // Regular HTML rendering. SVG attributes have their own spellings
      // (stroke-width, viewBox), so the space follows the element.
      const childInSvg = inSvg || node.tagName === 'svg';
      const attrs = renderAttributes(node.properties || {}, childInSvg ? svgSpace : htmlSpace);
      const children = node.children?.map((child) => renderNode(child, childInSvg)).join('') || '';
      
      // Handle self-closing tags
      if (VOID_ELEMENTS.has(node.tagName.toLowerCase()) && !children) {
        return `<${node.tagName}${attrs ? ` ${attrs}` : ''} />`;
      }
      
      return `<${node.tagName}${attrs ? ` ${attrs}` : ''}>${children}</${node.tagName}>`;
    }
    
    if (node.type === 'root') {
      return node.children?.map((child) => renderNode(child)).join('') || '';
    }
    
    return '';
  }

  return renderNode(ast);
}

const VOID_ELEMENTS = new Set([
  'area', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr',
]);

/**
 * Render hast properties as HTML attributes. property-information maps
 * each property back to its attribute (htmlFor → for, cellPadding →
 * cellpadding, ariaLabel → aria-label, dataComponentId →
 * data-component-id, strokeWidth → stroke-width) and says how lists
 * join. The old hand list only knew className, so `<label for>` came out
 * as `htmlFor="…"` and clicking the label did nothing.
 */
function renderAttributes(properties: Record<string, any>, space: Schema): string {
  return Object.entries(properties)
    .filter(([, value]) => value != null && value !== false)
    .map(([key, value]) => {
      const info = find(space, key);
      const htmlKey = info.attribute;

      // Handle boolean attributes
      if (value === true) {
        return htmlKey;
      }

      // Handle array values (like classList)
      if (Array.isArray(value)) {
        return `${htmlKey}="${escapeHtml(value.join(info.commaSeparated ? ', ' : ' '))}"`;
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