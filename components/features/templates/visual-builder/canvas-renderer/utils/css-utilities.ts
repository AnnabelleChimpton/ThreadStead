/**
 * CSS generation and manipulation utilities for canvas renderer
 */

import React from 'react';
import type { GlobalSettings } from '@/components/features/templates/visual-builder/GlobalSettingsPanel';
import { generatePatternCSS, generateGradientCSS } from '@/lib/templates/visual-builder/background-patterns';

/**
 * Generate CSS custom properties from global settings
 */
export function generateGlobalCSSProperties(globalSettings: GlobalSettings | null): React.CSSProperties {
  if (!globalSettings) return {};

  // Minimal inline styles - let CSS classes handle most styling
  // Only include complex backgrounds that require dynamic generation
  let backgroundStyle: any = {};

  if (globalSettings.background?.type === 'pattern' && globalSettings.background?.pattern) {
    // For patterns, generate the background image inline but let CSS classes handle color
    const patternCSS = generatePatternCSS(globalSettings.background.pattern);
    if (patternCSS) {
      backgroundStyle = {
        backgroundImage: patternCSS,
        backgroundRepeat: 'repeat',
        backgroundSize: `${(globalSettings.background.pattern.size || 1) * 40}px ${(globalSettings.background.pattern.size || 1) * 40}px`
        // Let CSS classes handle backgroundColor via var(--vb-bg-color)
      };
    }
  } else if (globalSettings.background?.type === 'gradient' && globalSettings.background?.gradient) {
    backgroundStyle = {
      background: generateGradientCSS(globalSettings.background.gradient)
    };
  }
  // For solid colors, let CSS classes handle everything via var(--vb-bg-color)

  const cssProperties: React.CSSProperties = {
    // Only complex backgrounds as inline styles
    ...backgroundStyle,

    // Let CSS classes handle text and spacing via CSS custom properties
    // Remove conflicting inline styles that override CSS classes
  };

  // Only add CSS variables if they have actual values (avoid overriding CSS)
  // Set --global-bg-color for all background types so CSS classes work properly
  if (globalSettings.background?.color) {
    (cssProperties as any)['--global-bg-color'] = globalSettings.background.color;
  }
  if (globalSettings.background?.type) {
    (cssProperties as any)['--global-bg-type'] = globalSettings.background.type;
  }
  if (globalSettings.typography?.fontFamily) {
    (cssProperties as any)['--global-font-family'] = globalSettings.typography.fontFamily;
  }
  if (globalSettings.typography?.baseSize) {
    (cssProperties as any)['--global-base-font-size'] = globalSettings.typography.baseSize;
  }
  if (globalSettings.typography?.scale) {
    (cssProperties as any)['--global-typography-scale'] = globalSettings.typography.scale.toString();
  }
  if (globalSettings.spacing?.containerPadding) {
    (cssProperties as any)['--global-container-padding'] = globalSettings.spacing.containerPadding;
  }
  if (globalSettings.spacing?.sectionSpacing) {
    (cssProperties as any)['--global-section-spacing'] = globalSettings.spacing.sectionSpacing;
  }
  if (globalSettings.theme) {
    (cssProperties as any)['--global-theme'] = globalSettings.theme;
  }

  return cssProperties;
}

/**
 * Helper function to strip positioning CSS from a style string or object
 * Used in Visual Builder to prevent double positioning
 */
export function stripPositioningFromStyle(style: string | React.CSSProperties | undefined): string | React.CSSProperties | undefined {
  if (!style) return style;

  // If style is a string, parse it and remove positioning properties
  if (typeof style === 'string') {
    const declarations = style.split(';').map(d => d.trim()).filter(Boolean);
    const cleanedDeclarations = declarations.filter(declaration => {
      const property = declaration.split(':')[0]?.trim().toLowerCase();
      // Remove positioning-related properties
      return !['position', 'top', 'right', 'bottom', 'left', 'z-index'].includes(property);
    });
    return cleanedDeclarations.join('; ');
  }

  // If style is an object, create a copy without positioning properties
  if (typeof style === 'object') {
    const cleaned = { ...style };
    delete cleaned.position;
    delete cleaned.top;
    delete cleaned.right;
    delete cleaned.bottom;
    delete cleaned.left;
    delete cleaned.zIndex;
    return cleaned;
  }

  return style;
}
