// Template preview component with dual rendering modes
import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ResidentDataProvider } from '@/components/template/ResidentDataProvider';
import type { ResidentData } from '@/components/template/ResidentDataProvider';
import type { User } from '@prisma/client';
import type { CompiledTemplate } from '@/lib/template-compiler';
import { componentRegistry, validateAndCoerceProps } from '@/lib/template-registry';
import { generatePreviewCSS, forceUserCSSDominance } from '@/lib/css-layers';
import MinimalNavBar from '@/components/MinimalNavBar';
import { useSiteConfig } from '@/hooks/useSiteConfig';
import Link from 'next/link';

// Simplified NavBar for preview that doesn't require data fetching
function PreviewNavBar({ siteConfig }: { siteConfig: any }) {
  return (
    <header className="site-header border-b border-thread-sage bg-thread-cream px-4 sm:px-6 py-4 sticky top-0 z-[9999] backdrop-blur-sm bg-thread-cream/95 relative">
      <nav className="site-navigation mx-auto max-w-5xl flex items-center justify-between">
        <div className="site-branding flex-shrink-0">
          <h1 className="site-title thread-headline text-xl sm:text-2xl font-bold text-thread-pine">{siteConfig?.site_name || 'ThreadStead'}</h1>
          <span className="site-tagline thread-label hidden sm:inline">{siteConfig?.site_tagline || 'Personal Pages'}</span>
        </div>
        
        {/* Desktop Navigation */}
        <div className="site-nav-container hidden lg:flex items-center gap-8">
          <div className="site-nav-links flex items-center gap-6">
            <Link className="nav-link nav-link-underline text-thread-pine hover:text-thread-sunset font-medium underline hover:no-underline" href="/">Home</Link>
            <Link className="nav-link nav-link-underline text-thread-pine hover:text-thread-sunset font-medium underline hover:no-underline" href="/discovery">Discovery</Link>
            <Link className="nav-link nav-link-underline text-thread-pine hover:text-thread-sunset font-medium underline hover:no-underline" href="/help">Help</Link>
          </div>
          
          {/* Site Auth */}
          <div className="site-auth flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-thread-sage">
              <span className="hidden sm:inline">Preview Mode</span>
              <div className="w-8 h-8 bg-thread-sage rounded-full flex items-center justify-center">
                <span className="text-white text-xs">👤</span>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile hamburger */}
        <div className="lg:hidden">
          <button className="p-2 text-thread-pine hover:text-thread-sunset">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </nav>
    </header>
  );
}

// Preview footer component
function PreviewFooter({ siteConfig }: { siteConfig: any }) {
  return (
    <footer className="site-footer border-t border-thread-sage bg-thread-cream px-6 py-4 mt-auto">
      <div className="footer-content mx-auto max-w-5xl text-center">
        <span className="footer-tagline thread-label">{siteConfig?.site_description || 'A personal website platform'}</span>
        <p className="footer-copyright text-sm text-thread-sage mt-1">© {new Date().getFullYear()} {siteConfig?.footer_text || 'ThreadStead'}</p>
      </div>
    </footer>
  );
}

// Simple debounce implementation
function debounce<T extends (...args: any[]) => any>(func: T, delay: number): T {
  let timeoutId: NodeJS.Timeout;
  return ((...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  }) as T;
}


