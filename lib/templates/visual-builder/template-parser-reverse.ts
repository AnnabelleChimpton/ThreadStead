/**
 * VISUAL_BUILDER_PROGRESS: Template Parser Reverse
 * Phase 1: Visual Builder Foundation - Conversion Utilities
 *
 * Converts HTML template format back to canvas state for visual editing
 */

import type {
  CanvasState,
  CanvasComponent,
  ComponentPosition,
  ComponentSize,
  GridPosition,
  PositioningMode,
} from './types';
import { componentRegistry } from '@/lib/templates/core/template-registry';
import { generateComponentId } from './canvas-state';
import { DEFAULT_GRID_SYSTEM } from './constants';

export interface ParseOptions {
  /** Whether to preserve layout attributes from visual builder */
  preserveLayoutAttributes?: boolean;
  /** Whether to attempt position inference from DOM structure */
  inferPositions?: boolean;
  /** Default position for components without explicit positioning */
  defaultPosition?: ComponentPosition;
  /** Whether to validate components against registry */
  validateComponents?: boolean;
  /** Whether to ignore unknown components */
  ignoreUnknownComponents?: boolean;
}

export interface ParseResult {
  /** Parsed canvas state */
  canvasState: CanvasState;
  /** Any warnings or issues encountered */
  warnings: string[];
  /** Components that were ignored (unknown types) */
  ignoredComponents: string[];
  /** Total components parsed */
  componentCount: number;
}

/**
 * HTML template parser class
 */
export class TemplateParserReverse {
  private options: Required<ParseOptions>;
  private warnings: string[] = [];
  private ignoredComponents: string[] = [];
  private componentCount = 0;

  constructor(options: ParseOptions = {}) {
    this.options = {
      preserveLayoutAttributes: options.preserveLayoutAttributes ?? true,
      inferPositions: options.inferPositions ?? false,
      defaultPosition: options.defaultPosition ?? { x: 0, y: 0 },
      validateComponents: options.validateComponents ?? true,
      ignoreUnknownComponents: options.ignoreUnknownComponents ?? true,
    };
  }

  /**
   * Parse HTML template to canvas state
   */
  parseTemplate(htmlContent: string): ParseResult {
    this.warnings = [];
    this.ignoredComponents = [];
    this.componentCount = 0;

    // Clean and prepare HTML
    const cleanHtml = this.preprocessHTML(htmlContent);

    // Parse HTML into DOM
    const dom = this.createDOMFromHTML(cleanHtml);

    // Extract components from DOM
    const components = this.extractComponents(dom);

    // Create canvas state
    const canvasState: CanvasState = {
      components,
      selectedIds: [],
      hoveredId: null,
      dragState: null,
      viewport: {
        zoom: 1,
        scrollX: 0,
        scrollY: 0,
        width: 800,
        height: 600,
      },
      history: {
        past: [],
        present: {
          components,
          timestamp: Date.now(),
          description: 'Initial template load',
        },
        future: [],
        maxHistorySize: 50,
      },
      settings: {
        showGrid: true,
        showRulers: true,
        snapToGrid: true,
        showOutlines: false,
        gridSize: 20,
        responsive: 'desktop',
        gridSystem: DEFAULT_GRID_SYSTEM,
        positioningMode: 'grid', // Default to grid mode for parsed templates
      },
    };

    return {
      canvasState,
      warnings: [...this.warnings],
      ignoredComponents: [...this.ignoredComponents],
      componentCount: this.componentCount,
    };
  }

  /**
   * Preprocess HTML to handle special cases and separate CSS from content
   */
  private preprocessHTML(html: string): string {
    console.log('[TemplateParser] Original HTML length:', html.length);
    console.log('[TemplateParser] HTML preview:', html.substring(0, 300) + '...');

    // Remove comments unless they contain component metadata
    let processed = html.replace(/<!--(?!\s*Visual Builder)[\s\S]*?-->/g, '');

    // Extract and remove <style> tags - we only want the HTML structure for component parsing
    const styleMatches = processed.match(/<style[^>]*>[\s\S]*?<\/style>/gi);
    if (styleMatches) {
      console.log('[TemplateParser] Found', styleMatches.length, 'style tags, removing them for component parsing');
      processed = processed.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
    }

    // Normalize whitespace
    processed = processed.replace(/\s+/g, ' ').trim();

    // Handle self-closing tags that might not be properly closed
    processed = processed.replace(/<(\w+)([^>]*?)\s*\/\s*>/g, '<$1$2></$1>');

    console.log('[TemplateParser] Preprocessed HTML (CSS removed):', processed.substring(0, 200) + '...');
    return processed;
  }

