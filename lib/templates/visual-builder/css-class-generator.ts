/**
 * CSS Class Generator
 * Converts global settings to clean CSS classes for external use
 */

import type { GlobalSettings, BackgroundPattern } from '@/components/features/templates/visual-builder/GlobalSettingsPanel';
import { generatePatternCSS } from './background-patterns';

export interface CSSClassDefinition {
  selector: string;
  properties: Record<string, string>;
}

export interface GeneratedCSS {
  classes: CSSClassDefinition[];
  css: string;
  classNames: string[];
}

/**
 * CSS Class Generator for Global Settings
 */
export class CSSClassGenerator {
  private classDefinitions: CSSClassDefinition[] = [];

  /**
   * Generate CSS classes for a complete global settings configuration
   */
  generateGlobalCSS(globalSettings: GlobalSettings): GeneratedCSS {
    this.classDefinitions = [];

    // Generate :root custom properties for easy CSS editing
    const rootProperties = this.generateRootProperties(globalSettings);
    // Only add :root if it has properties to avoid empty rules
    if (Object.keys(rootProperties.properties).length > 0) {
      this.classDefinitions.push(rootProperties);
    }

    // Generate theme classes
    const themeClasses = this.generateThemeClasses(globalSettings);
    this.classDefinitions.push(...themeClasses);

    // Generate pattern classes
    if (globalSettings.background?.pattern && globalSettings.background.pattern.type !== 'none') {
      const patternClasses = this.generatePatternClasses(globalSettings.background.pattern);
      this.classDefinitions.push(...patternClasses);
    }

    // Generate effect classes
    if (globalSettings.effects) {
      const effectClasses = this.generateEffectClasses(globalSettings.effects);
      this.classDefinitions.push(...effectClasses);
    }

    // Generate the CSS string and class names
    const css = this.generateCSSString();
    const classNames = this.extractClassNames(globalSettings);

    return {
      classes: this.classDefinitions,
      css,
      classNames
    };
  }

  /**
   * Generate :root CSS custom properties for easy editing
   */
  private generateRootProperties(globalSettings: GlobalSettings): CSSClassDefinition {
    const properties: Record<string, string> = {};

    // Background properties
    if (globalSettings.background?.color) {
      properties['--vb-bg-color'] = globalSettings.background.color;
    }
    if (globalSettings.background?.type) {
      properties['--vb-bg-type'] = globalSettings.background.type;
    }

    // Pattern properties
    if (globalSettings.background?.pattern && globalSettings.background.pattern.type !== 'none') {
      const pattern = globalSettings.background.pattern;
      properties['--vb-pattern-type'] = pattern.type;
      properties['--vb-pattern-primary'] = pattern.primaryColor;
      properties['--vb-pattern-size'] = pattern.size.toString();
      properties['--vb-pattern-opacity'] = pattern.opacity.toString();
      if (pattern.secondaryColor) {
        properties['--vb-pattern-secondary'] = pattern.secondaryColor;
      }
      if (pattern.animated) {
        properties['--vb-pattern-animated'] = 'true';
      }
      if (pattern.rotation) {
        properties['--vb-pattern-rotation'] = pattern.rotation.toString();
      }
    }

    // Typography properties
    if (globalSettings.typography?.fontFamily) {
      properties['--vb-font-family'] = globalSettings.typography.fontFamily;
    }
    if (globalSettings.typography?.baseSize) {
      properties['--vb-base-size'] = globalSettings.typography.baseSize;
    }
    if (globalSettings.typography?.scale) {
      properties['--vb-typography-scale'] = globalSettings.typography.scale.toString();
    }

    // Spacing properties
    if (globalSettings.spacing?.containerPadding) {
      properties['--vb-container-padding'] = globalSettings.spacing.containerPadding;
    }
    if (globalSettings.spacing?.sectionSpacing) {
      properties['--vb-section-spacing'] = globalSettings.spacing.sectionSpacing;
    }

    // Theme
    if (globalSettings.theme) {
      properties['--vb-theme'] = globalSettings.theme;
    }

    // Effects
    if (globalSettings.effects?.borderRadius) {
      properties['--vb-border-radius'] = globalSettings.effects.borderRadius;
    }
    if (globalSettings.effects?.boxShadow) {
      properties['--vb-box-shadow'] = globalSettings.effects.boxShadow;
    }
    if (globalSettings.effects?.blur) {
      properties['--vb-blur'] = globalSettings.effects.blur.toString();
    }
    if (globalSettings.effects?.animation) {
      properties['--vb-animation'] = globalSettings.effects.animation;
    }

    return {
      selector: ':root',
      properties
    };
  }