// Enhanced nested template parser
function parseNestedTemplate(templateContent: string) {
  // Get all valid components dynamically from registry
  const validComponents = componentRegistry.getAllowedTags();
  
  
  // Create a simple DOM parser to handle nested structure
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<root>${templateContent}</root>`, 'text/xml');
  
  if (doc.documentElement.tagName === 'parsererror') {
    // Fallback to regex if XML parsing fails
    console.warn('XML parsing failed, falling back to regex');
    return parseTemplateWithRegex(templateContent, validComponents);
  }
  
  const islands: any[] = [];
  let islandCounter = 0;
  
  function processElement(element: Element, parentId?: string): any {
    const tagName = element.tagName;
    const properComponentName = validComponents.find((valid: string) => 
      valid.toLowerCase() === tagName.toLowerCase()
    );
    
    if (properComponentName) {
      const islandId = `mock-island-${islandCounter++}`;
      
      // Extract props from attributes
      const props: any = {};
      for (let i = 0; i < element.attributes.length; i++) {
        const attr = element.attributes[i];
        props[attr.name] = attr.value;
      }
      
      // Process children recursively - components become children
      const children: any[] = [];
      
      for (let i = 0; i < element.childNodes.length; i++) {
        const child = element.childNodes[i];
        
        if (child.nodeType === 1) { // ELEMENT_NODE
          const childElement = child as Element;
          const childResult = processElement(childElement, islandId);
          
          if (childResult) {
            // This is a component - add to children array
            children.push(childResult);
          }
          // For non-component elements, we ignore them in the island structure
          // since they'll be preserved in the static HTML
        }
      }
      
      const island = {
        id: islandId,
        component: properComponentName,
        props,
        children, // Direct child islands (matching production structure)
        parentId: parentId || undefined
        // placeholder will be added later in the compilation process
      };
      
      // Add island to array immediately to maintain correct parent-child relationships
      islands.push(island);
      return island;
    }
    
    // Process children even if this element isn't a component
    for (let i = 0; i < element.childNodes.length; i++) {
      const child = element.childNodes[i];
      if (child.nodeType === 1) { // ELEMENT_NODE
        processElement(child as Element, parentId);
      }
    }
    
    return null;
  }
  
  // Process all elements in the parsed document
  processElement(doc.documentElement);
  
  return islands;
}

// Fallback regex parser
function parseTemplateWithRegex(templateContent: string, validComponents: string[]) {
  const componentPattern = validComponents.map(name => name.toLowerCase()).join('|');
  const componentRegex = new RegExp(`<(${componentPattern})(?:\\s[^>]*)?(?:\\s*\\/>|>[\\s\\S]*?<\\/\\1>)`, 'gi');
  
  const componentMatches = templateContent.match(componentRegex) || [];
  
  return componentMatches.map((match, index) => {
    let componentName = match.match(/<(\w+)/i)?.[1] || 'Unknown';
    
    // Convert to proper case
    componentName = validComponents.find(valid => 
      valid.toLowerCase() === componentName.toLowerCase()
    ) || componentName;
    
    // Extract props from the tag
    const propsMatch = match.match(/<\w+\s+([^>]+)>/);
    const props: any = {};
    if (propsMatch && propsMatch[1]) {
      const attrMatches = propsMatch[1].match(/(\w+)=["']([^"']+)["']/g) || [];
      attrMatches.forEach(attr => {
        const [key, value] = attr.split('=');
        props[key] = value.replace(/["']/g, '');
      });
    }

    return {
      id: `mock-island-${index}`,
      component: componentName,
      props,
      children: []
      // placeholder will be added later in the compilation process
    };
  });
}

interface TemplatePreviewProps {
  user: User & { 
    profile?: any;
    handles?: any[];
  };
  template: string;
  customCSS: string;
  cssMode: string;
  renderMode: 'islands';
  residentData: ResidentData;
  onCompile?: (compiled: CompiledTemplate | null) => void;
  onError?: (error: string) => void;
  siteWideCSS?: string;
  useStandardLayout?: boolean;
  showNavigation?: boolean;
  siteConfig?: any;
}

export default function TemplatePreview({
  user,
  template,
  customCSS,
  cssMode,
  renderMode,
  residentData,
  onCompile,
  onError,
  siteWideCSS,
  useStandardLayout = false,
  showNavigation = false,
  siteConfig
}: TemplatePreviewProps) {
  const [compiledTemplate, setCompiledTemplate] = useState<CompiledTemplate | null>(null);
  const [isCompiling, setIsCompiling] = useState(false);
  const [compilationError, setCompilationError] = useState<string | null>(null);


  // Stable references for callbacks to prevent unnecessary re-renders
  const stableOnCompile = useCallback((compiled: CompiledTemplate | null) => {
    onCompile?.(compiled);
  }, [onCompile]);

  const stableOnError = useCallback((error: string) => {
    onError?.(error);
  }, [onError]);

  // Debounced compilation function with stable dependencies
  const compileTemplate = useCallback(
    debounce(async (templateContent: string, currentRenderMode: string, currentUserId: string, currentCustomCSS: string) => {
      if (!templateContent.trim()) {
        setCompiledTemplate(null);
        stableOnCompile(null);
        return;
      }

      if (currentRenderMode === 'islands') {
        setIsCompiling(true);
        setCompilationError(null);
        
        try {
          // For test users and template editor, use mock compilation instead of API
          if (currentUserId === 'test-user-123' || user.primaryHandle === 'testuser' || user.primaryHandle?.includes('@')) {
            
            // Parse template with nested component structure
            const mockIslands = parseNestedTemplate(templateContent);

            // Generate proper static HTML with placeholders like production
            let staticHTML = templateContent;
            
            // Create placeholder strings for each island (matching production format)
            mockIslands.forEach(island => {
              island.placeholder = `<div data-island="${island.id}" data-component="${island.component}" class="island-placeholder"></div>`;
            });
            
            // Replace components with placeholders (only root-level islands)
            const rootIslands = mockIslands.filter(island => !island.parentId);
            
            for (const island of rootIslands) {
              const componentName = island.component.toLowerCase();
              
              // Handle self-closing tags first
              const selfClosingRegex = new RegExp(`<${componentName}\\b([^>]*?)\\s*\\/>`, 'i');
              
              // Handle full tags with content  
              const fullTagRegex = new RegExp(`<${componentName}\\b([^>]*)>([\\s\\S]*?)<\\/${componentName}>`, 'i');
              
              // Replace with placeholder (preserve inner content for full tags)
              staticHTML = staticHTML.replace(selfClosingRegex, island.placeholder);
              staticHTML = staticHTML.replace(fullTagRegex, (match, attrs, innerContent) => {
                // For containers like CenteredBox, preserve the inner content
                return island.placeholder.replace('></div>', `>${innerContent}</div>`);
              });
            }

            const mockCompiled: CompiledTemplate = {
              mode: 'advanced',
              staticHTML, // Empty for islands-only, populated for mixed content
              islands: mockIslands,
              fallback: undefined,
              compiledAt: new Date(),
              errors: [],
              warnings: []
            };

            setCompiledTemplate(mockCompiled);
            stableOnCompile(mockCompiled);
            
            // Small delay to simulate compilation
            await new Promise(resolve => setTimeout(resolve, 300));
            setIsCompiling(false);
            return;
          }

          // For real users, call the compilation API
          const response = await fetch('/api/templates/compile-profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: currentUserId,
              mode: 'advanced',
              customTemplate: templateContent,
              customCSS: currentCustomCSS,
              force: true // Always recompile in preview
            })
          });

          if (!response.ok) {
            throw new Error(`Compilation failed: ${response.statusText}`);
          }

          const result = await response.json();
          
          if (!result.success) {
            throw new Error(result.error || 'Compilation failed');
          }

          setCompiledTemplate(result.compiled);
          stableOnCompile(result.compiled);
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown compilation error';
          console.error('TemplatePreview: Compilation error:', errorMsg);
          setCompilationError(errorMsg);
          stableOnError(errorMsg);
        } finally {
          setIsCompiling(false);
        }
      }
    }, 500),
    [] // Empty dependency array since we're passing values as parameters
  );

  // Compile when template changes
  useEffect(() => {
    compileTemplate(template, renderMode, user.id, customCSS || '');
  }, [template, renderMode, user.id, customCSS, compileTemplate]);

  // Always use Islands mode - legacy mode removed

  // Islands preview
  return (
    <div className="template-preview islands-preview">
      {/* Debug info - removed to clean up preview */}

      {isCompiling && (
        <div className="compilation-status p-2 bg-blue-50 border-b border-blue-200 text-sm text-blue-700">
          🔄 Compiling template...
        </div>
      )}
      
      {compilationError && (
        <div className="compilation-error p-3 bg-red-50 border border-red-200 text-sm text-red-700">
          <strong>Compilation Error:</strong> {compilationError}
          <details className="mt-2">
            <summary className="cursor-pointer">Debug Info</summary>
            <pre className="mt-1 text-xs">{JSON.stringify({ template, compilationError }, null, 2)}</pre>
          </details>
        </div>
      )}

      {compiledTemplate && !compilationError && (
        <IslandsPreview 
          compiledTemplate={compiledTemplate} 
          residentData={residentData}
          customCSS={customCSS}
          cssMode={cssMode}
          siteWideCSS={siteWideCSS}
          useStandardLayout={useStandardLayout}
          showNavigation={showNavigation}
          siteConfig={siteConfig}
        />
      )}

      {!compiledTemplate && !isCompiling && !compilationError && (
        <div className="empty-preview p-8 text-center text-gray-500">
          <p>Enter a template to see the preview</p>
          {process.env.NODE_ENV === 'development' && (
            <details className="mt-4 text-left text-xs">
              <summary className="cursor-pointer">Debug Info</summary>
              <pre className="mt-2 bg-gray-200 p-2 rounded">{JSON.stringify({ template, user: user.id }, null, 2)}</pre>
            </details>
          )}
        </div>
      )}
    </div>
  );
}


// Islands preview component using Shadow DOM isolation
function IslandsPreview({ 
  compiledTemplate, 
  residentData,
  customCSS,
  cssMode,
  siteWideCSS,
  useStandardLayout = false,
  showNavigation = false,
  siteConfig
}: { 
  compiledTemplate: CompiledTemplate; 
  residentData: ResidentData;
  customCSS: string;
  cssMode: string;
  siteWideCSS?: string;
  useStandardLayout?: boolean;
  showNavigation?: boolean;
  siteConfig?: any;
}) {
  const { config } = useSiteConfig();
  
  const shadowHostRef = React.useRef<HTMLDivElement>(null);
  const shadowRootRef = React.useRef<ShadowRoot | null>(null);
  const [shadowReady, setShadowReady] = React.useState(false);
  
  // Create a unique ID for this preview
  const previewId = React.useMemo(() => `preview-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, []);

  // Initialize Shadow DOM
  React.useEffect(() => {
    if (shadowHostRef.current && !shadowRootRef.current) {
      try {
        // Create shadow root with mode 'open' so we can access it
        const shadowRoot = shadowHostRef.current.attachShadow({ mode: 'open' });
        shadowRootRef.current = shadowRoot;
        
        // Create a container div inside the shadow root
        const container = document.createElement('div');
        container.id = 'shadow-content';
        container.className = 'site-layout'; // Apply site-layout class for proper styling
        shadowRoot.appendChild(container);
        
        setShadowReady(true);
      } catch (error) {
        console.error('Failed to create Shadow DOM:', error);
        // Fallback: use regular DOM if Shadow DOM fails
        setShadowReady(true);
      }
    }
  }, []);

  // Parse the static HTML and render islands directly as React components
  const renderIslandsDirectly = () => {
    try {
      const hasIslands = compiledTemplate.islands && compiledTemplate.islands.length > 0;
      const hasStaticHTML = compiledTemplate.staticHTML && compiledTemplate.staticHTML.trim();

      if (!hasIslands && !hasStaticHTML) {
        return <div className="p-4 text-gray-500">No content to render</div>;
      }

      // Handle mixed content (both islands and static HTML) - same as production
      if (hasIslands && hasStaticHTML) {
        return (
          <PreviewStaticHTMLWithIslands 
            staticHTML={compiledTemplate.staticHTML}
            islands={compiledTemplate.islands}
            residentData={residentData}
          />
        );
      }

      // If we only have islands, render them as React components
      if (hasIslands) {
        const rootIslands = compiledTemplate.islands.filter((island: any) => !island.parentId);

        const result = (
          <div className="islands-container">
            {rootIslands.map((island: any) => (
              <ProductionIslandRenderer 
                key={island.id}
                island={island}
                residentData={residentData}
              />
            ))}
          </div>
        );
        
        return result;
      }

      // If we only have static HTML (no islands), render it directly
      if (hasStaticHTML) {
        const result = (
          <div 
            className="static-html-content p-4"
            dangerouslySetInnerHTML={{ __html: compiledTemplate.staticHTML }}
          />
        );
        return result;
      }

      return null;
    } catch (error) {
      console.error('renderIslandsDirectly: Error occurred:', error);
      return (
        <div style={{ color: 'red', border: '1px solid red', padding: '8px' }}>
          <strong>Render Error:</strong> {error instanceof Error ? error.message : String(error)}
          <pre style={{ fontSize: '10px', marginTop: '4px' }}>
            {error instanceof Error ? error.stack : ''}
          </pre>
        </div>
      );
    }
  };

  // Extract actual site CSS from document stylesheets
  const getSiteCSS = React.useCallback(() => {
    let extractedCSS = '';
    
    try {
      // Get all stylesheets from the current document
      const stylesheets = Array.from(document.styleSheets);
      
      for (const sheet of stylesheets) {
        try {
          // Skip external stylesheets that we can't access due to CORS
          if (sheet.href && !sheet.href.startsWith(window.location.origin)) {
            continue;
          }
          
          // Extract CSS rules from the stylesheet
          const rules = Array.from(sheet.cssRules || []);
          for (const rule of rules) {
            extractedCSS += rule.cssText + '\n';
          }
        } catch (e) {
          // Skip stylesheets we can't access (CORS issues)
          continue;
        }
      }
      
    } catch (error) {
      console.warn('Error extracting site CSS:', error);
    }
    
    return extractedCSS;
  }, []);

  // Generate and inject CSS into Shadow DOM - match live ProfileModeRenderer behavior
  const updateShadowCSS = React.useCallback(() => {
    if (!shadowRootRef.current) return;
    
    console.log('🔧 updateShadowCSS called with:', { customCSS, cssMode, useStandardLayout });
    
    // Remove existing style element
    const existingStyle = shadowRootRef.current.querySelector('#shadow-styles');
    if (existingStyle) {
      existingStyle.remove();
    }
    
    // Match live ProfileModeRenderer logic:
    // Advanced templates are determined by useStandardLayout flag
    // Standard layout (useStandardLayout=true) always uses CSS layers with comprehensive utilities
    // Advanced templates (useStandardLayout=false) get minimal base styles + user CSS
    const isAdvancedTemplate = !useStandardLayout;
    
    let finalCSS = '';
    
    if (isAdvancedTemplate) {
      // Advanced template mode: ONLY USER CSS - match ProfileModeRenderer behavior
      const cleanUserCSS = customCSS 
        ? customCSS
            .replace(/\/\* CSS_MODE:\w+ \*\/\n?/g, '') // Remove mode comments
            // Don't remove !important - let user keep control
        : '';
      
      // Add the same CSS reset that ProfileModeRenderer uses for advanced templates
      finalCSS = `
        /* Complete CSS reset for advanced templates - user has total control */
        #shadow-content {
          /* Reset all Tailwind utilities to prevent inheritance */
          --tw-gradient-from: initial;
          --tw-gradient-to: initial;
          --tw-gradient-via: initial;
          --tw-gradient-position: initial;
        }
        
        /* Reset ALL Tailwind gradient classes within advanced templates */
        #shadow-content [class*="bg-gradient"] {
          background-image: none !important;
          --tw-gradient-from: initial !important;
          --tw-gradient-to: initial !important;
          --tw-gradient-via: initial !important;
          --tw-gradient-position: initial !important;
        }
        
        /* Reset system CSS for ThreadStead components */
        #shadow-content .thread-module {
          all: unset;
          display: block;
          box-sizing: border-box;
        }
        
        #shadow-content .thread-headline {
          all: unset;
          display: block;
          box-sizing: border-box;
        }
        
        #shadow-content .thread-label {
          all: unset;
          display: inline;
          box-sizing: border-box;
        }
        
        #shadow-content .thread-button {
          all: unset;
          display: inline-block;
          box-sizing: border-box;
          cursor: pointer;
        }
        
        #shadow-content .profile-tab-button {
          all: unset;
          display: inline-block;
          box-sizing: border-box;
          cursor: pointer;
        }
        
        #shadow-content .profile-tab-panel {
          all: unset;
          display: block;
          box-sizing: border-box;
        }
        
        #shadow-content .profile-tabs {
          all: unset;
          display: block;
          box-sizing: border-box;
        }
        
        #shadow-content .profile-tab-list {
          all: unset;
          display: flex;
          box-sizing: border-box;
        }
        
        /* Provide default component styling that user can override */
        #shadow-content .thread-module {
          background: #FCFAF7;
          border: 1px solid #A18463;
          border-radius: 8px;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
        }
        
        #shadow-content .thread-headline {
          font-family: Georgia, "Times New Roman", serif;
          color: #2E4B3F;
          font-weight: 600;
          font-size: 1.5rem;
          line-height: 1.4;
          margin-bottom: 1rem;
        }
        
        #shadow-content .thread-label {
          font-size: 0.75rem;
          font-weight: 600;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          color: #A18463;
        }
        
        #shadow-content .profile-tab-button {
          padding: 0.75rem 1rem;
          background: #FCFAF7;
          color: #A18463;
          border: none;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        #shadow-content .profile-tab-button.active {
          background: #F5E9D4;
          color: #2E4B3F;
          font-weight: 500;
        }
        
        #shadow-content .profile-tab-panel {
          padding: 1.5rem;
        }
        
        #shadow-content .profile-tab-list {
          border-bottom: 1px solid rgba(161, 132, 99, 0.3);
        }
        
        /* USER CSS WITH NUCLEAR DOMINANCE - MUST ALWAYS WIN */
        ${(() => {
          if (cleanUserCSS) {
            console.log('\ud83d\udd25 Advanced Template: Processing custom CSS:', cleanUserCSS);
            const nuclear = forceUserCSSDominance(cleanUserCSS);
            console.log('\ud83d\udca5 Advanced Nuclear CSS result:', nuclear);
            return nuclear;
          }
          return '';
        })()}
      `;
    } else {
      // Standard/enhanced templates: Don't use CSS layers in Shadow DOM (they don't work properly)
      // Just provide base utility styles - user CSS will be added at the end with nuclear dominance
      finalCSS = `
        /* Essential Shadow DOM base styles for Standard Layout */
        #shadow-content {
          width: 100%;
          min-height: 100vh;
          display: block;
          margin: 0;
          padding: 0;
          box-sizing: border-box;
          /* Default thread-surface background - user can override */
          background: linear-gradient(135deg, #faf7f0 0%, #f5e9d4 100%);
        }
        
        /* Islands container visibility */
        .islands-container {
          display: block;
          visibility: visible;
          opacity: 1;
        }
      `;
    }
    
    // Extract body styles and convert to shadow-content styles
    const extractBodyStyles = (css: string) => {
      const bodyStylesRegex = /body\s*\{([^}]+)\}/gi;
      let shadowBodyStyles = '';
      let match;
      
      while ((match = bodyStylesRegex.exec(css)) !== null) {
        const bodyContent = match[1];
        shadowBodyStyles += `#shadow-content { ${bodyContent} }\n`;
      }
      
      return shadowBodyStyles;
    };
    
    // Extract body styles from user CSS for shadow DOM
    const shadowBodyStyles = extractBodyStyles(customCSS);
    
    const styleElement = document.createElement('style');
    styleElement.id = 'shadow-styles';
    
    // Add essential Shadow DOM and template styles FIRST (so they can be overridden)
    if (isAdvancedTemplate) {
      // Minimal styles for advanced templates - let user control everything
      finalCSS = `
        /* Minimal Shadow DOM container */
        #shadow-content {
          width: 100%;
          min-height: 400px;
          display: block;
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        /* Islands container visibility */
        .islands-container {
          display: block;
          visibility: visible;
          opacity: 1;
        }
      ` + finalCSS;
    } else {
      // Full utility styles for standard/enhanced templates
      finalCSS = `
        /* Shadow DOM specific styles */
        #shadow-content {
          width: 100%;
          min-height: 400px;
          display: block;
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        /* Islands container visibility */
        .islands-container {
          display: block;
          visibility: visible;
          opacity: 1;
        }
        
        /* Essential layout utilities */
        .flex { display: flex; }
        .flex-col { flex-direction: column; }
        .items-center { align-items: center; }
        .justify-center { justify-content: center; }
        .text-center { text-align: center; }
        .mb-4 { margin-bottom: 1rem; }
        .gap-4 { gap: 1rem; }
      ` + finalCSS;
    }
    
    // Apply body styles to shadow content
    if (shadowBodyStyles) {
      finalCSS += `\n/* Body styles converted to shadow-content */\n${shadowBodyStyles}\n`;
    }
    
    // Component utilities needed for Islands to work (both template types)
    finalCSS += `
      /* ThreadStead color utility classes */
      .bg-thread-cream { background-color: #F5E9D4; }
      .bg-thread-sage { background-color: #A18463; }
      .bg-thread-pine { background-color: #2E4B3F; }
      .bg-thread-paper { background-color: #FCFAF7; }
      .bg-thread-sunset { background-color: #E8B547; }
      .text-thread-cream { color: #F5E9D4; }
      .text-thread-sage { color: #A18463; }
      .text-thread-pine { color: #2E4B3F; }
      .text-thread-charcoal { color: #2F2F2F; }
      .text-thread-paper { color: #FCFAF7; }
      .text-thread-sunset { color: #E8B547; }
      
      /* ThreadStead color variants for legacy naming */
      .thread-cream { color: #F5E9D4; }
      .thread-sage { color: #A18463; }
      .thread-pine { color: #2E4B3F; }
      .thread-charcoal { color: #2F2F2F; }
      .thread-paper { color: #FCFAF7; }
      .thread-sunset { color: #E8B547; }
      
      /* ThreadStead background hover and opacity variants */
      .hover\\:bg-thread-cream:hover { background-color: #F5E9D4; }
      .hover\\:bg-thread-cream\\/50:hover { background-color: rgba(245, 233, 212, 0.5); }
      .hover\\:bg-thread-sunset\\/20:hover { background-color: rgba(232, 181, 71, 0.2); }
      .thread-sage\\/20 { background-color: rgba(161, 132, 99, 0.2); }
      .thread-sage\\/30 { background-color: rgba(161, 132, 99, 0.3); }
      .bg-thread-cream\\/50 { background-color: rgba(245, 233, 212, 0.5); }
      
      /* Profile component specific classes */
      .profile-photo-wrapper { display: flex; flex-direction: column; align-items: center; }
      .profile-photo-frame { border: 4px solid #000; box-shadow: 4px 4px 0 #000; background: #fff; padding: 4px; }
      .profile-photo-placeholder { background: #fef08a; color: #000; display: flex; align-items: center; justify-content: center; }
      
      /* Guestbook component classes */
      .guestbook-section { background: #FCFAF7; border: 1px solid #A18463; border-radius: 8px; padding: 1rem; }
      .guestbook-entry { background: rgba(255, 255, 255, 0.8); border-radius: 6px; padding: 0.75rem; margin-bottom: 0.75rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
      
      /* Friend and website display classes */
      .featured-friends, .websites-section { border: 1px solid #000; padding: 0.75rem; background: #fff; box-shadow: 2px 2px 0 #000; }
      .section-heading { font-weight: bold; margin-bottom: 0.5rem; }
      .friend-card, .website-item { border: 1px solid #d1d5db; background: #f9fafb; padding: 0.5rem; border-radius: 4px; }
      .friend-card:hover, .website-item:hover { background: #fef3c7; }
      
      /* Profile tabs styling */
      .profile-tabs { padding: 0; overflow: hidden; }
      .profile-tab-list { display: flex; border-bottom: 1px solid rgba(161, 132, 99, 0.3); }
      .profile-tab-button { padding: 0.75rem 1rem; text-align: center; border-right: 1px solid rgba(161, 132, 99, 0.2); cursor: pointer; transition: all 0.2s; }
      .profile-tab-button.active { background: #F5E9D4; font-weight: 500; color: #2E4B3F; }
      .profile-tab-button:hover { background: rgba(245, 233, 212, 0.5); color: #2E4B3F; }
      .profile-tab-panel { padding: 1.5rem; }
      
      /* Media grid specific styles */
      .media-grid { background: #FCFAF7; border-radius: 8px; padding: 1rem; }
      .media-gallery { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; }
      .media-item { border: 1px solid #A18463; background: #FCFAF7; aspect-ratio: 1; overflow: hidden; border-radius: 4px; position: relative; }
      .media-item:hover { transform: scale(1.02); transition: transform 0.2s; }
      
      /* Profile badges styling */
      .profile-badges { background: #FCFAF7; border-radius: 8px; padding: 1rem; }
      
      /* Handwriting font for special components */
      .font-handwriting { font-family: 'Comic Sans MS', cursive, sans-serif; }
      .border-thread-sage { border-color: #A18463; }
      .border-thread-sage\/30 { border-color: rgba(161, 132, 99, 0.3); }
      .border-thread-sage\/20 { border-color: rgba(161, 132, 99, 0.2); }
      
      /* Border utilities */
      .border { border-width: 1px; }
      .border-b { border-bottom-width: 1px; }
      .border-r { border-right-width: 1px; }
      
      /* Padding utilities used by components */
      .p-0 { padding: 0; }
      .p-2 { padding: 0.5rem; }
      .p-4 { padding: 1rem; }
      .p-5 { padding: 1.25rem; }
      .p-6 { padding: 1.5rem; }
      .p-8 { padding: 2rem; }
      .p-12 { padding: 3rem; }
      .px-3 { padding-left: 0.75rem; padding-right: 0.75rem; }
      .px-4 { padding-left: 1rem; padding-right: 1rem; }
      .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
      .py-3 { padding-top: 0.75rem; padding-bottom: 0.75rem; }
      
      /* Max-width utilities for CenteredBox */
      .max-w-sm { max-width: 24rem; }
      .max-w-md { max-width: 28rem; }
      .max-w-lg { max-width: 32rem; }
      .max-w-xl { max-width: 36rem; }
      .max-w-2xl { max-width: 42rem; }
      .max-w-full { max-width: 100%; }
      
      /* Layout utilities */
      .mx-auto { margin-left: auto; margin-right: auto; }
      
      /* Flexbox utilities */
      .flex { display: flex; }
      .items-center { align-items: center; }
      .justify-between { justify-content: space-between; }
      .w-full { width: 100%; }
      
      /* Spacing utilities */
      .gap-2 { gap: 0.5rem; }
      .gap-3 { gap: 0.75rem; }
      .space-y-3 > * + * { margin-top: 0.75rem; }
      .space-y-4 > * + * { margin-top: 1rem; }
      
      /* Margin utilities */
      .mb-2 { margin-bottom: 0.5rem; }
      .mb-3 { margin-bottom: 0.75rem; }
      .mb-4 { margin-bottom: 1rem; }
      .mb-6 { margin-bottom: 1.5rem; }
      .mt-4 { margin-top: 1rem; }
      
      /* Typography utilities */
      .text-3xl { font-size: 1.875rem; }
      .text-2xl { font-size: 1.5rem; }
      .text-xl { font-size: 1.25rem; }
      .text-lg { font-size: 1.125rem; }
      .text-base { font-size: 1rem; }
      .text-sm { font-size: 0.875rem; }
      .text-xs { font-size: 0.75rem; }
      .text-6xl { font-size: 4rem; }
      .font-bold { font-weight: 700; }
      .font-semibold { font-weight: 600; }
      .font-medium { font-weight: 500; }
      .italic { font-style: italic; }
      .opacity-70 { opacity: 0.7; }
      .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
      .truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .leading-relaxed { line-height: 1.625; }
      
      /* Background and border utilities */
      .bg-white { background-color: #ffffff; }
      .bg-gray-50 { background-color: #f9fafb; }
      .bg-gray-100 { background-color: #f3f4f6; }
      .bg-gray-200 { background-color: #e5e7eb; }
      .bg-red-50 { background-color: #fef2f2; }
      .bg-yellow-200 { background-color: #fde047; }
      .bg-pink-200 { background-color: #fbcfe8; }
      .bg-blue-200 { background-color: #bfdbfe; }
      .bg-green-200 { background-color: #bbf7d0; }
      .bg-orange-200 { background-color: #fed7aa; }
      .bg-purple-200 { background-color: #e9d5ff; }
      .hover\\:bg-gray-100:hover { background-color: #f3f4f6; }
      .hover\\:bg-yellow-100:hover { background-color: #fef3c7; }
      .border { border-width: 1px; }
      .border-2 { border-width: 2px; }
      .border-4 { border-width: 4px; }
      .border-black { border-color: #000000; }
      .border-gray-200 { border-color: #e5e7eb; }
      .border-gray-300 { border-color: #d1d5db; }
      .border-yellow-300 { border-color: #fde047; }
      .border-pink-300 { border-color: #f9a8d4; }
      .border-blue-300 { border-color: #93c5fd; }
      .border-green-300 { border-color: #86efac; }
      .border-orange-300 { border-color: #fdba74; }
      .border-purple-300 { border-color: #d8b4fe; }
      .border-red-200 { border-color: #fecaca; }
      .border-t { border-top-width: 1px; }
      .border-b { border-bottom-width: 1px; }
      .border-l-4 { border-left-width: 4px; }
      .border-dashed { border-style: dashed; }
      .rounded { border-radius: 0.25rem; }
      .rounded-lg { border-radius: 0.5rem; }
      .rounded-full { border-radius: 9999px; }
      .rounded-sm { border-radius: 0.125rem; }
      
      /* Positioning utilities */
      .relative { position: relative; }
      .absolute { position: absolute; }
      .fixed { position: fixed; }
      .inset-0 { top: 0; right: 0; bottom: 0; left: 0; }
      .-top-1 { top: -0.25rem; }
      .left-1\\/2 { left: 50%; }
      .transform { transform: var(--tw-transform); }
      .-translate-x-1\\/2 { --tw-translate-x: -50%; transform: translateX(var(--tw-translate-x)); }
      .z-10 { z-index: 10; }
      .z-50 { z-index: 50; }
      
      /* Sizing utilities */
      .w-3 { width: 0.75rem; }
      .w-8 { width: 2rem; }
      .w-10 { width: 2.5rem; }
      .w-16 { width: 4rem; }
      .w-32 { width: 8rem; }
      .w-48 { width: 12rem; }
      .w-64 { width: 16rem; }
      .w-80 { width: 20rem; }
      .w-full { width: 100%; }
      .h-3 { height: 0.75rem; }
      .h-4 { height: 1rem; }
      .h-8 { height: 2rem; }
      .h-10 { height: 2.5rem; }
      .h-16 { height: 4rem; }
      .h-32 { height: 8rem; }
      .h-48 { height: 12rem; }
      .h-64 { height: 16rem; }
      .h-full { height: 100%; }
      .min-w-0 { min-width: 0; }
      .min-w-fit { min-width: fit-content; }
      .flex-1 { flex: 1 1 0%; }
      .flex-shrink-0 { flex-shrink: 0; }
      
      /* Grid utilities */
      .grid { display: grid; }
      .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
      .aspect-square { aspect-ratio: 1 / 1; }
      
      /* Background utilities - missing colors */
      .bg-black { background-color: #000000; }
      .bg-transparent { background-color: transparent; }
      .bg-red-500 { background-color: #ef4444; }
      .bg-yellow-500 { background-color: #eab308; }
      .bg-green-500 { background-color: #22c55e; }
      .bg-blue-400 { background-color: #60a5fa; }
      .bg-opacity-70 { background-color: rgba(255, 255, 255, 0.7); }
      
      /* Text color utilities */
      .text-white { color: #ffffff; }
      .text-black { color: #000000; }
      .text-gray-500 { color: #6b7280; }
      .text-gray-600 { color: #4b5563; }
      .text-gray-700 { color: #374151; }
      .text-blue-600 { color: #2563eb; }
      .text-blue-800 { color: #1e40af; }
      .text-red-700 { color: #b91c1c; }
      
      /* Hover text utilities */
      .hover\\:text-blue-800:hover { color: #1e40af; }
      .hover\\:underline:hover { text-decoration: underline; }
      .hover\\:text-thread-pine:hover { color: #2E4B3F; }
      .no-underline { text-decoration: none; }
      
      /* Advanced layout utilities */
      .space-y-6 > * + * { margin-top: 1.5rem; }
      .justify-center { justify-content: center; }
      .items-start { align-items: flex-start; }
      .items-end { align-items: flex-end; }
      .flex-wrap { flex-wrap: wrap; }
      .flex-col { flex-direction: column; }
      .inline-flex { display: inline-flex; }
      .inline-block { display: inline-block; }
      .block { display: block; }
      .cursor-pointer { cursor: pointer; }
      .cursor-default { cursor: default; }
      .pointer-events-none { pointer-events: none; }
      .pointer-events-auto { pointer-events: auto; }
      
      /* Transition and transform utilities */
      .transition-all { transition: all 0.15s ease-in-out; }
      .transition-colors { transition-property: color, background-color, border-color; transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); transition-duration: 150ms; }
      .transition-transform { transition-property: transform; transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); transition-duration: 150ms; }
      .transition-opacity { transition-property: opacity; transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); transition-duration: 150ms; }
      .duration-200 { transition-duration: 200ms; }
      .hover\\:scale-105:hover { transform: scale(1.05); }
      .group:hover .group-hover\\:scale-105 { transform: scale(1.05); }
      .group:hover .group-hover\\:opacity-100 { opacity: 1; }
      .opacity-0 { opacity: 0; }
      
      /* Focus and state utilities */
      .focus\\:outline-none:focus { outline: 0; }
      .focus\\:border-thread-pine:focus { border-color: #2E4B3F; }
      .focus\\:ring-1:focus { box-shadow: 0 0 0 1px rgba(46, 75, 63, 0.5); }
      .focus\\:ring-thread-pine:focus { --tw-ring-color: rgba(46, 75, 63, 0.5); }
      .disabled\\:opacity-50:disabled { opacity: 0.5; }
      .disabled\\:cursor-not-allowed:disabled { cursor: not-allowed; }
      
      /* Shadow utilities */
      .shadow-sm { box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); }
      .shadow-md { box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); }
      .shadow-lg { box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05); }
      
      /* Overflow and display utilities */
      .overflow-auto { overflow: auto; }
      .text-center { text-align: center; }
      .resize-none { resize: none; }
      
      /* Custom shadow utilities used by PostItem and other components */
      .shadow-\\[2px_2px_0_\\#000\\] { box-shadow: 2px 2px 0 #000; }
      .shadow-\\[1px_1px_0_\\#000\\] { box-shadow: 1px 1px 0 #000; }
      .shadow-\\[4px_4px_0_\\#000\\] { box-shadow: 4px 4px 0 #000; }
      
      /* ThreadStead shadow classes */
      .shadow-cozy { box-shadow: 3px 3px 0 #A18463; }
      .shadow-cozySm { box-shadow: 2px 2px 0 #A18463; }
      
      /* ThreadStead border radius */
      .rounded-cozy { border-radius: 8px; }
      
      /* Display utilities */
      .overflow-hidden { overflow: hidden; }
      .overflow-x-auto { overflow-x: auto; }
      .overflow-y-hidden { overflow-y: hidden; }
      
      /* Typography utilities */
      .text-sm { font-size: 0.875rem; line-height: 1.25rem; }
      .text-base { font-size: 1rem; line-height: 1.5rem; }
      .text-lg { font-size: 1.125rem; line-height: 1.75rem; }
      .text-xl { font-size: 1.25rem; line-height: 1.75rem; }
      .font-bold { font-weight: 700; }
      .font-medium { font-weight: 500; }
      
      /* Essential ThreadStead component classes */
      .thread-module {
        background: #FCFAF7;
        border: 1px solid #A18463;
        border-radius: 8px;
        box-shadow: 3px 3px 0 #A18463;
        position: relative;
        min-width: 900px;
        width: 100%;
        max-width: 1100px;
      }
      
      .thread-headline {
        font-family: Georgia, "Times New Roman", serif;
        color: #2E4B3F;
        font-weight: 600;
        letter-spacing: -0.02em;
      }
      
      .thread-label {
        font-size: 0.75rem;
        font-weight: 600;
        letter-spacing: 0.5px;
        text-transform: uppercase;
        color: #A18463;
      }
      
      .thread-button {
        background: #2E4B3F;
        border: 2px solid #A18463;
        color: #FCFAF7;
        padding: 0.5rem 1rem;
        border-radius: 4px;
        box-shadow: 2px 2px 0 #A18463;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      
      .thread-button:hover {
        background: #3A5F51;
        transform: translate(-1px, -1px);
        box-shadow: 3px 3px 0 #A18463;
      }
      
      /* Blog post component styles - matches PostItem styling */
      .blog-post-card {
        background: #ffffff;
        border: 1px solid #000000;
        padding: 0.75rem;
        box-shadow: 2px 2px 0 #000000;
        margin-bottom: 0.75rem;
      }
      
      .blog-post-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
        margin-bottom: 0.5rem;
      }
      
      .blog-post-date {
        font-size: 0.75rem;
        opacity: 0.7;
      }
      
      .blog-post-actions {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      
      .blog-post-content {
        margin-bottom: 1rem;
      }
      
      /* Blog post action buttons */
      .blog-post-card button {
        border: 1px solid #000000;
        padding: 0.25rem 0.5rem;
        background: #ffffff;
        box-shadow: 1px 1px 0 #000000;
        font-size: 0.75rem;
        cursor: pointer;
      }
      
      .blog-post-card button:hover {
        background: #f3f4f6;
      }
      
      /* Comments section styling */
      .blog-post-card section {
        margin-top: 1rem;
        border-top: 1px solid #000000;
        padding-top: 0.75rem;
      }
      
      .blog-post-card section button {
        display: flex;
        width: 100%;
        align-items: center;
        justify-content: space-between;
        border-radius: 0.25rem;
        padding: 0.25rem 0.5rem;
        border: 1px solid #000000;
        background: #ffffff;
        box-shadow: 2px 2px 0 #000000;
        font-size: 0.875rem;
      }
      
      .blog-post-card section button:hover {
        background: #fef3c7;
      }

      /* Profile tabs styles */
      .profile-tabs {
        padding: 0;
      }
      
      .profile-tab-list {
        display: flex;
        border-bottom: 1px solid rgba(161, 132, 99, 0.3);
        overflow-x: auto;
        overflow-y: hidden;
      }
      
      .profile-tab-button {
        padding: 0.75rem 1rem;
        text-align: center;
        border-right: 1px solid rgba(161, 132, 99, 0.2);
        background: #FCFAF7;
        color: #A18463;
        cursor: pointer;
        transition: all 0.2s ease;
        min-width: fit-content;
        border: none;
        font-size: 0.875rem;
      }
      
      .profile-tab-button:hover {
        background: rgba(252, 250, 247, 0.5);
        color: #2E4B3F;
      }
      
      .profile-tab-button.active {
        background: #F5E9D4;
        color: #2E4B3F;
        font-weight: 500;
      }
      
      .profile-tab-panel {
        padding: 1.5rem;
      }
      
      /* ProfilePhoto utilities */
      .profile-photo-image.w-8 { width: 2rem; }
      .profile-photo-image.h-8 { height: 2rem; }
      .profile-photo-image.w-16 { width: 4rem; }
      .profile-photo-image.h-16 { height: 4rem; }
      .profile-photo-image.w-32 { width: 8rem; }
      .profile-photo-image.h-32 { height: 8rem; }
      .profile-photo-image.object-cover { object-fit: cover; }
      .profile-photo-image.rounded-full { border-radius: 9999px; }
      
      /* Template layout classes */
      .retro-split-layout {
        display: flex;
        gap: 1rem;
        margin-bottom: 2rem;
        flex-wrap: wrap;
      }
      .retro-split-left {
        flex: 30%;
        min-width: 200px;
        text-align: center;
      }
      .retro-split-right {
        flex: 70%;
        min-width: 300px;
      }
      
      /* Vintage/Neocities template specific styles */
      .vintage-header {
        background: linear-gradient(45deg, #ff6b6b, #feca57);
        border: 3px solid #333;
        padding: 10px;
        text-align: center;
        font-family: 'Comic Sans MS', cursive;
        box-shadow: 5px 5px 15px rgba(0,0,0,0.3);
      }
      
      .neocities-container {
        background: #f0f8ff;
        border: 2px dashed #4169e1;
        padding: 15px;
        margin: 10px 0;
        font-family: monospace;
      }
      
      .classic-button {
        background: linear-gradient(to bottom, #f0f0f0, #d0d0d0);
        border: 2px outset #d0d0d0;
        padding: 5px 15px;
        font-family: sans-serif;
        cursor: pointer;
      }
      
      .classic-button:hover {
        background: linear-gradient(to bottom, #e0e0e0, #c0c0c0);
      }
    `;
    
    // Add comprehensive site layout styles for Standard Layout
    if (useStandardLayout) {
      finalCSS += `
        /* Site Header and Navigation Styles - Essential for Standard Layout */
        .site-header {
          background-color: #F5E9D4;
          border-bottom: 1px solid #A18463;
          padding: 1rem 1rem;
          position: sticky;
          top: 0;
          z-index: 9999;
          backdrop-filter: blur(4px);
          background-color: rgba(245, 233, 212, 0.95);
        }
        
        .site-navigation {
          margin: 0 auto;
          max-width: 80rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        
        .site-branding {
          flex-shrink: 0;
        }
        
        .site-title {
          font-family: Georgia, "Times New Roman", serif;
          color: #2E4B3F;
          font-weight: 700;
          font-size: 1.25rem;
          margin: 0;
        }
        
        @media (min-width: 640px) {
          .site-title {
            font-size: 1.5rem;
          }
        }
        
        .site-tagline {
          font-size: 0.75rem;
          font-weight: 600;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          color: #A18463;
          display: none;
        }
        
        @media (min-width: 640px) {
          .site-tagline {
            display: inline;
          }
        }
        
        .site-nav-container {
          display: none;
        }
        
        @media (min-width: 1024px) {
          .site-nav-container {
            display: flex;
            align-items: center;
            gap: 2rem;
          }
        }
        
        .site-nav-links {
          display: flex;
          align-items: center;
          gap: 1.5rem;
        }
        
        .nav-link {
          color: #2E4B3F;
          font-weight: 500;
          text-decoration: underline;
          transition: all 0.2s ease;
        }
        
        .nav-link:hover {
          color: #E8B547;
          text-decoration: none;
        }
        
        .site-auth {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        
        .site-auth > div {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
          color: #A18463;
        }
        
        .site-auth span {
          display: none;
        }
        
        @media (min-width: 640px) {
          .site-auth span {
            display: inline;
          }
        }
        
        .site-auth > div > div {
          width: 2rem;
          height: 2rem;
          background-color: #A18463;
          border-radius: 9999px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .site-auth span:last-child {
          color: white;
          font-size: 0.75rem;
        }
        
        /* Mobile menu button */
        .lg\\:hidden {
          display: block;
        }
        
        @media (min-width: 1024px) {
          .lg\\:hidden {
            display: none;
          }
        }
        
        .lg\\:hidden button {
          padding: 0.5rem;
          color: #2E4B3F;
          transition: color 0.2s ease;
        }
        
        .lg\\:hidden button:hover {
          color: #E8B547;
        }
        
        .lg\\:hidden svg {
          width: 1.5rem;
          height: 1.5rem;
        }
        
        /* Site Footer Styles */
        .site-footer {
          border-top: 1px solid #A18463;
          background-color: #F5E9D4;
          padding: 1rem 1.5rem;
          margin-top: auto;
        }
        
        .footer-content {
          margin: 0 auto;
          max-width: 80rem;
          text-align: center;
        }
        
        .footer-tagline {
          font-size: 0.75rem;
          font-weight: 600;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          color: #A18463;
        }
        
        .footer-copyright {
          font-size: 0.875rem;
          color: #A18463;
          margin-top: 0.25rem;
        }
        
        /* Standard Layout Wrapper */
        .standard-layout-wrapper {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }
        
        .template-content-preview {
          margin: 0 auto;
          max-width: 80rem;
          padding: 2rem 1.5rem;
          flex: 1;
        }
        
        /* Additional responsive utilities for navigation */
        .hidden {
          display: none;
        }
        
        .sm\\:inline {
          display: none;
        }
        
        @media (min-width: 640px) {
          .sm\\:inline {
            display: inline;
          }
        }
        
        .lg\\:flex {
          display: none;
        }
        
        @media (min-width: 1024px) {
          .lg\\:flex {
            display: flex;
          }
        }
        
        /* Ensure proper stacking and positioning */
        .relative {
          position: relative;
        }
        
        .sticky {
          position: sticky;
        }
        
        .top-0 {
          top: 0;
        }
        
        .z-\\[9999\\] {
          z-index: 9999;
        }
        
        .backdrop-blur-sm {
          backdrop-filter: blur(4px);
        }
        
        .bg-thread-cream\\/95 {
          background-color: rgba(245, 233, 212, 0.95);
        }
      `;
    }
    
    // For standard layout templates, we need to add nuclear-ized user CSS after all the navigation styles
    // so it can override the header/footer styling we just added
    if (useStandardLayout && customCSS) {
      console.log('\ud83d\udd25 Standard Layout: Processing custom CSS:', customCSS);
      // SIMPLE BUT EFFECTIVE: Just add !important to everything - keep CSS intact
      const nuclearUserCSS = customCSS.replace(/([^;{]+):\s*([^;!]+)(?!.*!important)\s*;/g, '$1: $2 !important;');
      console.log('\ud83d\udca5 Nuclear CSS result:', nuclearUserCSS);
      finalCSS += `\n\n/* USER CUSTOM CSS WITH NUCLEAR DOMINANCE - HIGHEST PRIORITY */\n${nuclearUserCSS}\n`;
      console.log('\ud83d\udca5 Nuclear CSS added to finalCSS, total length:', finalCSS.length);
    }
    
    console.log('\ud83c\udfaf Final CSS being injected into Shadow DOM:', finalCSS);
    styleElement.textContent = finalCSS;
    shadowRootRef.current.insertBefore(styleElement, shadowRootRef.current.firstChild);
    console.log('\u2705 CSS injected into Shadow DOM successfully');
    
    // CRITICAL DEBUG: Check what's actually in the Shadow DOM
    const shadowStyles = shadowRootRef.current.querySelector('#shadow-styles');
    console.log('\ud83d\udd0d Shadow DOM style element:', shadowStyles);
    console.log('\ud83d\udd0d Actual CSS in Shadow DOM:', shadowStyles?.textContent?.substring(0, 500));
    console.log('\ud83d\udd0d Shadow DOM children:', Array.from(shadowRootRef.current.children));
  }, [customCSS, cssMode, siteWideCSS, useStandardLayout]);

  // Update shadow DOM styles when CSS or mode changes
  React.useEffect(() => {
    if (shadowReady) {
      updateShadowCSS();
    }
  }, [shadowReady, updateShadowCSS, cssMode]);

  return (
    <div className="islands-preview-wrapper">
      <div className="islands-status-bar p-2 bg-gray-50 border-b text-xs text-gray-600 flex justify-between">
        <span>🏝️ Islands Mode (Shadow DOM Isolated)</span>
        <span>
          {compiledTemplate.islands?.length || 0} interactive components
        </span>
      </div>

      {/* Shadow DOM host for CSS isolation */}
      <div
        ref={shadowHostRef}
        style={{
          width: '100%',
          minHeight: '400px',
          border: '1px solid #e5e7eb',
          borderRadius: '4px',
          background: 'transparent'
        }}
      />
      
      {!shadowReady && (
        <div className="shadow-loading p-4 text-center text-gray-500">
          Initializing shadow DOM...
        </div>
      )}
      
      {/* React portal into Shadow DOM */}
      {shadowReady && shadowRootRef.current && (
        <ShadowPortal shadowRoot={shadowRootRef.current}>
          <React.Suspense fallback={<div className="p-4">Loading islands...</div>}>
            <ErrorBoundary>
              {/* For Standard Layout, render header/footer inside Shadow DOM so user CSS can affect them */}
              {useStandardLayout ? (
                <div className="standard-layout-wrapper min-h-screen flex flex-col">
                  {showNavigation && siteConfig && <PreviewNavBar siteConfig={siteConfig} />}
                  <div className="template-content-preview mx-auto max-w-5xl px-6 py-8 flex-1">
                    {renderIslandsDirectly()}
                  </div>
                  {showNavigation && siteConfig && <PreviewFooter siteConfig={siteConfig} />}
                </div>
              ) : (
                // Advanced templates render content directly
                renderIslandsDirectly()
              )}
            </ErrorBoundary>
          </React.Suspense>
        </ShadowPortal>
      )}
    </div>
  );
}