  /**
   * Create DOM from HTML string
   */
  private createDOMFromHTML(html: string): Document {
    try {
      // Use DOMParser for proper HTML parsing
      const parser = new DOMParser();
      const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');

      // Check for parsing errors
      const parseError = doc.querySelector('parsererror');
      if (parseError) {
        this.warnings.push(`HTML parsing error: ${parseError.textContent}`);
      }

      return doc;
    } catch (error) {
      this.warnings.push(`Failed to parse HTML: ${error instanceof Error ? error.message : 'Unknown error'}`);

      // Fallback: create empty document
      const parser = new DOMParser();
      return parser.parseFromString('<div></div>', 'text/html');
    }
  }

  // HTML containers that should be traversed through, not treated as components
  private readonly HTML_CONTAINERS = new Set([
    'div', 'section', 'article', 'header', 'footer', 'main', 'nav', 'aside',
    'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li',
    'table', 'thead', 'tbody', 'tr', 'td', 'th', 'form', 'fieldset', 'legend'
  ]);

  /**
   * Extract components from DOM tree using recursive traversal
   */
  private extractComponents(dom: Document): CanvasComponent[] {
    const bodyDiv = dom.querySelector('body > div');
    if (!bodyDiv) {
      this.warnings.push('No content found in template');
      return [];
    }

    console.log('[TemplateParser] Starting recursive component extraction...');
    const components: CanvasComponent[] = [];

    // Recursively find all template components, ignoring HTML containers
    this.extractComponentsRecursively(bodyDiv, components);

    console.log('[TemplateParser] Found', components.length, 'components after recursive extraction');
    return components;
  }

  /**
   * Recursively extract template components from DOM tree
   */
  private extractComponentsRecursively(element: Element, components: CanvasComponent[]): void {
    const tagName = element.tagName;

    console.log('[TemplateParser] Examining element:', tagName);

    // Check if this is a template component (registered in component registry)
    const componentRegistration = componentRegistry.get(tagName);
    const isTemplateComponent = componentRegistration !== undefined;
    const isHTMLContainer = this.HTML_CONTAINERS.has(tagName.toLowerCase());

    console.log(`[TemplateParser] ${tagName} - isTemplateComponent: ${isTemplateComponent}, isHTMLContainer: ${isHTMLContainer}, registration:`, componentRegistration ? 'found' : 'NOT FOUND');

    if (isTemplateComponent) {
      console.log('[TemplateParser] Found template component:', tagName);

      const component = this.elementToComponent(element);
      if (component) {
        // Only apply logical positioning if component has no explicit positioning data
        const hasExplicitPositioning = component.gridPosition || component.position ||
                                     element.getAttribute('data-grid-position') ||
                                     element.getAttribute('data-grid-column') ||
                                     element.getAttribute('data-position');

        if (!hasExplicitPositioning) {
          // Calculate position based on document order and logical layout
          const documentOrder = components.length; // 0-based index in found components
          const logicalPosition = this.calculateLogicalPosition(tagName, documentOrder);

          component.gridPosition = logicalPosition.grid;
          component.position = logicalPosition.pixel;

          console.log('[TemplateParser] Assigned logical position to', tagName, '(no explicit positioning):', logicalPosition);
        } else {
          console.log('[TemplateParser] Preserving explicit positioning for', tagName, '- gridPosition:', component.gridPosition, 'position:', component.position);
        }

        components.push(component);
      }
    } else if (isHTMLContainer) {
      console.log('[TemplateParser] Traversing through HTML container:', tagName);
      // This is an HTML container - recursively examine its children
      Array.from(element.children).forEach(child => {
        this.extractComponentsRecursively(child, components);
      });
    } else {
      console.log('[TemplateParser] Skipping unknown element:', tagName);
      this.warnings.push(`Unknown element skipped: ${tagName}`);
    }
  }

