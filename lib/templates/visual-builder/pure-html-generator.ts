/**
 * Pure Absolute Positioning HTML Generator
 *
 * Generates clean HTML with pure absolute positioning data only.
 * No grid system complexity, no legacy formats.
 */

import {
  AbsoluteComponent,
  AbsoluteCanvasState,
  ComponentPositioning,
  AbsolutePositioningUtils
} from './pure-positioning';

export interface PureHtmlGeneratorOptions {
  containerClass?: string;
  includeMetadata?: boolean;
  prettyPrint?: boolean;
}

export class PureHtmlGenerator {
  private options: Required<PureHtmlGeneratorOptions>;
  private warnings: string[] = [];

  constructor(options: PureHtmlGeneratorOptions = {}) {
    this.options = {
      containerClass: options.containerClass || 'pure-absolute-container',
      includeMetadata: options.includeMetadata ?? true,
      prettyPrint: options.prettyPrint ?? true
    };
  }

  /**
   * Generate HTML from absolute canvas state
   */
  generateHTML(canvasState: AbsoluteCanvasState): { html: string; warnings: string[] } {
    this.warnings = [];

    const { container, components } = canvasState;

    // Generate container styles
    const containerStyles = [
      'position: relative',
      `width: ${container.width}px`,
      `min-height: ${container.minHeight}px`,
      `padding: ${container.padding}px`,
      'box-sizing: border-box'
    ];

    if (container.backgroundColor) {
      containerStyles.push(`background-color: ${container.backgroundColor}`);
    }

    if (container.backgroundImage) {
      containerStyles.push(`background-image: ${container.backgroundImage}`);
    }

    const containerStyle = containerStyles.join('; ');

    // Generate component HTML
    const componentsHTML = components.map(component =>
      this.generateComponentHTML(component)
    ).join('\n');

    // Combine into final HTML
    const html = this.options.prettyPrint
      ? this.formatHTML(`<div class="${this.options.containerClass}" style="${containerStyle}">\n${componentsHTML}\n</div>`)
      : `<div class="${this.options.containerClass}" style="${containerStyle}">${componentsHTML}</div>`;

    return {
      html,
      warnings: this.warnings
    };
  }

  /**
   * Generate HTML for a single component
   */
  private generateComponentHTML(component: AbsoluteComponent, depth: number = 1): string {
    const indent = this.options.prettyPrint ? '  '.repeat(depth) : '';

    const props = this.generatePropsString(component);
    const positioningAttr = this.generatePositioningAttribute(component.positioning);
    const metadataAttrs = this.generateMetadataAttributes(component);

    // Generate children HTML
    const childrenHTML = component.children?.map(child =>
      this.generateComponentHTML(child, depth + 1)
    ).join('\n') || '';

    // Check if component has text content
    const textContent = this.getTextContent(component);

    if (childrenHTML || textContent) {
      // Component with children or text content
      const openTag = `<${component.type}${props}${positioningAttr}${metadataAttrs}>`;
      const content = textContent || childrenHTML;
      const closeTag = `</${component.type}>`;

      if (this.options.prettyPrint && childrenHTML) {
        return `${indent}${openTag}\n${content}\n${indent}${closeTag}`;
      } else {
        return `${indent}${openTag}${content}${closeTag}`;
      }
    } else {
      // Self-closing component
      return `${indent}<${component.type}${props}${positioningAttr}${metadataAttrs} />`;
    }
  }

  /**
   * Generate props string from component props
   */
  private generatePropsString(component: AbsoluteComponent): string {
    const props = component.props || {};
    const propStrings: string[] = [];

    // Remove duplicate styling props (keep universal names, remove legacy duplicates)
    const deduplicatedProps = this.removeDuplicateStylingProps(props);

    Object.entries(deduplicatedProps).forEach(([key, value]) => {
      if (value === undefined || value === null) return;

      // Skip special props that are handled separately
      if (key === 'children' || key.startsWith('_')) return;

      // Skip data-pure-positioning if it exists in props - it's handled by generatePositioningAttribute
      if (key === 'data-pure-positioning' || key === 'dataPurePositioning') {
        return;
      }

      if (typeof value === 'boolean') {
        if (value) propStrings.push(key);
      } else if (typeof value === 'string') {
        propStrings.push(`${key}="${this.escapeHtml(value)}"`);
      } else if (typeof value === 'number') {
        propStrings.push(`${key}="${value}"`);
      } else {
        // Complex objects - serialize as JSON
        try {
          propStrings.push(`${key}='${this.escapeHtml(JSON.stringify(value))}'`);
        } catch (error) {
          this.warnings.push(`Failed to serialize prop ${key} for component ${component.type}`);
        }
      }
    });

    return propStrings.length > 0 ? ' ' + propStrings.join(' ') : '';
  }