  /**
   * Generate theme-specific CSS classes
   */
  private generateThemeClasses(globalSettings: GlobalSettings): CSSClassDefinition[] {
    const classes: CSSClassDefinition[] = [];

    // Base theme class
    const themeClass = `vb-theme-${globalSettings.theme}`;
    const themeProperties: Record<string, string> = {};

    // Background color - use CSS custom property with fallback
    if (globalSettings.background?.color) {
      themeProperties['background-color'] = `var(--vb-bg-color, ${globalSettings.background.color})`;
    }

    // Typography - use CSS custom properties with fallbacks
    if (globalSettings.typography?.fontFamily) {
      themeProperties['font-family'] = `var(--vb-font-family, ${globalSettings.typography.fontFamily})`;
    }
    if (globalSettings.typography?.baseSize) {
      themeProperties['font-size'] = `var(--vb-base-size, ${globalSettings.typography.baseSize})`;
    }
    if (globalSettings.typography?.textShadow) {
      themeProperties['text-shadow'] = globalSettings.typography.textShadow;
    }
    if (globalSettings.typography?.letterSpacing) {
      themeProperties['letter-spacing'] = globalSettings.typography.letterSpacing;
    }

    // Spacing - use CSS custom properties with fallbacks
    if (globalSettings.spacing?.containerPadding) {
      themeProperties['padding'] = `var(--vb-container-padding, ${globalSettings.spacing.containerPadding})`;
    }

    classes.push({
      selector: `.${themeClass}`,
      properties: themeProperties
    });

    // Typography scale CSS custom properties
    if (globalSettings.typography?.scale) {
      classes.push({
        selector: `.${themeClass}`,
        properties: {
          '--vb-typography-scale': globalSettings.typography.scale.toString()
        }
      });
    }

    return classes;
  }

  /**
   * Generate pattern-specific CSS classes
   */
  private generatePatternClasses(pattern: BackgroundPattern): CSSClassDefinition[] {
    const classes: CSSClassDefinition[] = [];
    const patternClass = `vb-pattern-${pattern.type}`;

    // Generate the pattern background
    const patternCSS = generatePatternCSS(pattern);
    if (patternCSS) {
      const properties: Record<string, string> = {
        'background-image': patternCSS,
        'background-repeat': 'repeat',
        'background-size': `${(pattern.size || 1) * 40}px ${(pattern.size || 1) * 40}px`,
        // Store pattern configuration as CSS custom properties for parsing back
        '--vb-pattern-primary-color': pattern.primaryColor,
        '--vb-pattern-size': pattern.size.toString(),
        '--vb-pattern-opacity': pattern.opacity.toString()
      };

      // Add secondary color if specified
      if (pattern.secondaryColor) {
        properties['--vb-pattern-secondary-color'] = pattern.secondaryColor;
      }

      // Add rotation if specified
      if (pattern.rotation) {
        properties['transform'] = `rotate(${pattern.rotation}deg)`;
        properties['--vb-pattern-rotation'] = pattern.rotation.toString();
      }

      classes.push({
        selector: `.${patternClass}`,
        properties
      });

      // Add animation if enabled
      if (pattern.animated) {
        const animationClass = `vb-pattern-${pattern.type}-animated`;
        const animationCSS = this.generatePatternAnimation(pattern);

        classes.push({
          selector: `.${animationClass}`,
          properties: {
            'animation': animationCSS
          }
        });

        // Add keyframes
        const keyframes = this.generatePatternKeyframes(pattern);
        if (keyframes) {
          classes.push(keyframes);
        }
      }
    }

    return classes;
  }