  /**
   * Calculate logical position based on component type and document order
   */
  private calculateLogicalPosition(componentType: string, documentOrder: number): {
    grid: GridPosition;
    pixel: ComponentPosition;
  } {
    // Define logical layout patterns based on component types
    const isHeaderComponent = ['ProfilePhoto', 'DisplayName', 'Bio'].includes(componentType);
    const isContentComponent = ['Posts', 'BlogPosts', 'GuestBook', 'ContactCard'].includes(componentType);

    let row: number;
    let column: number;
    let span: number = 1;

    if (isHeaderComponent) {
      // Header components (ProfilePhoto, DisplayName, Bio) go in first rows, full width
      row = documentOrder + 1;
      column = 1;
      span = this.maxColumnsPerRow; // Full width for header components
    } else if (isContentComponent) {
      // Content components start after header components, can be side-by-side
      const headerComponentCount = documentOrder; // Approximate
      row = headerComponentCount + 4; // Leave some space after header
      column = 1 + ((documentOrder - headerComponentCount) % 2) * 8; // Side-by-side layout
      span = 8; // Half width for content components
    } else {
      // Default layout for other components
      row = documentOrder + 1;
      column = 1 + (documentOrder % 2) * 8;
      span = 8;
    }

    // Ensure we don't exceed grid bounds
    column = Math.max(1, Math.min(column, this.maxColumnsPerRow));
    span = Math.max(1, Math.min(span, this.maxColumnsPerRow - column + 1));

    const gridPosition: GridPosition = {
      column,
      row,
      columnSpan: span,
      rowSpan: 1
    };

    const pixelPosition: ComponentPosition = {
      x: (column - 1) * 60,
      y: (row - 1) * 60
    };

    return { grid: gridPosition, pixel: pixelPosition };
  }

  /**
   * Convert DOM element to canvas component
   */
  private elementToComponent(element: Element): CanvasComponent | null {
    const originalTagName = element.tagName;

    // Normalize tag name for component registry lookup
    // The registry has proper case (GradientBox), but HTML parsing might give us GRADIENTBOX
    let tagName = originalTagName;

    // Try to get the properly cased name from the registry
    const registration = componentRegistry.get(originalTagName);
    if (registration) {
      tagName = registration.name; // Use the properly cased name from registry
    }

    // Component validation is now done in extractComponentsRecursively
    // This method only gets called for verified template components

    this.componentCount++;

    // Enhanced debug logging
    console.log(`[TemplateParser] Processing component: ${tagName}`);

    // Extract attributes as props
    const props = this.extractProps(element);

    // Extract layout attributes if present
    const position = this.extractPosition(element);
    const gridPosition = this.extractGridPosition(element);
    const positioningMode = this.extractPositioningMode(element);
    const size = this.extractSize(element);
    const locked = this.extractBooleanAttribute(element, 'data-locked');
    const hidden = this.extractBooleanAttribute(element, 'data-hidden');

    console.log(`[TemplateParser] ${tagName} - Position: ${position ? `(${position.x}, ${position.y})` : 'none'}, Grid: ${gridPosition ? `col=${gridPosition.column} row=${gridPosition.row} span=${gridPosition.columnSpan}` : 'none'}, Mode: ${positioningMode || 'none'}`);

    // Process children
    const children: CanvasComponent[] = [];
    Array.from(element.children).forEach(childElement => {
      const childComponent = this.elementToComponent(childElement);
      if (childComponent) {
        children.push(childComponent);
      }
    });

    // Handle text content with special handling for text components
    const textContent = this.extractTextContent(element);
    if (textContent) {
      // For text components (TextElement, Heading, Paragraph), put text content in 'content' prop
      const isTextComponent = ['TextElement', 'Heading', 'Paragraph'].includes(tagName);
      if (isTextComponent) {
        props.content = textContent;
      } else {
        props.children = textContent;
      }
    }

    // Create component
    const component: CanvasComponent = {
      id: this.extractComponentId(element) || generateComponentId(),
      type: tagName,
      props,
    };

    // Add optional properties
    if (children.length > 0) {
      component.children = children;
    }

    // Handle positioning - check for explicit positioning data, otherwise use logical positions assigned by caller
    if (position || gridPosition || positioningMode) {
      // Component has explicit positioning data from visual builder
      if (position) {
        component.position = position;
      }
      if (gridPosition) {
        component.gridPosition = gridPosition;
      }
      if (positioningMode) {
        component.positioningMode = positioningMode;
      }
    } else {
      // No explicit positioning data - logical positions will be assigned by extractComponentsRecursively
      // Set default positioning mode
      component.positioningMode = 'grid';
    }

    if (size) {
      component.size = size;
    }
    if (locked) {
      component.locked = locked;
    }
    if (hidden) {
      component.hidden = hidden;
    }

    return component;
  }

