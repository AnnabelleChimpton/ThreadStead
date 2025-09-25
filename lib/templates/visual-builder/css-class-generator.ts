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
   * Sanitize CSS values to prevent infinite variable recursion
   */
  private sanitizeCSSValue(value: string | undefined, fallback: string): string {
    if (!value || typeof value !== 'string') {
      return fallback;
    }

    // Trim the value
    const trimmedValue = value.trim();
    if (!trimmedValue) {
      return fallback;
    }

    // Check if the value is a CSS variable (var(...))
    const varMatch = trimmedValue.match(/^var\s*\(/);
    if (varMatch) {
      // Extract the variable name from var(--variable-name, fallback)
      const selfRefMatch = trimmedValue.match(/var\s*\(\s*(--[\w-]+)\s*(?:,\s*([^)]+))?\)/);
      if (selfRefMatch) {
        const varName = selfRefMatch[1];
        const varFallback = selfRefMatch[2];

        // Detect self-reference by checking if variable references itself
        const currentPropertyName = this.getCurrentPropertyName();
        if (currentPropertyName && varName === currentPropertyName) {
          console.warn(`[CSSClassGenerator] Detected CSS variable recursion: ${varName} references itself, using fallback: ${fallback}`);
          return fallback;
        }

        // If there's a fallback value that's not the same variable, use it
        if (varFallback && varFallback.trim() && !varFallback.includes(varName)) {
          return varFallback.trim();
        }

        // If no valid fallback in the var(), use the provided fallback
        console.warn(`[CSSClassGenerator] Preventing potential CSS variable recursion for ${varName}, using fallback: ${fallback}`);
        return fallback;
      }
    }

    // For normal values, return as-is
    return trimmedValue;
  }

  /**
   * Track current property name being processed (for recursion detection)
   */
  private currentPropertyName: string | null = null;

  private getCurrentPropertyName(): string | null {
    return this.currentPropertyName;
  }

  private setCurrentPropertyName(name: string | null): void {
    this.currentPropertyName = name;
  }

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

    // Generate pattern classes (only when background type is pattern)
    if (globalSettings.background?.type === 'pattern' &&
        globalSettings.background.pattern &&
        globalSettings.background.pattern.type !== 'none') {
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

    // Background properties - sanitize to prevent CSS variable recursion
    let backgroundColorToUse = globalSettings.background?.color;

    // For patterns, use pattern's backgroundColor if available, otherwise fall back to global background color
    if (globalSettings.background?.type === 'pattern' &&
        globalSettings.background.pattern?.backgroundColor) {
      backgroundColorToUse = globalSettings.background.pattern.backgroundColor;
    }

    if (backgroundColorToUse) {
      this.setCurrentPropertyName('--global-bg-color');
      const sanitizedBgColor = this.sanitizeCSSValue(backgroundColorToUse, '#ffffff');
      properties['--global-bg-color'] = sanitizedBgColor;
      this.setCurrentPropertyName(null);
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
      if (pattern.backgroundColor) {
        properties['--vb-pattern-background'] = pattern.backgroundColor;
      }
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

    // Typography properties - sanitize to prevent CSS variable recursion (use global naming)
    if (globalSettings.typography?.fontFamily) {
      this.setCurrentPropertyName('--global-font-family');
      const fontFamily = this.sanitizeCSSValue(globalSettings.typography.fontFamily, 'Inter, sans-serif');
      properties['--global-font-family'] = fontFamily;
      this.setCurrentPropertyName(null);
    }
    if (globalSettings.typography?.baseSize) {
      this.setCurrentPropertyName('--global-base-font-size');
      const baseSize = this.sanitizeCSSValue(globalSettings.typography.baseSize, '16px');
      properties['--global-base-font-size'] = baseSize;
      this.setCurrentPropertyName(null);
    }
    if (globalSettings.typography?.scale) {
      properties['--global-typography-scale'] = globalSettings.typography.scale.toString();
    }

    // Spacing properties - sanitize to prevent CSS variable recursion (use global naming)
    if (globalSettings.spacing?.containerPadding) {
      this.setCurrentPropertyName('--global-container-padding');
      const containerPadding = this.sanitizeCSSValue(globalSettings.spacing.containerPadding, '24px');
      properties['--global-container-padding'] = containerPadding;
      this.setCurrentPropertyName(null);
    }
    if (globalSettings.spacing?.sectionSpacing) {
      this.setCurrentPropertyName('--global-section-spacing');
      const sectionSpacing = this.sanitizeCSSValue(globalSettings.spacing.sectionSpacing, '32px');
      properties['--global-section-spacing'] = sectionSpacing;
      this.setCurrentPropertyName(null);
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

    // Background color - use CSS custom property (matching inline style naming)
    if (globalSettings.background?.color) {
      themeProperties['background-color'] = `var(--global-bg-color)`;
    }

    // Typography - use CSS custom properties (matching global naming)
    if (globalSettings.typography?.fontFamily) {
      themeProperties['font-family'] = `var(--global-font-family)`;
    }
    if (globalSettings.typography?.baseSize) {
      themeProperties['font-size'] = `var(--global-base-font-size)`;
    }
    if (globalSettings.typography?.textShadow) {
      themeProperties['text-shadow'] = globalSettings.typography.textShadow;
    }
    if (globalSettings.typography?.letterSpacing) {
      themeProperties['letter-spacing'] = globalSettings.typography.letterSpacing;
    }

    // Spacing - use CSS custom properties (matching global naming)
    if (globalSettings.spacing?.containerPadding) {
      themeProperties['padding'] = `var(--global-container-padding)`;
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
      // FULL VIEWPORT PATTERN: Apply pattern to body for edge-to-edge coverage
      const bodyProperties: Record<string, string> = {
        'background-image': patternCSS,
        'background-repeat': 'repeat',
        'background-size': `${(pattern.size || 1) * 40}px ${(pattern.size || 1) * 40}px`,
        'background-attachment': 'fixed', // Keep pattern fixed during scroll
        // Store pattern configuration as CSS custom properties for parsing back
        '--vb-pattern-primary-color': pattern.primaryColor,
        '--vb-pattern-size': pattern.size.toString(),
        '--vb-pattern-opacity': pattern.opacity.toString()
      };

      // Also create container properties for backwards compatibility
      const containerProperties: Record<string, string> = {
        // Pattern background combines pattern and background color
        'background-image': patternCSS,
        'background-repeat': 'repeat',
        'background-size': `${(pattern.size || 1) * 40}px ${(pattern.size || 1) * 40}px`,
        'background-color': pattern.backgroundColor || '#ffffff', // Keep the theme background color
        // Store pattern configuration as CSS custom properties for parsing back
        '--vb-pattern-primary-color': pattern.primaryColor,
        '--vb-pattern-size': pattern.size.toString(),
        '--vb-pattern-opacity': pattern.opacity.toString()
      };

      // Add secondary color to both body and container properties
      if (pattern.secondaryColor) {
        bodyProperties['--vb-pattern-secondary-color'] = pattern.secondaryColor;
        containerProperties['--vb-pattern-secondary-color'] = pattern.secondaryColor;
      }

      // Add rotation to body properties (where the pattern is)
      if (pattern.rotation) {
        bodyProperties['transform'] = `rotate(${pattern.rotation}deg)`;
        bodyProperties['--vb-pattern-rotation'] = pattern.rotation.toString();
        containerProperties['--vb-pattern-rotation'] = pattern.rotation.toString();
      }

      // Add body selector for full viewport pattern coverage
      classes.push({
        selector: `body.${patternClass}`,
        properties: bodyProperties
      });

      // Add container selector for backwards compatibility and background color
      classes.push({
        selector: `.${patternClass}`,
        properties: containerProperties
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
          'transform': 'scale(1)' // Keep transform but don't shrink (was 0.95)
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

    // Pattern class (only when background type is pattern)
    if (globalSettings.background?.type === 'pattern' &&
        globalSettings.background.pattern &&
        globalSettings.background.pattern.type !== 'none') {
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