  /**
   * Generate effect-specific CSS classes
   */
  private generateEffectClasses(effects: GlobalSettings['effects']): CSSClassDefinition[] {
    const classes: CSSClassDefinition[] = [];

    if (effects?.borderRadius) {
      classes.push({
        selector: '.vb-effect-rounded',
        properties: {
          'border-radius': effects.borderRadius
        }
      });
    }

    if (effects?.boxShadow) {
      classes.push({
        selector: '.vb-effect-shadow',
        properties: {
          'box-shadow': effects.boxShadow
        }
      });
    }

    if (effects?.blur) {
      classes.push({
        selector: '.vb-effect-blur',
        properties: {
          'filter': `blur(${effects.blur}px)`
        }
      });
    }

    if (effects?.animation) {
      const animationProperties = this.getAnimationProperties(effects.animation);
      if (animationProperties) {
        classes.push({
          selector: `.vb-effect-${effects.animation}`,
          properties: animationProperties
        });
      }
    }

    return classes;
  }

  /**
   * Generate CSS animation for patterns
   */
  private generatePatternAnimation(pattern: BackgroundPattern): string {
    switch (pattern.type) {
      case 'stars':
      case 'sparkles':
        return 'vb-twinkle 3s ease-in-out infinite';
      case 'bubbles':
        return 'vb-float 4s ease-in-out infinite';
      case 'grid':
        return 'vb-pulse 2s ease-in-out infinite';
      case 'confetti':
        return 'vb-dance 5s ease-in-out infinite';
      default:
        return 'vb-gentle-move 6s ease-in-out infinite';
    }
  }

  /**
   * Generate CSS keyframes for pattern animations
   */
  private generatePatternKeyframes(pattern: BackgroundPattern): CSSClassDefinition | null {
    const keyframeName = this.getKeyframeName(pattern.type);
    if (!keyframeName) return null;

    let keyframeProperties: Record<string, string> = {};

    switch (pattern.type) {
      case 'stars':
      case 'sparkles':
        keyframeProperties = {
          '0%, 100%': `opacity: ${pattern.opacity}`,
          '50%': `opacity: ${pattern.opacity * 0.3}`
        };
        break;
      case 'bubbles':
        keyframeProperties = {
          '0%, 100%': 'transform: translateY(0)',
          '50%': 'transform: translateY(-10px)'
        };
        break;
      case 'grid':
        keyframeProperties = {
          '0%, 100%': `opacity: ${pattern.opacity}`,
          '50%': `opacity: ${pattern.opacity * 1.5}`
        };
        break;
      case 'confetti':
        keyframeProperties = {
          '0%, 100%': 'transform: rotate(0deg) scale(1)',
          '25%': 'transform: rotate(5deg) scale(1.1)',
          '50%': 'transform: rotate(-5deg) scale(0.9)',
          '75%': 'transform: rotate(3deg) scale(1.05)'
        };
        break;
      default:
        keyframeProperties = {
          '0%, 100%': 'transform: translateX(0)',
          '50%': 'transform: translateX(2px)'
        };
    }

    return {
      selector: `@keyframes ${keyframeName}`,
      properties: keyframeProperties
    };
  }

  /**
   * Get keyframe name for pattern type
   */
  private getKeyframeName(patternType: string): string | null {
    const keyframeMap: Record<string, string> = {
      'stars': 'vb-twinkle',
      'sparkles': 'vb-twinkle',
      'bubbles': 'vb-float',
      'grid': 'vb-pulse',
      'confetti': 'vb-dance'
    };

    return keyframeMap[patternType] || 'vb-gentle-move';
  }

  /**
   * Get animation properties for global effects
   */
  private getAnimationProperties(animation: string): Record<string, string> | null {
    switch (animation) {
      case 'fade':
        return {
          'animation': 'vb-fade-in 1s ease-in-out',
          'opacity': '0'
        };
      case 'slide':
        return {
          'animation': 'vb-slide-in 0.8s ease-out',
          'transform': 'translateX(-20px)'
        };
      case 'zoom':
        return {
          'animation': 'vb-zoom-in 0.6s ease-out',
          'transform': 'scale(0.95)'
        };
      default:
        return null;
    }
  }