  /**
   * Extract props from element attributes
   */
  private extractProps(element: Element): Record<string, unknown> {
    const props: Record<string, unknown> = {};

    Array.from(element.attributes).forEach(attr => {
      const { name, value } = attr;

      // Skip layout and meta attributes
      if (this.isLayoutAttribute(name) || this.isMetaAttribute(name)) {
        return;
      }

      // Convert attribute value to appropriate type
      props[name] = this.parseAttributeValue(value, name);
    });

    return props;
  }

  /**
   * Extract position from layout attributes
   */
  private extractPosition(element: Element): ComponentPosition | undefined {
    if (!this.options.preserveLayoutAttributes) {
      return this.options.inferPositions ? this.inferPosition(element) : undefined;
    }

    // First, try to extract from data-pure-positioning attribute (NEW FORMAT)
    const purePositioningAttr = element.getAttribute('data-pure-positioning');
    if (purePositioningAttr) {
      try {
        const pureData = JSON.parse(purePositioningAttr);
        console.log('[TemplateParser] Found data-pure-positioning:', pureData);
        if (pureData.x !== undefined && pureData.y !== undefined) {
          return { x: pureData.x, y: pureData.y };
        }
      } catch (error) {
        this.warnings.push(`Invalid pure positioning data: ${purePositioningAttr}`);
      }
    }

    // Second, try to extract from data-pixel-position attribute (OLD FORMAT)
    const pixelPositionAttr = element.getAttribute('data-pixel-position');
    if (pixelPositionAttr) {
      try {
        const pixelData = JSON.parse(pixelPositionAttr);
        console.log('[TemplateParser] Found data-pixel-position:', pixelData);
        if (pixelData.x !== undefined && pixelData.y !== undefined) {
          return { x: pixelData.x, y: pixelData.y };
        }
      } catch (error) {
        this.warnings.push(`Invalid pixel position data: ${pixelPositionAttr}`);
      }
    }

    // Second, try to extract from data-position attribute (comma-separated format)
    const positionAttr = element.getAttribute('data-position');
    if (positionAttr) {
      try {
        // Handle comma-separated format like "100,200"
        if (positionAttr.includes(',')) {
          const [xStr, yStr] = positionAttr.split(',');
          const x = parseFloat(xStr.trim());
          const y = parseFloat(yStr.trim());
          if (!isNaN(x) && !isNaN(y)) {
            return { x, y };
          }
        } else {
          // Try JSON format as fallback
          return JSON.parse(positionAttr) as ComponentPosition;
        }
      } catch (error) {
        this.warnings.push(`Invalid position data: ${positionAttr}`);
      }
    }

    // If no position attributes, try to extract from CSS styles
    const styleAttr = element.getAttribute('style');
    if (styleAttr) {
      const position = this.extractPositionFromCSS(styleAttr);
      if (position) {
        return position;
      }
    }

    return this.options.inferPositions ? this.inferPosition(element) : undefined;
  }

  /**
   * Extract position from CSS style attribute
   */
  private extractPositionFromCSS(styleText: string): ComponentPosition | undefined {
    // Parse CSS style string for position information
    const styles = this.parseStyleString(styleText);

    // Check if element is absolutely positioned
    if (styles.position === 'absolute') {
      const left = this.parseCSSValue(styles.left);
      const top = this.parseCSSValue(styles.top);

      if (left !== undefined && top !== undefined) {
        return { x: left, y: top };
      }
    }

    return undefined;
  }

