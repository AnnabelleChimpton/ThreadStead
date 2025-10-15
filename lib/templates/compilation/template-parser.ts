import { unified } from 'unified';
import rehypeParse from 'rehype-parse';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import type { Root } from 'hast';
import { componentRegistry } from '../core/template-registry';
import { getAllowedAttributes } from '../core/attribute-mappings';
import { TEMPLATE_LIMITS, formatLimitError, checkWarningThresholds } from './template-limits';

// QUICK WIN #2: Cache schema to avoid recreating on every parse
// Schema is only rebuilt when component registry changes
let cachedSchema: any = null;
let lastRegistrySize: number = 0;

// Define our custom sanitization schema
function createCustomSchema() {
  // Check if we can reuse cached schema
  const currentRegistrySize = componentRegistry.size;

  if (cachedSchema && currentRegistrySize === lastRegistrySize) {
    return cachedSchema;
  }
  // Start with a more permissive base instead of defaultSchema
  const schema = {
    tagNames: [...(defaultSchema.tagNames || [])],
    // Deep copy attributes to avoid modifying defaultSchema's arrays
    attributes: Object.entries(defaultSchema.attributes || {}).reduce((acc, [tag, attrs]) => {
      acc[tag] = Array.isArray(attrs) ? [...attrs] : attrs;
      return acc;
    }, {} as Record<string, any>),
    protocols: { ...(defaultSchema.protocols || {}) },
    // CRITICAL: Allow inline CSS properties in style attributes
    // Without this, rehype-sanitize strips ALL inline styles
    properties: {
      style: ['*'] // Allow all CSS properties
    }
  };
  
  // Allow placeholder URLs like "#"
  schema.protocols.src = ['http', 'https', 'mailto', 'tel', 'data', '#'];
  schema.protocols.href = ['http', 'https', 'mailto', 'tel', '#'];

  // Add class to wildcard attributes so ALL tags can have classes
  if (schema.attributes['*']) {
    const wildcardAttrs = schema.attributes['*'];
    if (!wildcardAttrs.includes('class')) {
      wildcardAttrs.push('class');
    }
    if (!wildcardAttrs.includes('className')) {
      wildcardAttrs.push('className');
    }
  }

  // Allow class attributes on all standard HTML elements
  const standardHTMLTags = [
    'div', 'span', 'section', 'article', 'aside', 'header', 'footer', 'main', 'nav',
    'a', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li', 'dl', 'dt', 'dd',
    'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
    'form', 'input', 'button', 'select', 'textarea', 'label',
    'img', 'video', 'audio', 'canvas', 'svg',
    'strong', 'em', 'code', 'pre', 'blockquote'
  ];

  for (const tag of standardHTMLTags) {
    // Ensure the tag has an attributes array
    if (!schema.attributes[tag]) {
      schema.attributes[tag] = [];
    }

    // Remove conditional class/className entries like ['className', 'value']
    // These restrict className to specific values only, which breaks our templates
    schema.attributes[tag] = schema.attributes[tag].filter((attr: any) => {
      if (Array.isArray(attr) && (attr[0] === 'class' || attr[0] === 'className')) {
        return false; // Remove conditional class/className
      }
      return true;
    });

    // Add unconditional class and className (allow any value)
    if (!schema.attributes[tag].includes('class')) {
      schema.attributes[tag].push('class');
    }
    if (!schema.attributes[tag].includes('className')) {
      schema.attributes[tag].push('className');
    }
    // Add style attribute (allow inline styles with CSS variables)
    if (!schema.attributes[tag].includes('style')) {
      schema.attributes[tag].push('style');
    }
    // Add id attribute (will be prefixed with user-content- by rehype-sanitize for security)
    if (!schema.attributes[tag].includes('id')) {
      schema.attributes[tag].push('id');
    }
  }

  // Allow custom component tags from the registry
  if (componentRegistry) {
    const allowedTags = componentRegistry.getAllowedTags();

    // Get all allowed attributes from centralized mapping system
    // This eliminates ~166 lines of manually listed attributes
    const allAttributes = getAllowedAttributes();

    for (const tagName of allowedTags) {
      // Add both original and lowercase versions
      const lowerTagName = tagName.toLowerCase();

      if (!schema.tagNames.includes(tagName)) {
        schema.tagNames.push(tagName);
      }
      if (!schema.tagNames.includes(lowerTagName)) {
        schema.tagNames.push(lowerTagName);
      }

      // Apply centralized allowed attributes list
      schema.attributes[tagName] = allAttributes;
      schema.attributes[lowerTagName] = allAttributes;
    }
  }

  // Cache the schema for future use
  cachedSchema = schema;
  lastRegistrySize = currentRegistrySize;

  return schema;
}