  /**
   * Extract class names that should be applied to the container
   */
  private extractClassNames(globalSettings: GlobalSettings): string[] {
    const classNames: string[] = [];

    // Theme class
    classNames.push(`vb-theme-${globalSettings.theme}`);

    // Pattern class
    if (globalSettings.background?.pattern && globalSettings.background.pattern.type !== 'none') {
      classNames.push(`vb-pattern-${globalSettings.background.pattern.type}`);
      if (globalSettings.background.pattern.animated) {
        classNames.push(`vb-pattern-${globalSettings.background.pattern.type}-animated`);
      }
    }

    // Effect classes
    if (globalSettings.effects) {
      if (globalSettings.effects.borderRadius) {
        classNames.push('vb-effect-rounded');
      }
      if (globalSettings.effects.boxShadow) {
        classNames.push('vb-effect-shadow');
      }
      if (globalSettings.effects.blur) {
        classNames.push('vb-effect-blur');
      }
      if (globalSettings.effects.animation) {
        classNames.push(`vb-effect-${globalSettings.effects.animation}`);
      }
    }

    return classNames;
  }

  /**
   * Generate the complete CSS string
   */
  private generateCSSString(): string {
    const cssRules: string[] = [];

    // Add header comment
    cssRules.push('/* Visual Builder Generated CSS */');
    cssRules.push('/* CSS Custom Properties for easy editing */');
    cssRules.push('/* CSS Classes for styling */');
    cssRules.push('');

    // Generate CSS rules
    for (const classDef of this.classDefinitions) {
      const properties = Object.entries(classDef.properties)
        .map(([prop, value]) => `  ${prop}: ${value};`)
        .join('\n');

      if (properties) {
        cssRules.push(`${classDef.selector} {`);
        cssRules.push(properties);
        cssRules.push('}');
        cssRules.push('');
      }
    }

    return cssRules.join('\n');
  }
}

/**
 * Convenience function to generate CSS from global settings
 */
export function generateCSSFromGlobalSettings(globalSettings: GlobalSettings): GeneratedCSS {
  const generator = new CSSClassGenerator();
  return generator.generateGlobalCSS(globalSettings);
}

/**
 * Parse CSS class names to extract global settings information
 */
export function parseGlobalSettingsFromClasses(classNames: string): Partial<GlobalSettings> {
  const classes = classNames.split(' ');
  const settings: Partial<GlobalSettings> = {
    background: {
      color: '#ffffff',
      type: 'solid'
    },
    typography: {
      fontFamily: 'Inter, sans-serif',
      baseSize: '16px',
      scale: 1.2
    },
    spacing: {
      containerPadding: '24px',
      sectionSpacing: '32px'
    },
    effects: {}
  };

  for (const className of classes) {
    // Parse theme
    const themeMatch = className.match(/^vb-theme-(.+)$/);
    if (themeMatch) {
      settings.theme = themeMatch[1] as GlobalSettings['theme'];
    }

    // Parse pattern
    const patternMatch = className.match(/^vb-pattern-(.+?)(?:-animated)?$/);
    if (patternMatch && !settings.background?.pattern) {
      // Set background type to pattern when pattern classes are found
      if (settings.background) {
        settings.background.type = 'pattern';
      }
      settings.background!.pattern = {
        type: patternMatch[1] as BackgroundPattern['type'],
        primaryColor: '#ff69b4', // Will be overridden by CSS custom properties if found
        size: 1,
        opacity: 0.3,
        animated: className.includes('-animated')
      };
    }

    // Parse effects
    if (className === 'vb-effect-rounded') {
      settings.effects!.borderRadius = '12px'; // Default value
    }
    if (className === 'vb-effect-shadow') {
      settings.effects!.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'; // Default value
    }
    if (className === 'vb-effect-blur') {
      settings.effects!.blur = 2; // Default value
    }
    if (className.startsWith('vb-effect-') && !['rounded', 'shadow', 'blur'].includes(className.replace('vb-effect-', ''))) {
      if (settings.effects) {
        (settings.effects as any).animation = className.replace('vb-effect-', '');
      }
    }
  }

  return settings;
}