  /**
   * Extract grid position from layout attributes
   */
  private extractGridPosition(element: Element): GridPosition | undefined {
    if (!this.options.preserveLayoutAttributes) {
      return undefined;
    }

    // First, try to extract from data-grid-position attribute (JSON format)
    const gridPositionAttr = element.getAttribute('data-grid-position');
    if (gridPositionAttr) {
      try {
        const gridData = JSON.parse(gridPositionAttr);
        return {
          column: gridData.column,
          row: gridData.row,
          columnSpan: gridData.span || gridData.columnSpan || 1,
          rowSpan: gridData.rowSpan || 1,
        };
      } catch (error) {
        this.warnings.push(`Invalid grid position data: ${gridPositionAttr}`);
      }
    }

    // Second, try to extract from individual grid attributes
    const gridColumn = element.getAttribute('data-grid-column');
    const gridRow = element.getAttribute('data-grid-row');
    const gridSpan = element.getAttribute('data-grid-span');

    if (gridColumn && gridRow) {
      return {
        column: parseInt(gridColumn, 10),
        row: parseInt(gridRow, 10),
        columnSpan: gridSpan ? parseInt(gridSpan, 10) : 1,
        rowSpan: 1,
      };
    }

    // If no grid attributes, try to extract from CSS Grid styles
    const styleAttr = element.getAttribute('style');
    if (styleAttr) {
      const gridPosition = this.extractGridPositionFromCSS(styleAttr);
      if (gridPosition) {
        return gridPosition;
      }
    }

    return undefined;
  }

  /**
   * Extract grid position from CSS style attribute
   */
  private extractGridPositionFromCSS(styleText: string): GridPosition | undefined {
    const styles = this.parseStyleString(styleText);

    // Parse grid-column and grid-row properties
    const gridColumn = styles['grid-column'];
    const gridRow = styles['grid-row'];

    if (gridColumn && gridRow) {
      try {
        // Parse "column / span columnSpan" format
        const columnMatch = gridColumn.match(/^(\d+)(?:\s*\/\s*span\s+(\d+))?$/);
        const rowMatch = gridRow.match(/^(\d+)(?:\s*\/\s*span\s+(\d+))?$/);

        if (columnMatch && rowMatch) {
          return {
            column: parseInt(columnMatch[1], 10),
            row: parseInt(rowMatch[1], 10),
            columnSpan: columnMatch[2] ? parseInt(columnMatch[2], 10) : 1,
            rowSpan: rowMatch[2] ? parseInt(rowMatch[2], 10) : 1,
          };
        }
      } catch (error) {
        this.warnings.push(`Failed to parse CSS Grid position: ${gridColumn}, ${gridRow}`);
      }
    }

    return undefined;
  }

  /**
   * Extract positioning mode from layout attributes
   */
  private extractPositioningMode(element: Element): PositioningMode | undefined {
    if (!this.options.preserveLayoutAttributes) {
      return undefined;
    }

    // Check for pure positioning format (NEW FORMAT) - indicates absolute positioning
    const purePositioningAttr = element.getAttribute('data-pure-positioning');
    if (purePositioningAttr) {
      console.log('[TemplateParser] Found data-pure-positioning, using absolute mode');
      return 'absolute';
    }

    // Check for explicit positioning mode data attribute (OLD FORMAT)
    const positioningModeAttr = element.getAttribute('data-positioning-mode');
    if (positioningModeAttr) {
      console.log('[TemplateParser] Found data-positioning-mode:', positioningModeAttr);
      return positioningModeAttr as PositioningMode;
    }

    // Infer from CSS styles
    const styleAttr = element.getAttribute('style');
    if (styleAttr) {
      const styles = this.parseStyleString(styleAttr);

      // Check for grid positioning
      if (styles['grid-column'] || styles['grid-row']) {
        return 'grid';
      }

      // Check for absolute positioning
      if (styles.position === 'absolute') {
        return 'absolute';
      }
    }

    return undefined;
  }

  /**
   * Parse CSS style string into key-value pairs
   */
  private parseStyleString(styleText: string): Record<string, string> {
    const styles: Record<string, string> = {};

    styleText.split(';').forEach(declaration => {
      const colonIndex = declaration.indexOf(':');
      if (colonIndex > 0) {
        const property = declaration.substring(0, colonIndex).trim();
        const value = declaration.substring(colonIndex + 1).trim();
        styles[property] = value;
      }
    });

    return styles;
  }

