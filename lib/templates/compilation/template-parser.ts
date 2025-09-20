import { unified } from 'unified';
import rehypeParse from 'rehype-parse';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import type { Root } from 'hast';
import { componentRegistry } from '../core/template-registry';

// Define our custom sanitization schema
function createCustomSchema() {
  // Start with a more permissive base instead of defaultSchema
  const schema = {
    tagNames: [...(defaultSchema.tagNames || [])],
    attributes: { ...(defaultSchema.attributes || {}) },
    protocols: { ...(defaultSchema.protocols || {}) }
  };
  
  // Allow placeholder URLs like "#"
  schema.protocols.src = ['http', 'https', 'mailto', 'tel', 'data', '#'];
  schema.protocols.href = ['http', 'https', 'mailto', 'tel', '#'];
  
  // Allow custom component tags from the registry
  if (componentRegistry) {
    const allowedTags = componentRegistry.getAllowedTags();
    for (const tagName of allowedTags) {
      // Add both original and lowercase versions
      const lowerTagName = tagName.toLowerCase();
      
      if (!schema.tagNames.includes(tagName)) {
        schema.tagNames.push(tagName);
      }
      if (!schema.tagNames.includes(lowerTagName)) {
        schema.tagNames.push(lowerTagName);
      }
      
      // Allow ALL attributes for custom components - use a very permissive list
      const allAttributes = [
        '*', // Wildcard
        'src', 'alt', 'caption', 'link', 'level', 'name', 'category', 'color', 'type', 'value',
        'title', 'text', 'speed', 'amplitude', 'label', 'max', 'description', 'icon', 'priority',
        'when', 'data', 'equals', 'exists', 'condition', 'variant', 'size', 'rotation', 'shadow',
        'buttonText', 'revealText', 'buttonStyle', 'ratio', 'vertical', 'gap', 'responsive',
        'expanded', 'theme', 'layout', 'showHeader', 'collapsible', 'maxMethods', 'showTitle',
        'as', 'showLabel', 'intensity', 'glitchColor1', 'glitchColor2', 'showValues', 'display',
        'showCategories', 'sortBy', 'maxDisplay', 'columns', 'copyable', 'autoplay', 'autoPlay',
        'interval', 'showThumbnails', 'showthumbnails', 'showDots', 'showArrows', 'height',
        'transition', 'loop', 'controls', 'direction', 'align', 'justify', 'wrap', 'gradient',
        'padding', 'rounded', 'colors', 'opacity', 'limit', 'maxWidth', 'animation', 'position',
        'yearsExperience', 'className', 'class',
        // Add positioning data attributes for visual builder (both kebab-case and camelCase)
        'data-position', 'data-pixel-position', 'data-positioning-mode', 'data-grid-position',
        'dataPosition', 'dataPixelPosition', 'dataPositioningMode', 'dataGridPosition',
        // Add grid-specific attributes
        'data-grid-column', 'data-grid-row', 'data-grid-span',
        'dataGridColumn', 'dataGridRow', 'dataGridSpan'
      ];
      
      schema.attributes[tagName] = allAttributes;
      schema.attributes[lowerTagName] = allAttributes;
    }
  }
  
  return schema;
}