// Shadow DOM Portal component
function ShadowPortal({ children, shadowRoot }: { children: React.ReactNode, shadowRoot: ShadowRoot }) {
  const [mountNode, setMountNode] = React.useState<HTMLElement | null>(null);

  React.useEffect(() => {
    // Find or create the mount point in shadow DOM
    let container = shadowRoot.querySelector('#shadow-content') as HTMLElement;
    if (!container) {
      container = document.createElement('div');
      container.id = 'shadow-content';
      container.className = 'site-layout'; // Apply site-layout class for proper styling
      shadowRoot.appendChild(container);
    }
    setMountNode(container);
  }, [shadowRoot]);

  if (!mountNode) return null;

  // Use React portal to render into shadow DOM
  return createPortal(children, mountNode);
}

// Error boundary component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Islands rendering error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-fallback p-4 bg-red-50 border border-red-200 text-red-700">
          <h3 className="font-bold mb-2">Islands Rendering Error</h3>
          <p className="text-sm mb-2">Something went wrong while rendering the islands.</p>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details className="text-xs">
              <summary className="cursor-pointer">Error Details</summary>
              <pre className="mt-2 bg-red-100 p-2 rounded overflow-auto">
                {this.state.error.stack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

// Preview version of StaticHTMLWithIslands - handles mixed static HTML + islands
interface PreviewStaticHTMLWithIslandsProps {
  staticHTML: string;
  islands: any[];
  residentData: ResidentData;
}

export function PreviewStaticHTMLWithIslands({ 
  staticHTML, 
  islands, 
  residentData 
}: PreviewStaticHTMLWithIslandsProps) {
  // Create a map of island ID to island data for quick lookup
  // Include all islands, not just root islands, for proper lookups
  const islandMap = new Map(islands.map(island => [island.id, island]));
  
  // Parse static HTML and replace placeholders with React components
  const renderHTMLWithIslands = () => {
    // Create a temporary div to parse the HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = staticHTML;
    
    // Find all island placeholders
    const placeholders = tempDiv.querySelectorAll('[data-island]');
    
    // Replace each placeholder with a React component placeholder
    const replacements: Array<{id: string, component: React.ReactElement}> = [];
    
    placeholders.forEach(placeholder => {
      const islandId = placeholder.getAttribute('data-island');
      const componentName = placeholder.getAttribute('data-component');
      
      if (islandId && islandMap.has(islandId)) {
        const island = islandMap.get(islandId)!;
        
        // Create a unique marker for this island
        const markerId = `ISLAND_MARKER_${islandId}`;
        placeholder.outerHTML = `<div data-react-placeholder="${markerId}"></div>`;
        
        // Create the React component for this island (use ProductionIslandRenderer for consistency)
        const component = (
          <ProductionIslandRenderer 
            key={island.id}
            island={island}
            residentData={residentData}
          />
        );
        
        replacements.push({ id: markerId, component });
      }
    });
    
    // Get the modified HTML
    const processedHTML = tempDiv.innerHTML;
    
    // Split the HTML at placeholders and embed React components
    const parts = [];
    let lastIndex = 0;
    
    replacements.forEach(({ id, component }, index) => {
      const markerHTML = `<div data-react-placeholder="${id}"></div>`;
      const markerIndex = processedHTML.indexOf(markerHTML, lastIndex);
      
      if (markerIndex !== -1) {
        // Add HTML before the marker
        if (markerIndex > lastIndex) {
          const htmlPart = processedHTML.substring(lastIndex, markerIndex);
          parts.push(
            <div 
              key={`html-${index}`}
              dangerouslySetInnerHTML={{ __html: htmlPart }}
            />
          );
        }
        
        // Add the React component
        parts.push(component);
        
        lastIndex = markerIndex + markerHTML.length;
      }
    });
    
    // Add remaining HTML after the last marker
    if (lastIndex < processedHTML.length) {
      const remainingHTML = processedHTML.substring(lastIndex);
      parts.push(
        <div 
          key="html-final"
          dangerouslySetInnerHTML={{ __html: remainingHTML }}
        />
      );
    }
    
    return parts;
  };
  
  // Use useEffect to process the HTML after component mounts
  const [processedContent, setProcessedContent] = React.useState<React.ReactElement[]>([]);
  
  React.useEffect(() => {
    try {
      const content = renderHTMLWithIslands();
      setProcessedContent(content);
    } catch (error) {
      console.error('PREVIEW: Error processing HTML with islands:', error);
      // Fallback to static HTML only
      setProcessedContent([
        <div 
          key="fallback"
          className="static-html-content"
          dangerouslySetInnerHTML={{ __html: staticHTML }}
        />
      ]);
    }
  }, [staticHTML, islands]);
  
  return (
    <div className="preview-static-html-with-islands">
      {processedContent}
    </div>
  );
}

// Production island renderer (matching AdvancedProfileRenderer)
export function ProductionIslandRenderer({ 
  island, 
  residentData
}: { 
  island: any, 
  residentData: ResidentData
}) {
  try {
    const getComponent = (componentName: string) => {
      try {
        const registration = componentRegistry.get(componentName);
        if (registration) {
          return registration.component;
        }
        
        // Special cases for sub-components
        if (componentName === 'Tab') {
          const tabsRegistration = componentRegistry.get('Tabs');
          if (tabsRegistration) {
            const TabsComponent = tabsRegistration.component as any;
            return TabsComponent.Tab || null;
          }
        }
        if (componentName === 'When') {
          const chooseRegistration = componentRegistry.get('Choose');
          if (chooseRegistration) {
            const ChooseComponent = chooseRegistration.component as any;
            return ChooseComponent.When || null;
          }
        }
        if (componentName === 'Otherwise') {
          const chooseRegistration = componentRegistry.get('Choose');
          if (chooseRegistration) {
            const ChooseComponent = chooseRegistration.component as any;
            return ChooseComponent.Otherwise || null;
          }
        }
        if (componentName === 'IfVisitor') {
          const ifOwnerRegistration = componentRegistry.get('IfOwner');
          if (ifOwnerRegistration) {
            const IfOwnerComponent = ifOwnerRegistration.component as any;
            return IfOwnerComponent.IfVisitor || null;
          }
        }
        
        return null;
      } catch (error) {
        console.error(`ProductionIslandRenderer: Error loading component ${componentName}:`, error);
        return null;
      }
    };

    const Component = getComponent(island.component);

    if (!Component) {
      return (
        <div style={{ color: 'red', border: '1px solid red', padding: '4px' }}>
          Component {island.component} not found
        </div>
      );
    }

    // Use children from island structure (direct child islands)
    const childIslands = island.children || [];

    // Render child islands as children (same logic as production)
    let children;
    
    if (childIslands.length > 0) {
      if (island.component === 'Tabs') {
        children = childIslands.map((childIsland: any) => {
          if (childIsland.component === 'Tab') {
            const TabComponent = getComponent('Tab');
            if (TabComponent) {
              const tabChildren = childIsland.children || [];
              const tabContent = tabChildren.length > 0 ? (
                <>
                  {tabChildren.map((grandChild: any) => (
                    <ProductionIslandRenderer 
                      key={grandChild.id}
                      island={grandChild}
                      residentData={residentData}
                    />
                  ))}
                </>
              ) : 'Empty tab';

              return (
                <TabComponent key={childIsland.id} {...childIsland.props}>
                  {tabContent}
                </TabComponent>
              );
            }
          }
          
          return (
            <ProductionIslandRenderer 
              key={childIsland.id}
              island={childIsland}
              residentData={residentData}
            />
          );
        });
      } else if (island.component === 'Choose') {
        // Special handling for Choose component - render When/Otherwise children directly
        children = childIslands.map((childIsland: any) => {
          if (childIsland.component === 'When' || childIsland.component === 'Otherwise') {
            const ChildComponent = getComponent(childIsland.component);
            if (ChildComponent) {
              const conditionalChildren = childIsland.children || [];
              const conditionalContent = conditionalChildren.length > 0 ? (
                <>
                  {conditionalChildren.map((grandChild: any) => (
                    <ProductionIslandRenderer 
                      key={grandChild.id}
                      island={grandChild}
                      residentData={residentData}
                    />
                  ))}
                </>
              ) : '';

              return (
                <ChildComponent key={childIsland.id} {...childIsland.props}>
                  {conditionalContent}
                </ChildComponent>
              );
            }
          }
          
          return (
            <ProductionIslandRenderer 
              key={childIsland.id}
              island={childIsland}
              residentData={residentData}
            />
          );
        });
      } else {
        children = (
          <>
            {childIslands.map((childIsland: any) => (
              <ProductionIslandRenderer 
                key={childIsland.id}
                island={childIsland}
                residentData={residentData}
              />
            ))}
          </>
        );
      }
    }
    
    return (
      <ResidentDataProvider data={residentData}>
        <Component {...island.props}>
          {children}
        </Component>
      </ResidentDataProvider>
    );
  } catch (error) {
    console.error(`ProductionIslandRenderer: Error in ${island.component}:`, error);
    return (
      <div style={{ color: 'red', border: '1px solid red', padding: '4px' }}>
        <strong>ProductionIslandRenderer Error:</strong> {error instanceof Error ? error.message : String(error)}
      </div>
    );
  }
}

// Simple island renderer with synchronous component loading (LEGACY - keeping for fallback)
function SimpleIslandRenderer({ island, residentData, allIslands }: { island: any, residentData: ResidentData, allIslands?: any[] }) {
  try {
    
    // Get components from registry
    const getComponent = (componentName: string) => {
      try {
        const registration = componentRegistry.get(componentName);
        if (registration) {
          return registration.component;
        }
        
        // Special cases for sub-components
        if (componentName === 'Tab') {
          const tabsRegistration = componentRegistry.get('Tabs');
          if (tabsRegistration) {
            const TabsComponent = tabsRegistration.component as any;
            return TabsComponent.Tab || null;
          }
        }
        if (componentName === 'When') {
          const chooseRegistration = componentRegistry.get('Choose');
          if (chooseRegistration) {
            const ChooseComponent = chooseRegistration.component as any;
            return ChooseComponent.When || null;
          }
        }
        if (componentName === 'Otherwise') {
          const chooseRegistration = componentRegistry.get('Choose');
          if (chooseRegistration) {
            const ChooseComponent = chooseRegistration.component as any;
            return ChooseComponent.Otherwise || null;
          }
        }
        if (componentName === 'IfVisitor') {
          const ifOwnerRegistration = componentRegistry.get('IfOwner');
          if (ifOwnerRegistration) {
            const IfOwnerComponent = ifOwnerRegistration.component as any;
            return IfOwnerComponent.IfVisitor || null;
          }
        }
        
        return null;
      } catch (error) {
        console.error(`SimpleIslandRenderer: Error loading component ${componentName}:`, error);
        return null;
      }
    };

    const Component = getComponent(island.component);

    if (!Component) {
      return (
        <div style={{ color: 'red', border: '1px solid red', padding: '4px' }}>
          Component {island.component} not found
        </div>
      );
    }
    

    // Find child islands for this parent
    const childIslands = allIslands?.filter(childIsland => childIsland.parentId === island.id) || [];

    // Render child islands as children
    let children;
    
    if (childIslands.length > 0) {
      // Special handling for Tabs component - render Tab children directly
      if (island.component === 'Tabs') {
        
        children = childIslands.map((childIsland: any) => {
          if (childIsland.component === 'Tab') {
            const TabComponent = getComponent('Tab');
            if (TabComponent) {
              // Find children of this Tab
              const tabChildren = allIslands?.filter(grandChild => grandChild.parentId === childIsland.id) || [];
              const tabContent = tabChildren.length > 0 ? (
                <>
                  {tabChildren.map((grandChild: any) => (
                    <SimpleIslandRenderer 
                      key={grandChild.id}
                      island={grandChild}
                      residentData={residentData}
                      allIslands={allIslands}
                    />
                  ))}
                </>
              ) : childIsland.htmlStructure?.map((node: any, idx: number) => {
                if (node.type === 'text') {
                  return node.content;
                }
                return null;
              }).join('').trim() || 'Empty tab';

              return (
                <TabComponent key={childIsland.id} {...childIsland.props}>
                  {tabContent}
                </TabComponent>
              );
            }
          }
          
          // Fallback for non-Tab children in Tabs
          return (
            <SimpleIslandRenderer 
              key={childIsland.id}
              island={childIsland}
              residentData={residentData}
              allIslands={allIslands}
            />
          );
        });
      } else if (island.component === 'Choose') {
        // Special handling for Choose component - render When/Otherwise children directly  
        children = childIslands.map((childIsland: any) => {
          if (childIsland.component === 'When' || childIsland.component === 'Otherwise') {
            const ChildComponent = getComponent(childIsland.component);
            if (ChildComponent) {
              // Find children of this When/Otherwise
              const conditionalChildren = allIslands?.filter(grandChild => grandChild.parentId === childIsland.id) || [];
              const conditionalContent = conditionalChildren.length > 0 ? (
                <>
                  {conditionalChildren.map((grandChild: any) => (
                    <SimpleIslandRenderer 
                      key={grandChild.id}
                      island={grandChild}
                      residentData={residentData}
                      allIslands={allIslands}
                    />
                  ))}
                </>
              ) : childIsland.htmlStructure?.map((node: any, idx: number) => {
                if (node.type === 'text') {
                  return node.content;
                }
                return null;
              }).join('').trim() || '';

              return (
                <ChildComponent key={childIsland.id} {...childIsland.props}>
                  {conditionalContent}
                </ChildComponent>
              );
            }
          }
          
          // Fallback for non-When/Otherwise children in Choose
          return (
            <SimpleIslandRenderer 
              key={childIsland.id}
              island={childIsland}
              residentData={residentData}
              allIslands={allIslands}
            />
          );
        });
      } else {
        // Default handling for other components
        children = (
          <>
            {childIslands.map((childIsland: any) => (
              <SimpleIslandRenderer 
                key={childIsland.id}
                island={childIsland}
                residentData={residentData}
                allIslands={allIslands}
              />
            ))}
          </>
        );
      }
    }

    return (
      <ResidentDataProvider data={residentData}>
        <Component {...island.props}>
          {children}
        </Component>
      </ResidentDataProvider>
    );
  } catch (error) {
    console.error(`SimpleIslandRenderer: Error in ${island.component}:`, error);
    return (
      <div style={{ color: 'red', border: '1px solid red', padding: '4px' }}>
        <strong>SimpleIslandRenderer Error:</strong> {error instanceof Error ? error.message : String(error)}
        <pre style={{ fontSize: '8px', marginTop: '2px' }}>
          {error instanceof Error ? error.stack : ''}
        </pre>
      </div>
    );
  }
}

// Direct island renderer component with nested children support (ORIGINAL - DISABLED)
function DirectIslandRenderer({ island, residentData }: { island: any, residentData: ResidentData }) {
  const [Component, setComponent] = useState<React.ComponentType<any> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadComponent() {
      try {
        // Import the component registry and get the component
        const { componentRegistry } = await import('@/lib/template-registry');
        const registration = componentRegistry.get(island.component);
        
        if (!registration) {
          throw new Error(`Component ${island.component} not found in registry`);
        }
        
        setComponent(() => registration.component);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error(`DirectIslandRenderer: Failed to load component ${island.component}:`, errorMessage);
        setError(errorMessage);
      }
    }
    
    loadComponent();
  }, [island.component]);

  if (error) {
    return (
      <div style={{ color: 'red', padding: '8px', border: '1px solid red' }}>
        Error: {error}
      </div>
    );
  }

  if (!Component) {
    return (
      <div style={{ color: 'gray', padding: '8px' }}>
        Loading {island.component}...
      </div>
    );
  }

  // Render structured content (HTML + components)
  const renderStructuredContent = () => {
    if (!island.htmlStructure || island.htmlStructure.length === 0) {
      // Fallback to direct children rendering
      return island.children?.map((childIsland: any) => (
        <DirectIslandRenderer 
          key={childIsland.id}
          island={childIsland}
          residentData={residentData}
        />
      ));
    }

    const renderNode = (node: any, index: number): React.ReactNode => {
      if (node.type === 'component') {
        // Find the component island by ID
        const childIsland = island.children.find((child: any) => child.id === node.componentId);
        if (childIsland) {
          return (
            <DirectIslandRenderer 
              key={childIsland.id}
              island={childIsland}
              residentData={residentData}
            />
          );
        }
        return null;
      } else if (node.type === 'html') {
        const Tag = node.tagName as keyof React.JSX.IntrinsicElements;
        return (
          <Tag key={index} {...node.attributes}>
            {node.children?.map((child: any, childIndex: number) => 
              renderNode(child, childIndex)
            )}
          </Tag>
        );
      } else if (node.type === 'text') {
        return node.content;
      }
      return null;
    };

    return island.htmlStructure.map((node: any, index: number) => 
      renderNode(node, index)
    );
  };

  return (
    <ResidentDataProvider data={residentData}>
      <div style={{ border: '1px solid blue', padding: '4px', margin: '2px' }}>
        <div style={{ fontSize: '10px', color: 'blue' }}>
          Island: {island.component} (ID: {island.id})
        </div>
        <Component {...island.props}>
          {renderStructuredContent()}
        </Component>
      </div>
    </ResidentDataProvider>
  );
}