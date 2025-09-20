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
   * Preprocess HTML to handle special cases
   */
  private preprocessHTML(html: string): string {
    // Remove comments unless they contain component metadata
    let processed = html.replace(/<!--(?!\s*Visual Builder)[\s\S]*?-->/g, '');

    // Normalize whitespace
    processed = processed.replace(/\s+/g, ' ').trim();

    // Handle self-closing tags that might not be properly closed
    processed = processed.replace(/<(\w+)([^>]*?)\s*\/\s*>/g, '<$1$2></$1>');

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

  /**
   * Extract components from DOM tree
   */
  private extractComponents(dom: Document): CanvasComponent[] {
    const bodyDiv = dom.querySelector('body > div');
    if (!bodyDiv) {
      this.warnings.push('No content found in template');
      return [];
    }

    const components: CanvasComponent[] = [];

    // Process each child element as a potential component
    Array.from(bodyDiv.children).forEach(element => {
      const component = this.elementToComponent(element as Element);
      if (component) {
        components.push(component);
      }
    });

    return components;
  }

  /**
   * Convert DOM element to canvas component
   */
  private elementToComponent(element: Element): CanvasComponent | null {
    const tagName = element.tagName.toLowerCase();

    // Check if this is a registered component
    if (this.options.validateComponents) {
      const registration = componentRegistry.get(tagName);
      if (!registration) {
        if (this.options.ignoreUnknownComponents) {
          this.ignoredComponents.push(tagName);
          this.warnings.push(`Unknown component type ignored: ${tagName}`);
          return null;
        } else {
          this.warnings.push(`Unknown component type: ${tagName}`);
        }
      }
    }

    this.componentCount++;

    // Extract attributes as props
    const props = this.extractProps(element);

    // Extract layout attributes if present
    const position = this.extractPosition(element);
    const gridPosition = this.extractGridPosition(element);
    const positioningMode = this.extractPositioningMode(element);
    const size = this.extractSize(element);
    const locked = this.extractBooleanAttribute(element, 'data-locked');
    const hidden = this.extractBooleanAttribute(element, 'data-hidden');

    // Process children
    const children: CanvasComponent[] = [];
    Array.from(element.children).forEach(childElement => {
      const childComponent = this.elementToComponent(childElement);
      if (childComponent) {
        children.push(childComponent);
      }
    });

    // Handle text content
    const textContent = this.extractTextContent(element);
    if (textContent) {
      props.children = textContent;
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
    if (position) {
      component.position = position;
    }
    if (gridPosition) {
      component.gridPosition = gridPosition;
    }
    if (positioningMode) {
      component.positioningMode = positioningMode;
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

    // First, try to extract from data-position attribute
    const positionAttr = element.getAttribute('data-position');
    if (positionAttr) {
      try {
        return JSON.parse(positionAttr) as ComponentPosition;
      } catch (error) {
        this.warnings.push(`Invalid position data: ${positionAttr}`);
      }
    }

    // If no data-position, try to extract from CSS styles
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

    // First, try to extract from data-grid-position attribute
    const gridPositionAttr = element.getAttribute('data-grid-position');
    if (gridPositionAttr) {
      try {
        return JSON.parse(gridPositionAttr) as GridPosition;
      } catch (error) {
        this.warnings.push(`Invalid grid position data: ${gridPositionAttr}`);
      }
    }

    // If no data-grid-position, try to extract from CSS Grid styles
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

    // Check for explicit positioning mode data attribute
    const positioningModeAttr = element.getAttribute('data-positioning-mode');
    if (positioningModeAttr) {
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

    const sizeAttr = element.getAttribute('data-size');
    if (sizeAttr) {
      try {
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

  /**
   * Infer position from DOM structure (basic implementation)
   */
  private inferPosition(element: Element): ComponentPosition {
    // This is a simple implementation - in a more sophisticated version,
    // we could analyze CSS styles, parent container types, etc.
    return { ...this.options.defaultPosition };
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
           name.startsWith('data-size') ||
           name === 'data-locked' ||
           name === 'data-hidden';
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