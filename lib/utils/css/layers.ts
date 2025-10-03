// CSS Layers utility for consistent cascade management
// Replaces the !important nightmare with proper CSS layer ordering

export type CSSMode = 'inherit' | 'override' | 'disable';
export type TemplateMode = 'default' | 'enhanced' | 'advanced';

// Define our layer hierarchy (order matters - later layers have higher priority)
export const CSS_LAYERS = {
  // Base layers - lowest priority
  BROWSER_DEFAULTS: 'threadstead-browser',
  GLOBAL_RESET: 'threadstead-reset', 
  
  // ThreadStead system layers
  GLOBAL_BASE: 'threadstead-global',
  SITE_WIDE: 'threadstead-site', 
  COMPONENT_BASE: 'threadstead-components',
  
  // Template-specific layers
  TEMPLATE_STRUCTURE: 'threadstead-template',
  
  // User layers - highest priority  
  USER_BASE: 'threadstead-user-base',
  USER_CUSTOM: 'threadstead-user-custom',
  USER_OVERRIDE: 'threadstead-user-override',
  USER_NUCLEAR: 'threadstead-user-nuclear'
} as const;

// Layer ordering declaration - this goes at the top of any CSS
export const LAYER_ORDER_DECLARATION = `@layer ${Object.values(CSS_LAYERS).join(', ')};`;

interface LayeredCSSOptions {
  cssMode: CSSMode;
  templateMode: TemplateMode;
  globalCSS?: string;
  siteWideCSS?: string;
  userCustomCSS?: string;
  componentCSS?: string;
  profileId?: string; // For scoping
  templateHtml?: string; // For detecting legacy vs Visual Builder templates
}

/**
 * Generate layered CSS based on template mode and CSS mode
 */