  /**
   * Parse CSS value to number (e.g., "123px" -> 123)
   */
  private parseCSSValue(value: string | undefined): number | undefined {
    if (!value) return undefined;

    // Remove 'px' suffix and parse as number
    const numericValue = value.replace(/px$/, '');
    const parsed = parseFloat(numericValue);

    return isNaN(parsed) ? undefined : parsed;
  }

  /**
   * Extract size from layout attributes
   */
  private extractSize(element: Element): ComponentSize | undefined {
    if (!this.options.preserveLayoutAttributes) {
      return undefined;
    }

    // First, try to extract size from data-pure-positioning attribute (NEW FORMAT)
    const purePositioningAttr = element.getAttribute('data-pure-positioning');
    if (purePositioningAttr) {
      try {
        const pureData = JSON.parse(purePositioningAttr);
        console.log('[TemplateParser] Extracting size from data-pure-positioning:', pureData);
        if (pureData.width !== undefined && pureData.height !== undefined) {
          return {
            width: pureData.width,
            height: pureData.height
            // Note: Pure positioning always uses pixels (no unit property needed)
          };
        }
      } catch (error) {
        this.warnings.push(`Invalid pure positioning data: ${purePositioningAttr}`);
      }
    }

    // Second, try to extract from data-size attribute (OLD FORMAT)
    const sizeAttr = element.getAttribute('data-size');
    if (sizeAttr) {
      try {
        console.log('[TemplateParser] Found data-size:', sizeAttr);
        return JSON.parse(sizeAttr) as ComponentSize;
      } catch (error) {
        this.warnings.push(`Invalid size data: ${sizeAttr}`);
      }
    }

    return undefined;
  }

  /**
   * Extract component ID from data attributes
   */
  private extractComponentId(element: Element): string | null {
    return element.getAttribute('data-component-id');
  }

  /**
   * Extract boolean attribute
   */
  private extractBooleanAttribute(element: Element, attrName: string): boolean {
    const value = element.getAttribute(attrName);
    return value === 'true' || value === attrName;
  }

  /**
   * Extract text content from element
   */
  private extractTextContent(element: Element): string | undefined {
    // Get direct text content (not from child elements)
    let textContent = '';

    for (const node of Array.from(element.childNodes)) {
      if (node.nodeType === Node.TEXT_NODE) {
        textContent += node.textContent || '';
      }
    }

    textContent = textContent.trim();
    return textContent || undefined;
  }

  // Track inferred grid positions to avoid overlaps
  private inferredRow = 1;
  private inferredColumn = 1;
  private maxColumnsPerRow = 16; // Default desktop breakpoint

  /**
   * Infer position from DOM structure with sequential grid layout
   */
  private inferPosition(element: Element): ComponentPosition {
    // Assign sequential grid positions for flow-layout components
    const position = {
      x: (this.inferredColumn - 1) * 60, // Approximate pixel position based on 60px grid
      y: (this.inferredRow - 1) * 60
    };

    // Move to next position for next component
    this.inferredColumn++;
    if (this.inferredColumn > this.maxColumnsPerRow) {
      this.inferredColumn = 1;
      this.inferredRow++;
    }

    return position;
  }

  /**
   * Infer grid position from DOM structure with sequential layout
   */
  private inferGridPosition(element: Element): GridPosition {
    const gridPosition = {
      column: this.inferredColumn,
      row: this.inferredRow,
      columnSpan: 1,
      rowSpan: 1
    };

    // Move to next position for next component
    this.inferredColumn++;
    if (this.inferredColumn > this.maxColumnsPerRow) {
      this.inferredColumn = 1;
      this.inferredRow++;
    }

    return gridPosition;
  }

  /**
   * Parse attribute value to appropriate type
   */
  private parseAttributeValue(value: string, attrName: string): unknown {
    // Boolean attributes
    if (value === attrName || value === 'true') {
      return true;
    }
    if (value === 'false') {
      return false;
    }

    // Number attributes
    if (/^\d+(\.\d+)?$/.test(value)) {
      return Number(value);
    }

    // JSON attributes (complex objects/arrays)
    if ((value.startsWith('{') && value.endsWith('}')) ||
        (value.startsWith('[') && value.endsWith(']'))) {
      try {
        return JSON.parse(value);
      } catch (error) {
        this.warnings.push(`Failed to parse JSON attribute ${attrName}: ${value}`);
        return value;
      }
    }

    // String attributes
    return value;
  }

