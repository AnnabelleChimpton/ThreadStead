import { unified } from 'unified';
import rehypeParse from 'rehype-parse';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import type { Element, Root } from 'hast';
import { componentRegistry, validateAndCoerceProps } from './template-registry';

// Define our custom sanitization schema
function createCustomSchema() {
  const allowedTags = componentRegistry.getAllowedTags();
  
  // Add both original case and lowercase versions of tags
  const allTagVariations = [
    ...allowedTags,
    ...allowedTags.map(tag => tag.toLowerCase())
  ];
  
  return {
    ...defaultSchema,
    tagNames: [
      ...(defaultSchema.tagNames || []).filter(tag => tag !== 'img'), // Remove standard img tag to avoid conflicts
      ...allTagVariations
    ],
    attributes: {
      ...defaultSchema.attributes,
      // Add component-specific attributes for all variations
      '*': ['data-component', 'data-size', 'data-shape', 'data-limit', 'data-variant', 'data-title', 'data-when', 'data-condition', 'data-equals', 'data-exists', 'style', 'id', 'href', 'target', 'rel'],
      // Allow specific attributes for each component (both cases)
      ...Object.fromEntries(
        allowedTags.flatMap(tag => [
          [tag, componentRegistry.getAllowedAttributes(tag)],
          [tag.toLowerCase(), componentRegistry.getAllowedAttributes(tag)]
        ])
      )
    }
  };
}

// Parse HTML to HAST (Hypertext Abstract Syntax Tree)
export function parseTemplate(htmlString: string): Root {
  // Always convert self-closing custom tags to opening/closing pairs for better parsing
  let processedHtml = htmlString.replace(/<([^>\/]+)\s*\/>/g, '<$1></$1>');
  
  // Detect if we have multiple root-level components after conversion and wrap them
  const trimmedHtml = processedHtml.trim();
  const hasMultipleRootElements = /<[^>]+><\/[^>]+>.*<[^>]+><\/[^>]+>/s.test(trimmedHtml) && 
                                  !trimmedHtml.startsWith('<div') && 
                                  !trimmedHtml.startsWith('<section') &&
                                  !trimmedHtml.startsWith('<main');
  
  if (hasMultipleRootElements) {
    processedHtml = `<div>${processedHtml}</div>`;
  }
  
  const processor = unified()
    .use(rehypeParse, { fragment: true })
    .use(rehypeSanitize, createCustomSchema());

  const tree = processor.parse(processedHtml);
  return processor.runSync(tree) as Root;
}

// Convert HAST to a serializable AST for storage
export interface TemplateNode {
  type: 'element' | 'text' | 'root';
  tagName?: string;
  properties?: Record<string, any>;
  children?: TemplateNode[];
  value?: string;
}

export function astToJson(node: any): TemplateNode {
  if (node.type === 'text') {
    return {
      type: 'text',
      value: node.value
    };
  }

  if (node.type === 'element') {
    return {
      type: 'element',
      tagName: node.tagName,
      properties: node.properties || {},
      children: node.children?.map(astToJson) || []
    };
  }

  if (node.type === 'root') {
    const children = node.children?.map(astToJson) || [];
    
    // Check if we have a single auto-added div wrapper to unwrap
    if (children.length === 1 && 
        children[0].type === 'element' && 
        children[0].tagName === 'div') {
      
      const divElement = children[0];
      const hasEmptyProperties = !divElement.properties || Object.keys(divElement.properties).length === 0;
      const hasMultipleChildren = divElement.children && divElement.children.length > 1;
      
      if (hasEmptyProperties && hasMultipleChildren) {
        // This looks like our auto-added wrapper, unwrap it
        const divChildren = divElement.children.filter((child: any) => 
          child.type !== 'text' || (child.value && child.value.trim())
        );
        
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