/**
 * Convert self-closing tags to proper closing tags while respecting quoted attributes
 * Handles cases like: <Filter where="item.price > 100" />
 * The regex approach fails because > inside quotes terminates the match early
 */
function convertSelfClosingTags(html: string): string {
  let result = '';
  let i = 0;

  while (i < html.length) {
    // Look for opening < of a tag
    if (html[i] === '<') {
      // Check if this might be a self-closing tag
      const tagStart = i;
      i++; // Skip <

      // Skip whitespace after <
      while (i < html.length && /\s/.test(html[i])) i++;

      // Extract tag name
      let tagName = '';
      while (i < html.length && /[a-zA-Z0-9\-]/.test(html[i])) {
        tagName += html[i];
        i++;
      }

      // If no tag name, this isn't a tag - just copy and continue
      if (!tagName) {
        result += html[tagStart];
        continue;
      }

      // Now parse attributes, respecting quotes
      let attributes = '';
      let inQuote = false;
      let quoteChar = '';
      let isSelfClosing = false;

      while (i < html.length) {
        const char = html[i];

        // Track quote state
        if ((char === '"' || char === "'") && (i === 0 || html[i - 1] !== '\\')) {
          if (!inQuote) {
            inQuote = true;
            quoteChar = char;
          } else if (char === quoteChar) {
            inQuote = false;
            quoteChar = '';
          }
        }

        // Check for self-closing /> (only when not in quotes)
        if (!inQuote && char === '/' && i + 1 < html.length && html[i + 1] === '>') {
          isSelfClosing = true;
          i += 2; // Skip />
          break;
        }

        // Check for regular closing > (only when not in quotes)
        if (!inQuote && char === '>') {
          i++; // Skip >
          break;
        }

        attributes += char;
        i++;
      }

      // Build the result
      if (isSelfClosing) {
        // Convert to proper closing tag
        result += `<${tagName}${attributes}></${tagName}>`;
      } else {
        // Regular tag, keep as is
        result += `<${tagName}${attributes}>`;
      }
    } else {
      // Not a tag, just copy
      result += html[i];
      i++;
    }
  }

  return result;
}

// Helper function to extract ALL tag names from HTML string (both Components and HTML tags)
// This allows us to track what gets stripped during sanitization
function extractComponentTags(html: string): Array<{ name: string; line: number }> {
  const tags: Array<{ name: string; line: number }> = [];
  const lines = html.split('\n');

  // Match ALL opening tags (both uppercase Components and lowercase HTML tags)
  // But skip closing tags and comments
  const tagRegex = /<([a-zA-Z][a-zA-Z0-9]*)/g;

  lines.forEach((line, lineIndex) => {
    let match;
    // Reset regex for each line
    tagRegex.lastIndex = 0;

    while ((match = tagRegex.exec(line)) !== null) {
      const tagName = match[1];

      // Skip if this is a closing tag (preceded by </)
      const fullMatch = match[0];
      const beforeTag = line.substring(Math.max(0, match.index - 1), match.index);
      if (beforeTag === '/') {
        continue; // Skip closing tags
      }

      tags.push({
        name: tagName,
        line: lineIndex + 1
      });
    }
  });

  return tags;
}