export function generateLayeredCSS({
  cssMode,
  templateMode,
  globalCSS = '',
  siteWideCSS = '',
  userCustomCSS = '',
  componentCSS = '',
  profileId,
  templateHtml = ''
}: LayeredCSSOptions): string {
  const layers: string[] = [];
  
  // Always start with layer order declaration
  layers.push(LAYER_ORDER_DECLARATION);
  
  // Add global reset and base styles based on CSS mode
  if (cssMode !== 'disable') {
    if (globalCSS) {
      layers.push(`@layer ${CSS_LAYERS.GLOBAL_BASE} {
${globalCSS}
}`);
    }
    
    if (siteWideCSS) {
      layers.push(`@layer ${CSS_LAYERS.SITE_WIDE} {
${siteWideCSS}
}`);
    }
  }
  
  // Add component styles only if not in disable mode
  // In disable mode, user has complete control - no system component styles
  if (componentCSS && cssMode !== 'disable') {
    layers.push(`@layer ${CSS_LAYERS.COMPONENT_BASE} {
${componentCSS}
}`);
  }
  
  // Add user CSS based on CSS mode and template mode
  if (userCustomCSS) {
    // Detect if this is a legacy template (no Visual Builder wrapper)
    const isLegacyTemplate = Boolean(templateHtml &&
                            (!templateHtml.includes('pure-absolute-container') ||
                             (!templateHtml.includes('vb-theme-') &&
                              !templateHtml.includes('vb-pattern-') &&
                              !templateHtml.includes('vb-effect-'))));

    const cleanCSS = cleanUserCSS(userCustomCSS, profileId, isLegacyTemplate);
    const scopedCSS = profileId ? scopeCSSToProfile(cleanCSS, profileId) : cleanCSS;
    const nuclearCSS = forceUserCSSDominance(scopedCSS, cssMode);
    
    switch (cssMode) {
      case 'inherit':
        // User CSS extends site styles - NUCLEAR DOMINANCE ensures override
        layers.push(`@layer ${CSS_LAYERS.USER_NUCLEAR} {
/* USER CSS MUST ALWAYS WIN - NUCLEAR OPTION ACTIVATED */
${nuclearCSS}
}`);
        break;
        
      case 'override':
        // User CSS takes precedence but still works with components
        layers.push(`@layer ${CSS_LAYERS.USER_NUCLEAR} {
/* USER CSS MUST ALWAYS WIN - NUCLEAR OPTION ACTIVATED */
${nuclearCSS}
}`);
        break;
        
      case 'disable':
        // User has complete control - but we still provide component layer for function
        layers.push(`@layer ${CSS_LAYERS.USER_NUCLEAR} {
/* USER CSS MUST ALWAYS WIN - NUCLEAR OPTION ACTIVATED */
${nuclearCSS}
}`);
        break;
    }
    
    // Add navigation customization helpers for advanced templates
    if (templateMode === 'advanced') {
      layers.push(`@layer ${CSS_LAYERS.USER_OVERRIDE} {
/* Advanced Template Mode - Complete Layout Freedom */

/* Minimal wrapper styles - non-interfering container for CSS scoping */
.profile-template-root {
  /* Ensure wrapper doesn't interfere with layout */
  position: static !important;
  z-index: auto !important;
  overflow: visible !important;
  isolation: auto !important;

  /* Allow wrapper to size based on content */
  display: block;
  width: 100%;
  min-height: 100vh;
}

/* Ensure inner containers work correctly */
.profile-template-root > .pure-absolute-container,
.profile-template-root > .advanced-template-container {
  /* These containers handle actual layout */
  position: relative;
  min-height: inherit;
}

/* Remove all container constraints for advanced templates (legacy) */
.advanced-template-mode {
  /* Reset any inherited container constraints */
  max-width: none !important;
  margin: 0 !important;
  padding: 0 !important;
  width: 100% !important;
  box-sizing: border-box !important;
}

/* Navigation customization for advanced templates */
.advanced-template-nav {
  /* Allow users to completely customize or hide navigation */
  background: var(--nav-bg, rgba(245, 233, 212, 0.8));
  border-color: var(--nav-border, #A18463);
  backdrop-filter: var(--nav-blur, blur(4px));
  position: var(--nav-position, sticky);
  top: var(--nav-top, 0);
  z-index: var(--nav-z-index, 9999);
}

.advanced-template-nav .site-title {
  color: var(--nav-title-color, #2E4B3F);
}

.advanced-template-nav .nav-link {
  color: var(--nav-link-color, #2E4B3F);
}

/* Users can hide navigation completely if desired */
.hide-navigation .advanced-template-nav {
  display: none !important;
}

/* Users can make navigation transparent */
.transparent-nav .advanced-template-nav {
  background: transparent !important;
  border: none !important;
  backdrop-filter: none !important;
}

/* Users can make navigation float over content */
.floating-nav .advanced-template-nav {
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  z-index: 10000 !important;
}
}`);
    }
  }
  
  return layers.join('\n\n');
}

/**
 * Clean user CSS by removing old CSS_MODE comments but PRESERVE !important for theme overrides
 * Optionally transform body styles for legacy templates
 */
function cleanUserCSS(css: string, profileId?: string, isLegacyTemplate?: boolean): string {
  let cleanedCSS = css
    // Remove CSS mode comments
    .replace(/\/\* CSS_MODE:\w+ \*\/\n?/g, '')
    // Keep !important declarations - they're needed to override site styles
    // Only remove empty semicolons
    .replace(/;;+/g, ';')
    .trim();

  // Apply body transformation for legacy templates only
  if (isLegacyTemplate && profileId) {
    cleanedCSS = transformBodyStyles(cleanedCSS, profileId);
  }

  return cleanedCSS;
}

/**
 * Transform body styles to target template container for legacy templates
 * Allows legacy templates to use body styling while working in nested architecture
 */
function transformBodyStyles(css: string, profileId: string): string {
  if (!css.trim() || !profileId) return css;

  // Extract body rules using regex
  const bodyRuleRegex = /body\s*\{([^{}]*)\}/g;
  const bodyRules: string[] = [];
  let match;

  while ((match = bodyRuleRegex.exec(css)) !== null) {
    const properties = match[1].trim();
    if (properties) {
      bodyRules.push(properties);
    }
  }

  if (bodyRules.length === 0) return css;

  // Generate container targeting for each body rule
  const containerRules = bodyRules.map(properties => `
#${profileId} {
  ${properties}
  min-height: 100vh;
  box-sizing: border-box;
}`).join('\n');

  return css + '\n\n/* Auto-generated container targeting for body styles */\n' + containerRules;
}