  /**
   * Check if attribute is a layout attribute
   */
  private isLayoutAttribute(name: string): boolean {
    return name.startsWith('data-position') ||
           name.startsWith('data-grid-position') ||
           name === 'data-positioning-mode' ||
           name === 'data-grid-column' ||
           name === 'data-grid-row' ||
           name === 'data-grid-span' ||
           name.startsWith('data-size') ||
           name === 'data-locked' ||
           name === 'data-hidden' ||
           name === 'data-component-id';
  }

  /**
   * Check if attribute is a meta attribute
   */
  private isMetaAttribute(name: string): boolean {
    return name === 'data-component-id';
  }
}

/**
 * Convenience function to parse template HTML
 */
export function parseHTMLToCanvas(
  htmlContent: string,
  options?: ParseOptions
): ParseResult {
  const parser = new TemplateParserReverse(options);
  return parser.parseTemplate(htmlContent);
}

/**
 * Parse template HTML with strict validation
 */
export function parseTemplateStrict(htmlContent: string): ParseResult {
  return parseHTMLToCanvas(htmlContent, {
    preserveLayoutAttributes: true,
    inferPositions: false,
    validateComponents: true,
    ignoreUnknownComponents: false,
  });
}

/**
 * Parse template HTML with lenient settings
 */
export function parseTemplateLenient(htmlContent: string): ParseResult {
  return parseHTMLToCanvas(htmlContent, {
    preserveLayoutAttributes: true,
    inferPositions: true,
    validateComponents: true,
    ignoreUnknownComponents: true,
  });
}

/**
 * Parse existing template for visual editing
 */
export function parseExistingTemplate(htmlContent: string): ParseResult {
  return parseHTMLToCanvas(htmlContent, {
    preserveLayoutAttributes: true, // Parse both CSS styles and data attributes for positioning
    inferPositions: true,
    validateComponents: true,
    ignoreUnknownComponents: true,
  });
}

/**
 * Validate HTML before parsing
 */
export function validateTemplateHTML(htmlContent: string): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for basic HTML structure
  if (!htmlContent.trim()) {
    errors.push('Template is empty');
    return { isValid: false, errors, warnings };
  }

  // Check for balanced tags
  const openTags = (htmlContent.match(/<\w+/g) || []).length;
  const closeTags = (htmlContent.match(/<\/\w+>/g) || []).length;
  const selfClosingTags = (htmlContent.match(/<\w+[^>]*\/>/g) || []).length;

  if (openTags !== closeTags + selfClosingTags) {
    warnings.push('Potentially unbalanced HTML tags detected');
  }

  // Check for unknown components
  const componentTags = (htmlContent.match(/<(\w+)/g) || [])
    .map(match => match.substring(1))
    .filter(tag => !['div', 'span', 'p', 'a', 'img', 'br', 'hr'].includes(tag.toLowerCase()));

  componentTags.forEach(tag => {
    if (!componentRegistry.get(tag)) {
      warnings.push(`Unknown component type: ${tag}`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Get component info from HTML without full parsing
 */
export function analyzeTemplateHTML(htmlContent: string): {
  componentCount: number;
  componentTypes: string[];
  hasLayoutData: boolean;
  complexity: 'simple' | 'moderate' | 'complex';
} {
  const componentMatches = htmlContent.match(/<(\w+)/g) || [];
  const componentTypes = [...new Set(componentMatches.map(match => match.substring(1)))];
  const componentCount = componentMatches.length;
  const hasLayoutData = htmlContent.includes('data-position') ||
                        htmlContent.includes('data-grid-position') ||
                        htmlContent.includes('data-size') ||
                        htmlContent.includes('grid-column') ||
                        htmlContent.includes('grid-row');

  let complexity: 'simple' | 'moderate' | 'complex';
  if (componentCount <= 5) {
    complexity = 'simple';
  } else if (componentCount <= 15) {
    complexity = 'moderate';
  } else {
    complexity = 'complex';
  }

  return {
    componentCount,
    componentTypes,
    hasLayoutData,
    complexity,
  };
}