// Pre-parse syntax validation to catch common errors before rehype
function detectSyntaxErrors(htmlString: string): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const lines = htmlString.split('\n');

  // Track quote state across the template
  let inQuote = false;
  let quoteChar = '';
  let quoteStartLine = 0;

  // Track tag stack for matching opening/closing tags
  const tagStack: Array<{ name: string; line: number }> = [];

  // Check each line for syntax issues
  lines.forEach((line, lineIndex) => {
    const lineNum = lineIndex + 1;

    // Check for unclosed tags (tags that don't end with > or />)
    // Look for < followed by tag name and attributes, but no closing
    const openTagMatch = line.match(/<([A-Z][a-zA-Z0-9]*)\s+[^>]*$/);
    if (openTagMatch && !line.trim().endsWith('/>') && !line.trim().endsWith('>')) {
      const tagName = openTagMatch[1];
      errors.push(
        `Unclosed tag on line ${lineNum}: <${tagName}...> is missing closing '>' or '/>'.\n` +
        `  ${line.trim()}\n` +
        `Tip: Self-closing tags must end with />`
      );
    }

    // Track opening and closing tags for structure validation
    // Match opening tags: <TagName ...> or <tagname ...> (but not self-closing />)
    // Match both Components (uppercase) and HTML tags (lowercase)
    const openingTagRegex = /<([a-zA-Z][a-zA-Z0-9]*)[^>]*>/g;
    let match;
    while ((match = openingTagRegex.exec(line)) !== null) {
      const fullMatch = match[0];
      const tagName = match[1];

      // Skip void HTML elements that don't need closing tags
      const voidElements = ['img', 'br', 'hr', 'input', 'meta', 'link', 'area', 'base', 'col', 'embed', 'param', 'source', 'track', 'wbr'];
      if (voidElements.includes(tagName.toLowerCase())) {
        continue;
      }

      // Check if it's self-closing (ends with />)
      if (!fullMatch.trim().endsWith('/>')) {
        tagStack.push({ name: tagName, line: lineNum });
      }
    }

    // Match closing tags: </TagName> or </tagname>
    const closingTagRegex = /<\/([a-zA-Z][a-zA-Z0-9]*)>/g;
    while ((match = closingTagRegex.exec(line)) !== null) {
      const closingTagName = match[1];

      if (tagStack.length === 0) {
        errors.push(
          `Line ${lineNum}: Unexpected closing tag </${closingTagName}>.\n` +
          `  ${line.trim()}\n` +
          `Tip: This closing tag has no matching opening tag`
        );
      } else {
        const lastOpened = tagStack.pop()!;

        // Check if closing tag matches the last opened tag
        if (lastOpened.name !== closingTagName) {
          errors.push(
            `Line ${lineNum}: Mismatched closing tag </${closingTagName}>.\n` +
            `  Expected </${lastOpened.name}> (opened on line ${lastOpened.line})\n` +
            `  ${line.trim()}\n` +
            `Tip: Closing tags must match their opening tags exactly`
          );

          // Put it back since we didn't find the right match
          tagStack.push(lastOpened);
        }
      }
    }

    // Check for mismatched quotes in attributes
    // This properly handles nested quotes (e.g., when="{{ theme === 'dark' }}")
    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      // Skip escaped quotes
      if (i > 0 && line[i - 1] === '\\') continue;

      if ((char === '"' || char === "'") && !inQuote) {
        // Opening quote
        inQuote = true;
        quoteChar = char;
        quoteStartLine = lineNum;
      } else if (char === quoteChar && inQuote) {
        // Closing quote
        inQuote = false;
        quoteChar = '';
      }
    }

    // Check for invalid JSON in initial attributes
    const initialMatch = line.match(/initial=['"](\{[^'"]*\})['"]/);
    if (initialMatch) {
      const jsonStr = initialMatch[1];
      try {
        JSON.parse(jsonStr);
      } catch (e) {
        errors.push(
          `Invalid JSON in 'initial' attribute on line ${lineNum}.\n` +
          `  ${jsonStr}\n` +
          `Tip: Use double quotes for JSON property names and string values`
        );
      }
    }
  });

  // Check for unclosed quote at end of document
  if (inQuote) {
    errors.push(
      `Unclosed quote starting on line ${quoteStartLine}.\n` +
      `Tip: Make sure all attribute values have matching quotes`
    );
  }

  // Check for unclosed tags at end of document
  if (tagStack.length > 0) {
    tagStack.forEach(tag => {
      errors.push(
        `Line ${tag.line}: Unclosed tag <${tag.name}>.\n` +
        `Tip: Every opening tag needs a matching closing tag. Add </${tag.name}> before the end of the template.`
      );
    });
  }

  return { errors, warnings };
}

