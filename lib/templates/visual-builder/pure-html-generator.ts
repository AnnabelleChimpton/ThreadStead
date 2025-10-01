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
   * Strip positioning CSS properties from a style string
   * Prevents accumulation of duplicate positioning on repeated saves
   */
  private stripPositioningFromStyleString(styleString: string): string {
    const declarations = styleString.split(';').map(d => d.trim()).filter(Boolean);
    const cleanedDeclarations = declarations.filter(declaration => {
      const property = declaration.split(':')[0]?.trim().toLowerCase();
      // Remove positioning-related properties
      return !['position', 'top', 'right', 'bottom', 'left', 'z-index'].includes(property);
    });
    return cleanedDeclarations.join('; ');
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

    // For top-level components, include positioning in props
    const props = this.generatePropsString(component, depth === 1 ? component.positioning : undefined);
    // CRITICAL FIX: Only add positioning attributes to top-level components (depth 1)
    // Nested components should use relative positioning within their parent containers
    const positioningAttr = depth === 1 ? this.generatePositioningAttribute(component.positioning) : '';
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
  private generatePropsString(component: AbsoluteComponent, positioning?: ComponentPositioning): string {
    const props = component.props || {};
    const propStrings: string[] = [];

    // Remove duplicate styling props (keep universal names, remove legacy duplicates)
    const deduplicatedProps = this.removeDuplicateStylingProps(props);

    // Generate positioning styles to merge with existing style prop
    let positioningStyles = '';
    if (positioning) {
      const styles: string[] = [];
      styles.push('position: absolute');

      // Type guard: check if it's SimpleAbsolutePosition (has x/y directly)
      if ('x' in positioning && positioning.x !== undefined) {
        styles.push(`left: ${positioning.x}px`);
      }
      if ('y' in positioning && positioning.y !== undefined) {
        styles.push(`top: ${positioning.y}px`);
      }

      // CRITICAL FIX: Do NOT include width/height in inline styles
      // They're already in component props and data attributes
      // Including them here creates duplicates: "width: 200px; width: 131.5px"
      // Width/height are preserved in data-width/data-height attributes for sizing info
      positioningStyles = styles.join('; ');
    }

    Object.entries(deduplicatedProps).forEach(([key, value]) => {
      if (value === undefined || value === null) return;

      // Skip special props that are handled separately
      if (key === 'children' || key.startsWith('_')) return;

      // Skip data-pure-positioning if it exists in props - it's handled by generatePositioningAttribute
      if (key === 'data-pure-positioning' || key === 'dataPurePositioning') {
        return;
      }

      // CRITICAL FIX: Skip positioning data attributes if they exist in props
      // They're generated by generatePositioningAttribute() - duplicates cause accumulation
      if (key === 'data-x' || key === 'dataX' ||
          key === 'data-y' || key === 'dataY' ||
          key === 'data-width' || key === 'dataWidth' ||
          key === 'data-height' || key === 'dataHeight' ||
          key === 'data-responsive' || key === 'dataResponsive' ||
          key === 'data-breakpoints' || key === 'dataBreakpoints') {
        return;
      }

      // CRITICAL: Skip positioning/sizing props when we're generating inline styles
      // These props are being included in the style attribute, so we don't want them as separate attributes
      if (positioning) {
        const positioningSizingProps = [
          'position', 'top', 'right', 'bottom', 'left', 'zIndex', 'zindex',
          'width', 'height', 'minWidth', 'minHeight', 'maxWidth', 'maxHeight',
          'minwidth', 'minheight', 'maxwidth', 'maxheight' // lowercase variants
        ];
        if (positioningSizingProps.includes(key)) {
          return; // Skip this prop - it's in the inline style
        }
      }

      // Special handling for style prop - merge with positioning styles
      if (key === 'style' && positioning) {
        let mergedStyles = positioningStyles;
        if (typeof value === 'string') {
          // CRITICAL FIX: Strip old positioning from existing style before merging
          // This prevents accumulation of duplicate positioning on repeated saves
          const cleanedExistingStyle = this.stripPositioningFromStyleString(value);
          mergedStyles = cleanedExistingStyle
            ? `${positioningStyles}; ${cleanedExistingStyle}`
            : positioningStyles;
        } else if (typeof value === 'object') {
          // Convert CSS object to string, excluding positioning properties
          const cssString = Object.entries(value as Record<string, any>)
            .filter(([k]) => !['position', 'top', 'right', 'bottom', 'left', 'zIndex'].includes(k))
            .map(([k, v]) => `${k.replace(/[A-Z]/g, m => '-' + m.toLowerCase())}: ${v}`)
            .join('; ');
          mergedStyles = cssString
            ? `${positioningStyles}; ${cssString}`
            : positioningStyles;
        }
        propStrings.push(`style="${this.escapeHtml(mergedStyles)}"`);
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

    // If we have positioning styles but no style prop was found, add it
    if (positioning && positioningStyles && !props.style) {
      propStrings.push(`style="${positioningStyles}"`);
    }

    return propStrings.length > 0 ? ' ' + propStrings.join(' ') : '';
  }

  /**
   * Remove duplicate styling props - keep universal names, remove legacy duplicates
   * This prevents both backgroundColor AND backgroundcolor from appearing in HTML
   */
  private removeDuplicateStylingProps(props: Record<string, any>): Record<string, any> {
    const originalKeys = Object.keys(props);
    const deduplicated = { ...props };

    // Universal to legacy mappings - if both exist, keep universal and remove legacy
    const duplicateMappings: Record<string, string> = {
      'backgroundColor': 'backgroundcolor',
      'textColor': 'textcolor',  // Fixed: was 'color' (wrong), should be 'textcolor' (lowercase variant)
      'borderColor': 'bordercolor',
      'fontSize': 'fontsize',
      'fontWeight': 'fontweight',
      'textAlign': 'textalign',
      'borderRadius': 'borderradius',
      // Component-specific props - CRTMonitor
      'screenColor': 'screencolor',
      'phosphorGlow': 'phosphorglow',
      // Component-specific props - ArcadeButton
      'style3D': 'style3d',
      'clickEffect': 'clickeffect',
      // Component-specific props - PixelArtFrame
      'frameColor': 'framecolor',
      'frameWidth': 'framewidth',
      'borderStyle': 'borderstyle',
      'cornerStyle': 'cornerstyle',
      'shadowEffect': 'shadoweffect',
      'glowEffect': 'gloweffect',
      'innerPadding': 'innerpadding',
      // Component-specific props - RetroGrid
      'gridStyle': 'gridstyle',
      // Component-specific props - VHSTape
      'tapeColor': 'tapecolor',
      'labelStyle': 'labelstyle',
      'showBarcode': 'showbarcode',
      // Component-specific props - CassetteTape
      'showSpokesToRotate': 'showspokestorotate',
      // Component-specific props - RetroTV
      'tvStyle': 'tvstyle',
      'channelNumber': 'channelnumber',
      'showStatic': 'showstatic',
      'showScanlines': 'showscanlines',
      // Component-specific props - Boombox
      'showEqualizer': 'showequalizer',
      'showCassetteDeck': 'showcassettedeck',
      'showRadio': 'showradio',
      'isPlaying': 'isplaying',
      'currentTrack': 'currenttrack',
      // Component-specific props - MatrixRain
      'customCharacters': 'customcharacters',
      'fadeEffect': 'fadeeffect',
      'backgroundOpacity': 'backgroundopacity',
      // Component-specific props - CustomHTMLElement
      'tagName': 'tagname',
      'innerHTML': 'innerhtml'
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
   * Generate positioning data attributes (human-readable format)
   * NEW FORMAT: Individual attributes instead of escaped JSON
   */
  private generatePositioningAttribute(positioning: ComponentPositioning): string {
    const attrs: string[] = [];

    // Core positioning attributes (only if SimpleAbsolutePosition)
    if ('x' in positioning && positioning.x !== undefined) {
      attrs.push(`data-x="${positioning.x}"`);
    }
    if ('y' in positioning && positioning.y !== undefined) {
      attrs.push(`data-y="${positioning.y}"`);
    }
    if ('width' in positioning && positioning.width !== undefined) {
      attrs.push(`data-width="${positioning.width}"`);
    }
    if ('height' in positioning && positioning.height !== undefined) {
      attrs.push(`data-height="${positioning.height}"`);
    }

    // Responsive flag
    if ('isResponsive' in positioning && positioning.isResponsive !== undefined) {
      attrs.push(`data-responsive="${positioning.isResponsive}"`);
    }

    // For responsive positioning with breakpoints, keep as JSON (but only for complex data)
    if ('breakpoints' in positioning && positioning.breakpoints) {
      try {
        attrs.push(`data-breakpoints='${this.escapeHtml(JSON.stringify(positioning.breakpoints))}'`);
      } catch (error) {
        this.warnings.push('Failed to serialize breakpoints data');
      }
    }

    return attrs.length > 0 ? ' ' + attrs.join(' ') : '';
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