// Parse HTML to HAST (Hypertext Abstract Syntax Tree)
export function parseTemplate(htmlString: string): Root {
  console.log('🔍 [TEMPLATE_PARSER] Starting parseTemplate with HTML:', htmlString.substring(0, 500) + '...');

  // Check for positioning data in original HTML
  const hasPositioningData = htmlString.includes('data-positioning-mode') || htmlString.includes('data-pixel-position');
  console.log('🔍 [TEMPLATE_PARSER] Original HTML contains positioning data:', hasPositioningData);

  if (hasPositioningData) {
    console.log('🔍 [TEMPLATE_PARSER] Found positioning attributes in original HTML:');
    const positioningMatches = htmlString.match(/data-(?:positioning-mode|pixel-position|position)="[^"]*"/g);
    console.log('🔍 [TEMPLATE_PARSER] Positioning attributes found:', positioningMatches);
  }

  // Handle full HTML documents vs fragments
  let processedHtml = htmlString.trim();
  
  // Check if this is a full HTML document
  const isFullDocument = processedHtml.includes('<!DOCTYPE') || 
                         (processedHtml.includes('<html') && processedHtml.includes('<body>'));
  
  if (isFullDocument) {
    // Extract body content from full HTML document
    const bodyMatch = processedHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if (bodyMatch && bodyMatch[1]) {
      const originalLength = processedHtml.length;
      processedHtml = bodyMatch[1].trim();
      console.log('🔍 Body extraction:', {
        method: 'regex',
        originalLength,
        extractedLength: processedHtml.length,
        preview: processedHtml.substring(0, 200) + '...',
        endsAt: processedHtml.substring(processedHtml.length - 50)
      });
    } else {
      // Fallback: try to extract content between body tags even if malformed
      const bodyStart = processedHtml.indexOf('<body');
      const bodyEnd = processedHtml.lastIndexOf('</body>');
      if (bodyStart !== -1 && bodyEnd !== -1) {
        const bodyOpenEnd = processedHtml.indexOf('>', bodyStart);
        if (bodyOpenEnd !== -1) {
          const originalLength = processedHtml.length;
          processedHtml = processedHtml.substring(bodyOpenEnd + 1, bodyEnd).trim();
          console.log('🔍 Body extraction:', {
            method: 'fallback',
            originalLength,
            extractedLength: processedHtml.length,
            bodyStart,
            bodyEnd,
            preview: processedHtml.substring(0, 200) + '...'
          });
        }
      }
    }
  }
  
  // Always convert self-closing custom tags to opening/closing pairs for better parsing
  const originalLength = processedHtml.length;
  const beforeConversion = processedHtml.substring(0, 500);
  processedHtml = processedHtml.replace(/<([^>\s/]+)([^>]*?)\s*\/>/g, '<$1$2></$1>');
  console.log('🔄 Self-closing tag conversion:', {
    originalLength,
    processedLength: processedHtml.length,
    beforePreview: beforeConversion,
    afterPreview: processedHtml.substring(0, 500),
    exampleConversions: processedHtml.match(/<(carouselimage|skill|contactmethod)[^>]*>/gi)?.slice(0, 3)
  });
  
  // Detect if we have multiple root-level components after conversion and wrap them
  const trimmedHtml = processedHtml.trim();
  const hasMultipleRootElements = /<[^>]+><\/[^>]+>[\s\S]*<[^>]+><\/[^>]+>/.test(trimmedHtml) && 
                                  !trimmedHtml.startsWith('<div') && 
                                  !trimmedHtml.startsWith('<section') &&
                                  !trimmedHtml.startsWith('<main');
  
  if (hasMultipleRootElements) {
    processedHtml = `<div>${processedHtml}</div>`;
  }

  // Parse as fragment (now we have clean body content)
  const processor = unified()
    .use(rehypeParse, { fragment: true })
    .use(rehypeSanitize, createCustomSchema());

  console.log('🔍 [TEMPLATE_PARSER] Processing with sanitization schema, input HTML:', processedHtml.substring(0, 300) + '...');

  const tree = processor.parse(processedHtml);
  console.log('🔍 [TEMPLATE_PARSER] Parsed tree before sanitization:', JSON.stringify(tree, null, 2).substring(0, 1000) + '...');

  const processed = processor.runSync(tree);
  console.log('🔍 [TEMPLATE_PARSER] Processed tree after sanitization:', JSON.stringify(processed, null, 2).substring(0, 1000) + '...');

  // Check if positioning data survived sanitization (check both kebab-case and camelCase)
  const processedString = JSON.stringify(processed);
  const hasPositioningAfterSanitization = processedString.includes('data-positioning-mode') ||
                                          processedString.includes('data-pixel-position') ||
                                          processedString.includes('dataPositioningMode') ||
                                          processedString.includes('dataPixelPosition') ||
                                          processedString.includes('dataPosition');
  console.log('🔍 [TEMPLATE_PARSER] Positioning data survived sanitization:', hasPositioningAfterSanitization);

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

  // Debug positioning data preservation through AST transformation
  if (typedNode.type === 'element' && typedNode.properties) {
    const hasPositioningProps = Object.keys(typedNode.properties).some(key =>
      key.includes('data-positioning-mode') || key.includes('data-pixel-position') || key.includes('data-position')
    );
    if (hasPositioningProps) {
      console.log('🔍 [AST_TRANSFORM] Element with positioning props:', {
        tagName: typedNode.tagName,
        properties: typedNode.properties
      });
    }
  }

  if (typedNode.type === 'text') {
    return {
      type: 'text',
      value: typedNode.value
    };
  }

  if (typedNode.type === 'element') {
    // Debug: Log positioning data preservation during astToJson conversion
    const hasPositioningProps = typedNode.properties && Object.keys(typedNode.properties).some(key =>
      key.includes('dataPositioningMode') || key.includes('dataPixelPosition') || key.includes('dataPosition')
    );
    if (hasPositioningProps) {
      console.log('🔍 [AST_TO_JSON] Converting element with positioning props:', {
        tagName: typedNode.tagName,
        beforeProperties: typedNode.properties
      });
    }

    const result: TemplateNode = {
      type: 'element' as const,
      tagName: typedNode.tagName,
      properties: typedNode.properties || {},
      children: typedNode.children?.map(astToJson) || []
    };

    if (hasPositioningProps) {
      console.log('🔍 [AST_TO_JSON] After conversion:', {
        tagName: result.tagName,
        afterProperties: result.properties
      });
    }

    return result;
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

  // Check limits (increased for showcase templates)
  if (nodeCount > 500) {
    errors.push(`Too many nodes: ${nodeCount} (max: 500)`);
  }

  if (maxDepth > 30) {
    errors.push(`Template too deeply nested: ${maxDepth} levels (max: 30)`);
  }

  if (totalComponents > 100) {
    errors.push(`Too many components: ${totalComponents} (max: 100)`);
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
  console.log('🔍 [COMPILE_TEMPLATE] Starting compilation for HTML:', htmlString.substring(0, 200) + '...');

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
    console.log('🔍 [COMPILE_TEMPLATE] Calling parseTemplate...');
    const hast = parseTemplate(htmlString);

    // Convert to JSON AST
    console.log('🔍 [COMPILE_TEMPLATE] Converting HAST to JSON AST...');
    const ast = astToJson(hast);

    // Check final AST for positioning data
    const astString = JSON.stringify(ast);
    const hasPositioningInFinalAST = astString.includes('data-positioning-mode') ||
                                     astString.includes('data-pixel-position') ||
                                     astString.includes('dataPositioningMode') ||
                                     astString.includes('dataPixelPosition') ||
                                     astString.includes('dataPosition');
    console.log('🔍 [COMPILE_TEMPLATE] Final AST contains positioning data:', hasPositioningInFinalAST);

    if (hasPositioningInFinalAST) {
      console.log('🔍 [COMPILE_TEMPLATE] Final AST preview:', JSON.stringify(ast, null, 2).substring(0, 800) + '...');
    }

    // Validate
    console.log('🔍 [COMPILE_TEMPLATE] Validating template...');
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