// Parse HTML to HAST (Hypertext Abstract Syntax Tree)
// Returns both the parsed tree and information about stripped components
export function parseTemplate(htmlString: string): Root & { _strippedComponents?: Array<{ name: string; line?: number; reason?: string }> } {

  // Extract component tags BEFORE sanitization
  const componentsBefore = extractComponentTags(htmlString);

  // Unescape HTML entities in attributes before processing
  // This handles &quot; &apos; &lt; &gt; &amp; etc.
  let processedHtml = htmlString.trim()
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
  
  // Check if this is a full HTML document
  const isFullDocument = processedHtml.includes('<!DOCTYPE') || 
                         (processedHtml.includes('<html') && processedHtml.includes('<body>'));
  
  if (isFullDocument) {
    // Extract body content from full HTML document
    const bodyMatch = processedHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if (bodyMatch && bodyMatch[1]) {
      processedHtml = bodyMatch[1].trim();
    } else {
      // Fallback: try to extract content between body tags even if malformed
      const bodyStart = processedHtml.indexOf('<body');
      const bodyEnd = processedHtml.lastIndexOf('</body>');
      if (bodyStart !== -1 && bodyEnd !== -1) {
        const bodyOpenEnd = processedHtml.indexOf('>', bodyStart);
        if (bodyOpenEnd !== -1) {
          processedHtml = processedHtml.substring(bodyOpenEnd + 1, bodyEnd).trim();
        }
      }
    }
  }
  
  // Convert self-closing tags to proper closing tags, respecting quoted attributes
  // This properly handles cases like: <Filter where="item.price > 100" />
  processedHtml = convertSelfClosingTags(processedHtml);
  
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
  // IMPORTANT: rehype-parse may collapse whitespace by default
  // We need to preserve whitespace for inline components
  const processor = unified()
    .use(rehypeParse, {
      fragment: true,
      // Preserve whitespace around inline elements
      emitParseErrors: false,
      duplicateAttribute: false
    })
    .use(rehypeSanitize, createCustomSchema());

  const tree = processor.parse(processedHtml);

  const processed = processor.runSync(tree);

  // Check if positioning data survived sanitization (check both old and new formats)
  const processedString = JSON.stringify(processed);

  // DEBUG: Log what the parser extracted for Var/Set/ShowVar components (development only)
  if (process.env.NODE_ENV === 'development') {
    if (processedString.includes('"var"') || processedString.includes('"Var"')) {
      // Find and log Var nodes with their properties
      const findVarNodes = (node: any): any[] => {
        const results: any[] = [];
        if (node.tagName === 'var' || node.tagName === 'Var') {
          results.push({ tagName: node.tagName, properties: node.properties });
        }
        if (node.children) {
          for (const child of node.children) {
            results.push(...findVarNodes(child));
          }
        }
        return results;
      };
    }
  }

  const hasPositioningAfterSanitization = processedString.includes('data-positioning-mode') ||
                                          processedString.includes('data-pixel-position') ||
                                          processedString.includes('data-pure-positioning') ||
                                          processedString.includes('dataPositioningMode') ||
                                          processedString.includes('dataPixelPosition') ||
                                          processedString.includes('dataPurePositioning') ||
                                          processedString.includes('dataPosition');

  // Extract ALL tags AFTER sanitization by traversing the AST (Components and HTML tags)
  const tagsAfter: string[] = [];
  const extractTagsFromAst = (node: any) => {
    // Track all tag names that survived sanitization
    if (node.tagName) {
      tagsAfter.push(node.tagName);
    }
    if (node.children) {
      node.children.forEach(extractTagsFromAst);
    }
  };
  extractTagsFromAst(processed);

  // Compare before/after to find stripped tags (both Components and HTML tags)
  // Use case-insensitive comparison because rehype might normalize tag names
  const strippedComponents: Array<{ name: string; line?: number; reason?: string }> = [];
  const allowedTagsLowercase = new Set(tagsAfter.map(t => t.toLowerCase()));

  componentsBefore.forEach(tag => {
    if (!allowedTagsLowercase.has(tag.name.toLowerCase())) {
      // Check if it's a registered component
      const isRegistered = componentRegistry.get(tag.name);

      // Determine reason for stripping
      let reason: string;
      if (!isRegistered) {
        // Not a registered component - could be unknown component or disallowed HTML tag
        if (/^[A-Z]/.test(tag.name)) {
          reason = 'Unknown component (not registered in template system)';
        } else {
          reason = 'Disallowed HTML tag (removed by security sanitization)';
        }
      } else {
        reason = 'Invalid attributes or structure (removed by sanitization)';
      }

      strippedComponents.push({
        name: tag.name,
        line: tag.line,
        reason
      });
    }
  });

  // Validate component attributes against registry
  const attributeWarnings = validateComponentAttributes(processed);

  // Attach stripped components and attribute warnings to the result
  const result = processed as Root & {
    _strippedComponents?: Array<{ name: string; line?: number; reason?: string }>;
    _attributeWarnings?: string[];
  };

  if (strippedComponents.length > 0) {
    result._strippedComponents = strippedComponents;
  }

  if (attributeWarnings.length > 0) {
    result._attributeWarnings = attributeWarnings;
  }

  return result;
}

