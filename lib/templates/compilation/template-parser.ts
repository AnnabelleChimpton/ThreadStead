import { unified } from 'unified';
import rehypeParse from 'rehype-parse';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import type { Root } from 'hast';
import { componentRegistry } from '../core/template-registry';

// Define our custom sanitization schema
function createCustomSchema() {
  const schema = { ...defaultSchema };
  
  // Allow custom component tags from the registry
  if (componentRegistry) {
    if (!schema.tagNames) schema.tagNames = [];
    
    // Add all registered component names as allowed tags
    const allowedTags = componentRegistry.getAllowedTags();
    for (const tagName of allowedTags) {
      if (!schema.tagNames.includes(tagName)) {
        schema.tagNames.push(tagName);
      }
    }
  }
  
  return schema;
}

// Parse HTML to HAST (Hypertext Abstract Syntax Tree)
export function parseTemplate(htmlString: string): Root {
  // Always convert self-closing custom tags to opening/closing pairs for better parsing
  let processedHtml = htmlString.replace(/<([^>\s/]+)([^>]*?)\s*\/>/g, '<$1$2></$1>');
  
  // Detect if we have multiple root-level components after conversion and wrap them
  const trimmedHtml = processedHtml.trim();
  const hasMultipleRootElements = /<[^>]+><\/[^>]+>[\s\S]*<[^>]+><\/[^>]+>/.test(trimmedHtml) && 
                                  !trimmedHtml.startsWith('<div') && 
                                  !trimmedHtml.startsWith('<section') &&
                                  !trimmedHtml.startsWith('<main');
  
  if (hasMultipleRootElements) {
    processedHtml = `<div>${processedHtml}</div>`;
  }

  // Test with basic sanitization 
  const processor = unified()
    .use(rehypeParse, { fragment: true })
    .use(rehypeSanitize, createCustomSchema());

  const tree = processor.parse(processedHtml);
  const processed = processor.runSync(tree);
  
  return processed as Root;
}

// Convert HAST to a serializable AST for storage
export interface TemplateNode {
  type: 'element' | 'text' | 'root';
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: TemplateNode[];
  value?: string;
}

export function astToJson(node: unknown): TemplateNode {
  const typedNode = node as { type: string; value?: string; tagName?: string; properties?: Record<string, unknown>; children?: unknown[] };
  if (typedNode.type === 'text') {
    return {
      type: 'text',
      value: typedNode.value
    };
  }

  if (typedNode.type === 'element') {
    return {
      type: 'element',
      tagName: typedNode.tagName,
      properties: typedNode.properties || {},
      children: typedNode.children?.map(astToJson) || []
    };
  }

  if (typedNode.type === 'root') {
    const children = typedNode.children?.map(astToJson) || [];
    
    // Check if we have a single auto-added div wrapper to unwrap
    if (children.length === 1 && 
        children[0].type === 'element' && 
        children[0].tagName === 'div') {
      
      const divElement = children[0];
      const hasEmptyProperties = !divElement.properties || Object.keys(divElement.properties).length === 0;
      const hasMultipleChildren = divElement.children && divElement.children.length > 1;
      
      if (hasEmptyProperties && hasMultipleChildren) {
        // This looks like our auto-added wrapper, unwrap it
        const divChildren = divElement.children?.filter((child) => 
          child.type !== 'text' || (child.value && child.value.trim())
        ) || [];
        
        return {
          type: 'root',
          children: divChildren
        };
      }
    }
    
    return {
      type: 'root',
      children: children
    };
  }

  return {
    type: 'text',
    value: ''
  };
}

// Validation and limits
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  stats: {
    nodeCount: number;
    maxDepth: number;
    componentCounts: Record<string, number>;
  };
}

function countNodes(node: TemplateNode, depth = 0): { count: number; maxDepth: number } {
  let count = 1;
  let maxDepth = depth;

  if (node.children) {
    for (const child of node.children) {
      const childResult = countNodes(child, depth + 1);
      count += childResult.count;
      maxDepth = Math.max(maxDepth, childResult.maxDepth);
    }
  }

  return { count, maxDepth };
}

function countComponents(node: TemplateNode, counts: Record<string, number> = {}): Record<string, number> {
  if (node.type === 'element' && node.tagName) {
    const isComponent = componentRegistry.get(node.tagName);
    if (isComponent) {
      counts[node.tagName] = (counts[node.tagName] || 0) + 1;
    }
  }

  if (node.children) {
    for (const child of node.children) {
      countComponents(child, counts);
    }
  }

  return counts;
}

export function validateTemplate(ast: TemplateNode): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Count nodes and depth
  const { count: nodeCount, maxDepth } = countNodes(ast);
  
  // Count components
  const componentCounts = countComponents(ast);
  const totalComponents = Object.values(componentCounts).reduce((sum, count) => sum + count, 0);

  // Check limits
  if (nodeCount > 200) {
    errors.push(`Too many nodes: ${nodeCount} (max: 200)`);
  }

  if (maxDepth > 20) {
    errors.push(`Template too deeply nested: ${maxDepth} levels (max: 20)`);
  }

  if (totalComponents > 50) {
    errors.push(`Too many components: ${totalComponents} (max: 50)`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    stats: {
      nodeCount,
      maxDepth,
      componentCounts
    }
  };
}

// Main compilation function
export interface CompilationResult {
  success: boolean;
  ast?: TemplateNode;
  validation?: ValidationResult;
  errors: string[];
}

export function compileTemplate(htmlString: string): CompilationResult {
  try {
    // Check size limit
    const sizeKB = new Blob([htmlString]).size / 1024;
    if (sizeKB > 64) {
      return {
        success: false,
        errors: [`Template too large: ${sizeKB.toFixed(1)}KB (max: 64KB)`]
      };
    }

    // Parse and sanitize
    const hast = parseTemplate(htmlString);
    
    // Convert to JSON AST
    const ast = astToJson(hast);
    
    // Validate
    const validation = validateTemplate(ast);
    
    return {
      success: validation.isValid,
      ast: validation.isValid ? ast : undefined,
      validation,
      errors: validation.errors
    };
  } catch (error) {
    return {
      success: false,
      errors: [`Parse error: ${error}`]
    };
  }
}