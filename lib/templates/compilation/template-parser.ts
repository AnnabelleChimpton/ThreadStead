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
  }

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
        'src', 'alt', 'caption', 'link', 'level', 'name', 'category', 'color', 'textcolor', 'textColor', 'accentcolor', 'accentColor', 'type', 'value',
        'title', 'text', 'speed', 'amplitude', 'label', 'max', 'description', 'icon', 'priority',
        'when', 'data', 'equals', 'exists', 'condition', 'variant', 'size', 'rotation', 'shadow',
        // Template variable props (Var, ShowVar, Set components)
        'initial', 'persist', 'param', 'default', 'expression', 'var', 'format', 'fallback', 'coerce', 'separator', 'dateFormat', 'dateformat',
        // Interactive component props (Increment, Decrement, TInput, Checkbox, ShowToast, If/Else)
        'by', 'min', 'step', 'rows', 'multiline', 'message', 'duration', 'disabled', 'placeholder',
        // Phase 4: Validation props (Validate component)
        'pattern', 'required', 'minlength', 'minLength', 'maxlength', 'maxLength',
        // Phase 4: Event handler props (OnKeyPress)
        'keyname', 'keyName',
        // Phase 4: CSS manipulation props (AddClass, RemoveClass, ToggleClass, SetCSSVar)
        'target',
        // Phase 4: OnVisible props
        'threshold', 'once',
        // Phase 3: Input component props (RadioGroup, Slider, Select, ColorPicker)
        'showValue', 'showvalue', 'direction', 'debounce',
        // Phase 3: Array/String action props (Push, Pop, RemoveAt, ArrayAt, Append, Prepend, Cycle)
        'index', 'values', 'array',
        // Phase 3: Event handler props (OnChange, OnMount, OnInterval, Delay, Sequence/Step)
        'seconds', 'milliseconds', 'delay',
        // Phase 4: Loop props (ForEach)
        'item',
        // Phase 1 (Roadmap): Error handling props (Attempt component)
        'showError', 'showerror', 'show-error',
        // Phase 2 (Roadmap): Collection operation props (Filter, Sort, Transform, Find, Count, Sum, Get)
        'where', 'by', 'order', 'property', 'from', 'at',
        // Conditional component comparison operators (both camelCase and kebab-case)
        'greaterthan', 'greaterThan', 'greater-than',
        'lessthan', 'lessThan', 'less-than',
        'greaterthanorequal', 'greaterThanOrEqual', 'greater-than-or-equal',
        'lessthanorequal', 'lessThanOrEqual', 'less-than-or-equal',
        'notequals', 'notEquals', 'not-equals',
        'startswith', 'startsWith', 'starts-with',
        'endswith', 'endsWith', 'ends-with',
        'contains', 'matches', 'and', 'or', 'not',
        'buttonText', 'revealText', 'buttonStyle', 'ratio', 'vertical', 'gap', 'responsive',
        'expanded', 'theme', 'layout', 'showHeader', 'collapsible', 'maxMethods', 'showTitle',
        'as', 'showLabel', 'intensity', 'glitchColor1', 'glitchColor2', 'showValues', 'display',
        'showCategories', 'sortBy', 'maxDisplay', 'columns', 'copyable', 'autoplay', 'autoPlay',
        'interval', 'showThumbnails', 'showthumbnails', 'showDots', 'showArrows', 'height',
        'transition', 'loop', 'controls', 'direction', 'align', 'justify', 'wrap', 'gradient',
        'padding', 'rounded', 'colors', 'opacity', 'limit', 'maxWidth', 'animation', 'position',
        'yearsExperience', 'className', 'class',

        // NEW: Internal system props for standardized components
        '__visualBuilder', '__visualbuilder',

        // COMPREHENSIVE STYLING ATTRIBUTES FOR MAXIMUM CREATIVE EXPRESSION

        // Core Styling Props
        'backgroundcolor', 'backgroundColor', 'style', 'customcss', 'customCSS', // Critical missing props
        'cssrendermode', 'cssRenderMode', // CSS render mode for CustomHTMLElement
        'fontfamily', 'fontFamily',
        'fontsize', 'fontSize',
        'fontweight', 'fontWeight',
        'textalign', 'textAlign',
        'textdecoration', 'textDecoration',
        'fontstyle', 'fontStyle',
        'texttransform', 'textTransform',

        // Spacing & Layout Props
        'margin', 'margintop', 'marginTop', 'marginright', 'marginRight',
        'marginbottom', 'marginBottom', 'marginleft', 'marginLeft',
        'padding', 'paddingtop', 'paddingTop', 'paddingright', 'paddingRight',
        'paddingbottom', 'paddingBottom', 'paddingleft', 'paddingLeft',
        'width', 'minwidth', 'minWidth', 'maxwidth', 'maxWidth',
        'height', 'minheight', 'minHeight', 'maxheight', 'maxHeight',
        'display', 'position', 'top', 'right', 'bottom', 'left', 'zindex', 'zIndex',

        // Border & Visual Effects
        'border', 'borderstyle', 'borderStyle', 'borderwidth', 'borderWidth',
        'bordercolor', 'borderColor', 'borderradius', 'borderRadius',
        'bordertop', 'borderTop', 'borderright', 'borderRight',
        'borderbottom', 'borderBottom', 'borderleft', 'borderLeft',
        'boxshadow', 'boxShadow', 'opacity', 'visibility', 'overflow', 'cursor',

        // Flexbox & Grid Props
        'flexdirection', 'flexDirection', 'flexwrap', 'flexWrap',
        'flexgrow', 'flexGrow', 'flexshrink', 'flexShrink', 'flexbasis', 'flexBasis',
        'justifycontent', 'justifyContent', 'alignitems', 'alignItems',
        'alignself', 'alignSelf', 'aligncontent', 'alignContent',
        'gridtemplate', 'gridTemplate', 'gridcolumn', 'gridColumn',
        'gridrow', 'gridRow', 'gap', 'columngap', 'columnGap', 'rowgap', 'rowGap',
        // NEW: Additional CSS Grid properties for standardized components
        'gridtemplatecolumns', 'gridTemplateColumns', 'gridtemplaterows', 'gridTemplateRows',
        'gridtemplateareas', 'gridTemplateAreas', 'gridautocolumns', 'gridAutoColumns',
        'gridautorows', 'gridAutoRows', 'gridautoflow', 'gridAutoFlow', 'gridarea', 'gridArea',
        'justifyitems', 'justifyItems', 'justifyself', 'justifySelf',

        // Text & Typography
        'lineheight', 'lineHeight', 'letterspacing', 'letterSpacing',
        'wordspacing', 'wordSpacing', 'textindent', 'textIndent',
        'whitespace', 'whiteSpace', 'wordbreak', 'wordBreak',
        'wordwrap', 'wordWrap', 'textoverflow', 'textOverflow',

        // Animation & Transitions
        'transform', 'transition', 'animation',
        'animationduration', 'animationDuration',
        'animationdelay', 'animationDelay',
        'animationtiming', 'animationTimingFunction',

        // Background Properties
        'backgroundimage', 'backgroundImage',
        'backgroundsize', 'backgroundSize',
        'backgroundposition', 'backgroundPosition',
        'backgroundrepeat', 'backgroundRepeat',
        'backgroundattachment', 'backgroundAttachment',

        // Additional Creative Props
        'filter', 'clippath', 'clipPath',
        'mixblendmode', 'mixBlendMode',
        'gradient', 'content',

        // Add positioning data attributes for visual builder (both kebab-case and camelCase)
        'data-position', 'data-pixel-position', 'data-positioning-mode', 'data-grid-position',
        'dataPosition', 'dataPixelPosition', 'dataPositioningMode', 'dataGridPosition',
        // Add new pure positioning attributes (old JSON format)
        'data-pure-positioning', 'dataPurePositioning',
        // Add new pure positioning attributes (human-readable individual attributes)
        'data-x', 'data-y', 'data-width', 'data-height', 'data-responsive', 'data-breakpoints',
        'dataX', 'dataY', 'dataWidth', 'dataHeight', 'dataResponsive', 'dataBreakpoints',
        // Add grid-specific attributes
        'data-grid-column', 'data-grid-row', 'data-grid-span',
        'dataGridColumn', 'dataGridRow', 'dataGridSpan',
        // Add size attributes for visual builder
        'data-component-size', 'dataComponentSize',
        // Add component ID for tracking
        'data-component-id', 'dataComponentId',

        // Component-specific props - CRTMonitor
        'screencolor', 'screenColor', 'phosphorglow', 'phosphorGlow',
        'scanlines', 'curvature',
        // Component-specific props - NeonSign (already covered by existing props)
        // Component-specific props - ArcadeButton
        'style3d', 'style3D', 'clickeffect', 'clickEffect', 'glowing', 'sound', 'href',
        // Component-specific props - PixelArtFrame
        'framecolor', 'frameColor', 'framewidth', 'frameWidth',
        'borderstyle', 'borderStyle', 'cornerstyle', 'cornerStyle',
        'shadoweffect', 'shadowEffect', 'gloweffect', 'glowEffect',
        'innerpadding', 'innerPadding', 'animated',
        // Component-specific props - RetroGrid
        'gridstyle', 'gridStyle', 'perspective', 'horizon', 'glow',
        // Component-specific props - VHSTape
        'year', 'genre', 'duration', 'tapecolor', 'tapeColor',
        'labelstyle', 'labelStyle', 'wear', 'showbarcode', 'showBarcode',
        // Component-specific props - CassetteTape
        'artist', 'album', 'side', 'showspokestorotate', 'showSpokesToRotate',
        // Component-specific props - RetroTV
        'screencolor', 'screenColor', 'tvstyle', 'tvStyle', 'channelnumber', 'channelNumber',
        'showstatic', 'showStatic', 'showscanlines', 'showScanlines', 'curvature',
        'brightness', 'contrast',
        // Component-specific props - Boombox
        'showequalizer', 'showEqualizer', 'showcassettedeck', 'showCassetteDeck',
        'showradio', 'showRadio', 'isplaying', 'isPlaying', 'currenttrack', 'currentTrack',
        'volume',
        // Component-specific props - MatrixRain
        'speed', 'density', 'characters', 'customcharacters', 'customCharacters',
        'fadeeffect', 'fadeEffect', 'gloweffect', 'glowEffect', 'backgroundopacity', 'backgroundOpacity',
        // Component-specific props - CustomHTMLElement
        'tagname', 'tagName', 'innerhtml', 'innerHTML', 'content'
      ];
      
      schema.attributes[tagName] = allAttributes;
      schema.attributes[lowerTagName] = allAttributes;
    }
  }
  
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

// Parse HTML to HAST (Hypertext Abstract Syntax Tree)
export function parseTemplate(htmlString: string): Root {

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
  const processor = unified()
    .use(rehypeParse, { fragment: true })
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

  // Check limits (increased to support complex showcase templates)
  if (nodeCount > 1500) {
    errors.push(`Too many nodes: ${nodeCount} (max: 1500)`);
  }

  if (maxDepth > 30) {
    errors.push(`Template too deeply nested: ${maxDepth} levels (max: 30)`);
  }

  if (totalComponents > 250) {
    errors.push(`Too many components: ${totalComponents} (max: 250)`);
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

    // Check final AST for positioning data (both old and new formats)
    const astString = JSON.stringify(ast);

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