// Validate component attributes against registry definitions
function validateComponentAttributes(node: any, warnings: string[] = [], lineNumber = 0): string[] {
  if (node.tagName) {
    // Check if this is a registered component
    // Try both the original tagName and the capitalized version (rehype may normalize case)
    let componentDef = componentRegistry.get(node.tagName);
    if (!componentDef && node.tagName.length > 0) {
      // Try with first letter capitalized
      const capitalizedName = node.tagName.charAt(0).toUpperCase() + node.tagName.slice(1);
      componentDef = componentRegistry.get(capitalizedName);
    }

    if (componentDef && componentDef.props) {
      const props = node.properties || {};

      // Validate each attribute
      Object.entries(props).forEach(([attrName, attrValue]) => {
        const propDef = componentDef.props![attrName];

        if (!propDef) {
          // Unknown attribute - skip (might be universal props like class, id, style)
          return;
        }

        // Validate enum values
        if (propDef.type === 'enum' && propDef.values) {
          const value = String(attrValue);
          if (!propDef.values.includes(value)) {
            // Use the original component name for display (capitalize if needed)
            const displayName = componentDef.name || node.tagName;
            warnings.push(
              `<${displayName}> has invalid "${attrName}" value: "${value}".\n` +
              `  Valid values are: ${propDef.values.join(', ')}\n` +
              `  Tip: Check the component documentation for allowed values`
            );
          }
        }

        // Validate required attributes
        if (propDef.required && (attrValue === undefined || attrValue === null || attrValue === '')) {
          const displayName = componentDef.name || node.tagName;
          warnings.push(
            `<${displayName}> is missing required attribute "${attrName}"`
          );
        }
      });

      // Check for missing required attributes
      if (componentDef.props) {
        Object.entries(componentDef.props).forEach(([propName, propDef]) => {
          if (propDef.required && !(propName in props)) {
            const displayName = componentDef.name || node.tagName;
            warnings.push(
              `<${displayName}> is missing required attribute "${propName}"`
            );
          }
        });
      }
    }
  }

  // Recursively validate children
  if (node.children) {
    node.children.forEach((child: any) => {
      validateComponentAttributes(child, warnings, lineNumber);
    });
  }

  return warnings;
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
    const result: TemplateNode = {
      type: 'element' as const,
      tagName: typedNode.tagName,
      properties: typedNode.properties || {},
      children: typedNode.children?.map(astToJson) || []
    };

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

  // Check hard limits (Phase 3: Using centralized limit management)
  if (nodeCount > TEMPLATE_LIMITS.maxNodes) {
    errors.push(formatLimitError('nodes', nodeCount, TEMPLATE_LIMITS.maxNodes));
  }

  if (maxDepth > TEMPLATE_LIMITS.maxDepth) {
    errors.push(formatLimitError('depth', maxDepth, TEMPLATE_LIMITS.maxDepth));
  }

  if (totalComponents > TEMPLATE_LIMITS.maxComponents) {
    errors.push(formatLimitError('components', totalComponents, TEMPLATE_LIMITS.maxComponents));
  }

  // Check warning thresholds (Phase 3: Soft limits)
  const thresholdWarnings = checkWarningThresholds({
    nodes: nodeCount,
    depth: maxDepth,
    components: totalComponents,
  });
  warnings.push(...thresholdWarnings);

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
  strippedComponents?: Array<{
    name: string;
    line?: number;
    reason?: string;
  }>;
}

