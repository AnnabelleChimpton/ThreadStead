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
  profileId
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
  
  // Add component styles (always included for proper component function)
  if (componentCSS) {
    layers.push(`@layer ${CSS_LAYERS.COMPONENT_BASE} {
${componentCSS}
}`);
  }
  
  // Add user CSS based on CSS mode and template mode
  if (userCustomCSS) {
    const cleanCSS = cleanUserCSS(userCustomCSS);
    const scopedCSS = profileId ? scopeCSSToProfile(cleanCSS, profileId) : cleanCSS;
    const nuclearCSS = forceUserCSSDominance(scopedCSS);
    
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

/* Remove all container constraints for advanced templates */
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
 */
function cleanUserCSS(css: string): string {
  return css
    // Remove CSS mode comments
    .replace(/\/\* CSS_MODE:\w+ \*\/\n?/g, '')
    // Keep !important declarations - they're needed to override site styles
    // Only remove empty semicolons
    .replace(/;;+/g, ';')
    .trim();
}

/**
 * NUCLEAR OPTION: Force user CSS to always win with maximum specificity and !important
 * User CSS must ALWAYS be the most important on their own page
 */
export function forceUserCSSDominance(css: string): string {
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
        
        // Force nuclear specificity: html body html body selector
        return `html body html body ${trimmed}`;
      })
      .join(', ');
    
    // Force !important on every CSS property that doesn't already have it
    const nuclearProps = rules.replace(/([^;{]+):\s*([^;!]+)(?!.*!important)\s*;/g, '$1: $2 !important;');
      
    return `${nuclearSelectors} { ${nuclearProps} }`;
  });
  
  // Combine preserved @rules with nuclear regular rules
  return (atRules.join('\n') + '\n' + nuclearRules).trim();
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
        
        // Handle body selector specially - apply to profile container
        if (trimmed === 'body') {
          return `#${profileId}`;
        } else if (trimmed.startsWith('body ')) {
          return `#${profileId}${trimmed.substring(4)}`;
        } else if (trimmed === ':root') {
          // Root variables should apply to the profile container
          return `#${profileId}`;
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
  profileId
}: LayeredCSSOptions): string {
  const parts: string[] = [];
  
  // Base styles (lowest specificity)
  if (cssMode !== 'disable') {
    if (globalCSS) parts.push(`/* Global Base CSS */\n${globalCSS}`);
    if (siteWideCSS) parts.push(`/* Site Wide CSS */\n${siteWideCSS}`);
  }
  
  // User styles (NUCLEAR DOMINANCE for fallback browsers too)
  if (userCustomCSS) {
    const cleanCSS = cleanUserCSS(userCustomCSS);
    const scopedCSS = profileId ? scopeCSSToProfile(cleanCSS, profileId) : cleanCSS;
    const nuclearCSS = forceUserCSSDominance(scopedCSS);
    
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