/**
 * NUCLEAR OPTION: Force user CSS to always win with maximum specificity and !important
 * User CSS must ALWAYS be the most important on their own page
 */
export function forceUserCSSDominance(css: string, cssMode: CSSMode = 'inherit'): string {
  if (!css.trim()) return '';
  
  // Extract and preserve @import, @media, @keyframes etc. - don't process these
  const atRules: string[] = [];
  let workingCSS = css;
  
  // Extract @import statements first (they must be at the top)
  workingCSS = workingCSS.replace(/@import\s+[^;]+;/g, (match) => {
    atRules.push(match);
    return '';
  });
  
  // Extract other @rules like @media, @keyframes etc.
  workingCSS = workingCSS.replace(/@[^{]+\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g, (match) => {
    atRules.push(match);
    return '';
  });
  
  // Remove comments and clean up the remaining CSS
  workingCSS = workingCSS
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove CSS comments
    .replace(/^\s*\/\/.*$/gm, '') // Remove single-line comments  
    .replace(/\n\s*\n/g, '\n') // Remove extra blank lines
    .trim();
  
  // Now process only regular CSS rules (not @rules)
  const nuclearRules = workingCSS.replace(/([^{}]+)\{([^}]*)\}/g, (match, selector, rules) => {
    const trimmedSelector = selector.trim();
    
    // Skip any remaining @-rules and empty selectors
    if (trimmedSelector.startsWith('@') || !trimmedSelector) return match;
    
    // Force maximum specificity on all selectors
    const nuclearSelectors = trimmedSelector.split(',')
      .map((s: string) => {
        const trimmed = s.trim();
        
        // Don't modify selectors that already have maximum specificity
        if (trimmed.includes(':root') || trimmed.startsWith('html body')) {
          return trimmed;
        }
        
        // Special handling for Visual Builder classes in nuclear mode
        if (trimmed.includes('.vb-')) {
          // Check if this is already a scoped selector with profile ID
          const hasProfileId = trimmed.includes('#profile-');

          if (hasProfileId) {
            // Selector already scoped in scopeCSSToProfile - just apply nuclear specificity
            return `html body html body ${trimmed}`;
          }

          // Pure Visual Builder class - will be handled by scopeCSSToProfile first
          return `html body html body ${trimmed}`;
        }

        // Force maximum nuclear specificity: extra layer for Visual Builder in disable mode
        const isVisualBuilderDisable = cssMode === 'disable' && (trimmed.includes('.vb-') || trimmed.includes('--global-'));
        return isVisualBuilderDisable
          ? `html body html body html body ${trimmed}`
          : `html body html body ${trimmed}`;
      })
      .join(', ');
    
    // Force !important on every CSS property that doesn't already have it
    // Be careful with URLs and data URIs to avoid breaking them
    const nuclearProps = rules.replace(/([^;{]+?):\s*([^;!]+?)(?!\s*!important)\s*;/g, (match: string, property: string, value: string) => {
      // Clean property name and value to avoid spaces in URLs
      const cleanProperty = property.trim();
      const cleanValue = value.trim();

      // Skip adding !important if value contains data: or url( to avoid breaking URLs
      if (cleanValue.includes('data:') || cleanValue.includes('url(')) {
        return `${cleanProperty}: ${cleanValue} !important;`;
      }
      return `${cleanProperty}: ${cleanValue} !important;`;
    });
      
    return `${nuclearSelectors} { ${nuclearProps} }`;
  });
  
  // Add extra Visual Builder overrides for disable mode
  let additionalOverrides = '';
  if (cssMode === 'disable' && css.includes('.vb-')) {
    additionalOverrides = `
/* VISUAL BUILDER ABSOLUTE OVERRIDES - FULL PAGE COVERAGE */
html body html body html body html {
  background-color: var(--global-bg-color, var(--vb-background-color)) !important;
  color: var(--global-text-color, var(--vb-text-color)) !important;
  font-family: var(--global-font-family, var(--vb-font-family)) !important;
}

html body html body html body body {
  background-color: var(--global-bg-color, var(--vb-background-color)) !important;
  color: var(--global-text-color, var(--vb-text-color)) !important;
  font-family: var(--global-font-family, var(--vb-font-family)) !important;
  margin: 0 !important;
  padding: 0 !important;
}

/* WRAPPER ELEMENT PATTERN INHERITANCE FOR FULL-PAGE VISUAL BUILDER */
/* Copy pattern backgrounds from Visual Builder containers to wrapper for seamless coverage */
html body html body html body #__next > div:has([class*="vb-pattern-"]) {
  /* Inherit all Visual Builder styling for full-page coverage */
  background-color: var(--global-bg-color, var(--vb-background-color)) !important;
  color: var(--global-text-color, var(--vb-text-color)) !important;
  font-family: var(--global-font-family, var(--vb-font-family)) !important;
  font-size: var(--global-font-size, var(--vb-font-size)) !important;
}

/* PATTERN-SPECIFIC WRAPPER INHERITANCE */
/* Stars pattern */
html body html body html body #__next > div:has(.vb-pattern-stars) {
  background-image: url("data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%0A%20%20%20%20%20%20%20%20%3Cpolygon%20points%3D%2220%2C10%2024%2C18%2030%2C14%2026%2C22%2032%2C30%2020%2C24%208%2C30%2014%2C22%2010%2C14%2016%2C18%22%0A%20%20%20%20%20%20%20%20%20%20fill%3D%22%23ffffff%22%20opacity%3D%220.8%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Cpolygon%20points%3D%2240%2C30%2042%2C33%2045%2C32%2043%2C35%2046%2C38%2040%2C36%2034%2C38%2037%2C35%2035%2C32%2038%2C33%22%0A%20%20%20%20%20%20%20%20%20%20fill%3D%22%23ffd700%22%20opacity%3D%220.48%22%2F%3E%0A%20%20%20%20%20%20%3C%2Fsvg%3E") !important;
  background-repeat: repeat !important;
  background-size: 40px 40px !important;
}

/* Animated stars pattern */
html body html body html body #__next > div:has(.vb-pattern-stars-animated) {
  animation: vb-twinkle 3s ease-in-out infinite !important;
}
`;
  }

  // Combine preserved @rules with nuclear regular rules and additional overrides
  return (atRules.join('\n') + '\n' + nuclearRules + additionalOverrides).trim();
}

/**
 * Scope CSS to a specific profile container
 */
function scopeCSSToProfile(css: string, profileId: string): string {
  if (!css.trim()) return '';
  
  // First, extract and preserve @import statements (they can't be scoped)
  const imports: string[] = [];
  let workingCSS = css.replace(/@import\s+[^;]+;/g, (match) => {
    imports.push(match);
    return '/* IMPORT_PLACEHOLDER */';
  });
  
  // Now scope the rest of the CSS
  workingCSS = workingCSS.replace(/([^{}]+){/g, (match, selector) => {
    // Skip @-rules (media queries, keyframes, etc.)
    if (selector.trim().startsWith('@')) return match;
    
    // Handle multiple selectors separated by commas
    const scopedSelectors = selector.split(',')
      .map((s: string) => {
        const trimmed = s.trim();

        // Handle body selector specially - apply to profile container (now using unified wrapper class)
        if (trimmed === 'body') {
          return `.profile-template-root#${profileId}`;
        } else if (trimmed.startsWith('body ')) {
          return `.profile-template-root#${profileId}${trimmed.substring(4)}`;
        } else if (trimmed.startsWith('body.')) {
          // Handle body.class selectors (like body.vb-pattern-grid) -> .profile-template-root#profile.class
          return `.profile-template-root#${profileId}${trimmed.substring(4)}`;
        } else if (trimmed === ':root') {
          // Root variables should apply to the profile container for proper CSS variable scoping
          return `.profile-template-root#${profileId}`;
        }

        // Legacy compatibility: Support old advanced-template-container references
        if (trimmed.includes('advanced-template-container')) {
          const updated = trimmed.replace(/advanced-template-container/g, 'profile-template-root');
          return `#${profileId} ${updated}`;
        }

        // Special handling for Visual Builder classes - they can be on the container itself
        if (trimmed.startsWith('.vb-')) {
          // Generate both direct targeting (for container) and descendant targeting (for children)
          return `#${profileId}${trimmed}, #${profileId} ${trimmed}`;
        }

        // Scope all other selectors to the profile
        return `#${profileId} ${trimmed}`;
      })
      .join(', ');
      
    return `${scopedSelectors} {`;
  });
  
  // Restore the @import statements at the beginning
  return imports.join('\n') + (imports.length > 0 ? '\n' : '') + workingCSS.replace(/\/\* IMPORT_PLACEHOLDER \*\//g, '');
}

/**
 * Generate component-specific CSS layer
 */
export function generateComponentCSS(componentName: string, css: string): string {
  const layerName = `${CSS_LAYERS.COMPONENT_BASE}-${componentName.toLowerCase()}`;
  
  return `@layer ${layerName} {
/* ${componentName} component styles */
${css}
}`;
}

/**
 * Generate CSS for preview mode (EnhancedTemplateEditor)
 */
export function generatePreviewCSS({
  cssMode,
  templateMode,
  globalCSS = '',
  siteWideCSS = '',
  userCustomCSS = '',
  profileId = 'preview-profile'
}: Omit<LayeredCSSOptions, 'componentCSS'>): string {
  
  // For preview, we want to show exactly what the user will see
  return generateLayeredCSS({
    cssMode,
    templateMode,
    globalCSS,
    siteWideCSS,
    userCustomCSS,
    componentCSS: '', // Components handle their own CSS
    profileId
  });
}

/**
 * Check if CSS Layers are supported by the browser
 */
export function supportsCSSLayers(): boolean {
  if (typeof window === 'undefined') return true; // SSR assumes support
  
  try {
    return CSS.supports('@layer base {}');
  } catch {
    return false;
  }
}

/**
 * Fallback CSS generation for browsers that don't support layers
 * Uses specificity-based approach (but cleaner than current !important approach)
 */
export function generateFallbackCSS({
  cssMode,
  templateMode,
  globalCSS = '',
  siteWideCSS = '',
  userCustomCSS = '',
  profileId,
  templateHtml = ''
}: LayeredCSSOptions): string {
  const parts: string[] = [];
  
  // Base styles (lowest specificity)
  if (cssMode !== 'disable') {
    if (globalCSS) parts.push(`/* Global Base CSS */\n${globalCSS}`);
    if (siteWideCSS) parts.push(`/* Site Wide CSS */\n${siteWideCSS}`);
  }
  
  // User styles (NUCLEAR DOMINANCE for fallback browsers too)
  if (userCustomCSS) {
    // Detect if this is a legacy template (no Visual Builder wrapper)
    const isLegacyTemplate = Boolean(templateHtml &&
                            (!templateHtml.includes('pure-absolute-container') ||
                             (!templateHtml.includes('vb-theme-') &&
                              !templateHtml.includes('vb-pattern-') &&
                              !templateHtml.includes('vb-effect-'))));

    const cleanCSS = cleanUserCSS(userCustomCSS, profileId, isLegacyTemplate);
    const scopedCSS = profileId ? scopeCSSToProfile(cleanCSS, profileId) : cleanCSS;
    const nuclearCSS = forceUserCSSDominance(scopedCSS, cssMode);
    
    parts.push(`/* USER CSS MUST ALWAYS WIN - NUCLEAR FALLBACK (${cssMode} mode) */\n${nuclearCSS}`);
  }
  
  return parts.join('\n\n');
}

/**
 * Main utility function - automatically chooses layers or fallback
 */
export function generateOptimizedCSS(options: LayeredCSSOptions): string {
  // Use layers if supported, fallback if not
  if (supportsCSSLayers()) {
    return generateLayeredCSS(options);
  } else {
    return generateFallbackCSS(options);
  }
}