export function compileTemplate(htmlString: string): CompilationResult {
  try {
    // Check size limit (Phase 3: Using centralized limit management)
    const sizeBytes = new Blob([htmlString]).size;
    const sizeKB = sizeBytes / 1024;
    const maxKB = TEMPLATE_LIMITS.maxSizeBytes / 1024;

    if (sizeBytes > TEMPLATE_LIMITS.maxSizeBytes) {
      return {
        success: false,
        errors: [formatLimitError('size', Math.round(sizeKB), Math.round(maxKB))]
      };
    }

    // Pre-validate syntax before parsing
    const syntaxCheck = detectSyntaxErrors(htmlString);
    if (syntaxCheck.errors.length > 0) {
      return {
        success: false,
        errors: syntaxCheck.errors
      };
    }

    // Parse and sanitize
    const hast = parseTemplate(htmlString);

    // Extract stripped components and attribute warnings from the HAST result
    const strippedComponents = (hast as any)._strippedComponents;
    const attributeWarnings = (hast as any)._attributeWarnings || [];

    // Convert to JSON AST
    const ast = astToJson(hast);

    // Check final AST for positioning data (both old and new formats)
    const astString = JSON.stringify(ast);

    // Validate
    const validation = validateTemplate(ast);

    // Merge attribute warnings into validation warnings
    if (attributeWarnings.length > 0 && validation.warnings) {
      validation.warnings.push(...attributeWarnings);
    }

    // Add size warning check (Phase 3)
    const sizeWarnings = checkWarningThresholds({ sizeBytes });
    if (sizeWarnings.length > 0 && validation.warnings) {
      validation.warnings.push(...sizeWarnings);
    }

    return {
      success: validation.isValid,
      ast: validation.isValid ? ast : undefined,
      validation,
      errors: validation.errors,
      strippedComponents: strippedComponents || undefined
    };
  } catch (error) {
    // Extract meaningful error details from rehype/parser errors
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Try to extract line number if available
    const lineMatch = errorMessage.match(/line (\d+)/i) || errorMessage.match(/(\d+):/);
    const locationInfo = lineMatch ? ` (near line ${lineMatch[1]})` : '';

    // Provide context-aware error messages based on error type
    let friendlyError = `Template parsing failed${locationInfo}`;
    const detailsPrefix = 'Parser details: ';

    if (errorMessage.toLowerCase().includes('unexpected end')) {
      friendlyError = `Unclosed tag detected${locationInfo}.\nCheck that all tags are properly closed with /> or matching closing tags.`;
    } else if (errorMessage.toLowerCase().includes('invalid character') || errorMessage.toLowerCase().includes('unexpected character')) {
      friendlyError = `Invalid character in template${locationInfo}.\nCheck for special characters or unclosed quotes in attribute values.`;
    } else if (errorMessage.toLowerCase().includes('missing')) {
      friendlyError = `Missing required element${locationInfo}.\n${errorMessage}`;
    }

    // Return both friendly and technical error messages
    const errors = [friendlyError];
    if (!errorMessage.includes(friendlyError)) {
      errors.push(`${detailsPrefix}${errorMessage}`);
    }

    return {
      success: false,
      errors
    };
  }
}