  /**
   * Remove duplicate styling props - keep universal names, remove legacy duplicates
   * This prevents both backgroundColor AND backgroundcolor from appearing in HTML
   */
  private removeDuplicateStylingProps(props: Record<string, any>): Record<string, any> {
    const deduplicated = { ...props };

    // Universal to legacy mappings - if both exist, keep universal and remove legacy
    const duplicateMappings: Record<string, string> = {
      'backgroundColor': 'backgroundcolor',
      'textColor': 'color',
      'borderColor': 'bordercolor',
      'fontSize': 'fontsize',
      'fontWeight': 'fontweight',
      'textAlign': 'textalign',
      'borderRadius': 'borderradius'
    };

    // Remove legacy props when universal equivalent exists
    Object.entries(duplicateMappings).forEach(([universalProp, legacyProp]) => {
      if (deduplicated[universalProp] !== undefined && deduplicated[legacyProp] !== undefined) {
        // Both exist - remove the legacy version
        delete deduplicated[legacyProp];
      }
    });

    return deduplicated;
  }

  /**
   * Generate positioning data attribute
   */
  private generatePositioningAttribute(positioning: ComponentPositioning): string {
    try {
      const positioningJson = JSON.stringify(positioning);
      return ` data-pure-positioning='${this.escapeHtml(positioningJson)}'`;
    } catch (error) {
      this.warnings.push('Failed to serialize positioning data');
      return '';
    }
  }

  /**
   * Generate metadata attributes
   */
  private generateMetadataAttributes(component: AbsoluteComponent): string {
    if (!this.options.includeMetadata) return '';

    const attrs: string[] = [];

    attrs.push(`data-component-id="${component.id}"`);

    if (component.locked) {
      attrs.push('data-locked="true"');
    }

    if (component.hidden) {
      attrs.push('data-hidden="true"');
    }

    if (component.name) {
      attrs.push(`data-component-name="${this.escapeHtml(component.name)}"`);
    }

    return attrs.length > 0 ? ' ' + attrs.join(' ') : '';
  }

  /**
   * Extract text content from component (for text components)
   */
  private getTextContent(component: AbsoluteComponent): string {
    const textComponents = ['TextElement', 'Heading', 'Paragraph'];
    if (textComponents.includes(component.type) && component.props.content) {
      return this.escapeHtml(String(component.props.content));
    }
    return '';
  }

  /**
   * Format HTML with proper indentation
   */
  private formatHTML(html: string): string {
    if (!this.options.prettyPrint) return html;

    // Simple HTML formatting
    return html
      .replace(/></g, '>\n<')
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join('\n');
  }

  /**
   * Escape HTML entities
   */
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Get warnings from generation process
   */
  getWarnings(): string[] {
    return [...this.warnings];
  }
}

/**
 * Convenience function to generate HTML from canvas state
 */
export function generatePureHTML(
  canvasState: AbsoluteCanvasState,
  options?: PureHtmlGeneratorOptions
): { html: string; warnings: string[] } {
  const generator = new PureHtmlGenerator(options);
  return generator.generateHTML(canvasState);
}

/**
 * Generate CSS for responsive positioning
 */
export function generateResponsiveCSS(components: AbsoluteComponent[]): string {
  const cssRules: string[] = [];

  components.forEach(component => {
    if ('isResponsive' in component.positioning && component.positioning.isResponsive === false) {
      // Simple absolute positioning - no responsive CSS needed
    } else {
      // Responsive positioning
      const selector = `[data-component-id="${component.id}"]`;
      const responsiveCSS = AbsolutePositioningUtils.generateResponsiveCSS(
        component.positioning as any, // Type assertion for responsive positioning
        selector
      );
      cssRules.push(responsiveCSS);
    }

    // Process children recursively
    if (component.children) {
      cssRules.push(generateResponsiveCSS(component.children));
    }
  });

  return cssRules.join('\n\n');
}