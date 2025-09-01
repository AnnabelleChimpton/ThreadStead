// Template preview component with dual rendering modes
import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ResidentDataProvider } from '@/components/template/ResidentDataProvider';
import type { ResidentData } from '@/components/template/ResidentDataProvider';
import type { User } from '@prisma/client';
import type { CompiledTemplate } from '@/lib/template-compiler';
import { componentRegistry } from '@/lib/template-registry';

// Simple debounce implementation
function debounce<T extends (...args: any[]) => any>(func: T, delay: number): T {
  let timeoutId: NodeJS.Timeout;
  return ((...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  }) as T;
}

// Add !important to all CSS declarations to ensure they override defaults
function addImportantToCSS(css: string): string {
  if (!css || css.trim() === '') return css;
  
  // Match CSS property: value pairs and add !important
  // Handles both semicolon-terminated and brace-terminated declarations
  return css.replace(/([a-zA-Z-]+)\s*:\s*([^;{}]+?)(\s*[;}])/g, (match, property, value, terminator) => {
    const trimmedValue = value.trim();
    
    // Skip if already has !important
    if (trimmedValue.includes('!important')) {
      return match;
    }
    
    // Add !important to the value
    return `${property}: ${trimmedValue} !important${terminator}`;
  });
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
  customCSS?: string;
  cssMode?: 'inherit' | 'override' | 'disable';
  renderMode: 'islands';
  residentData: ResidentData;
  onCompile?: (compiled: CompiledTemplate | null) => void;
  onError?: (error: string) => void;
}

export default function TemplatePreview({
  user,
  template,
  customCSS,
  cssMode = 'inherit',
  renderMode,
  residentData,
  onCompile,
  onError
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
  cssMode = 'inherit'
}: { 
  compiledTemplate: CompiledTemplate; 
  residentData: ResidentData;
  customCSS?: string;
  cssMode?: 'inherit' | 'override' | 'disable';
}) {
  
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
          console.warn('Could not access stylesheet:', sheet.href, e);
        }
      }
      
    } catch (error) {
      console.error('Error extracting site CSS:', error);
      
      // Fallback to minimal essential styles if extraction fails
      extractedCSS = `
        /* Fallback minimal styles */
        * { box-sizing: border-box; }
        body {
          font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          font-size: 16px;
          line-height: 1.6;
          color: #2F2F2F;
          background: #FCFAF7;
        }
        
        /* Image reset to prevent unwanted sizing */
        img {
          max-width: none;
          height: auto;
        }
        
        /* Essential Tailwind utilities */
        .flex { display: flex; }
        .flex-col { flex-direction: column; }
        .items-center { align-items: center; }
        .justify-center { justify-content: center; }
        .p-2 { padding: 0.5rem; }
        .p-4 { padding: 1rem; }
        .mb-2 { margin-bottom: 0.5rem; }
        .mb-4 { margin-bottom: 1rem; }
        .text-center { text-align: center; }
        .font-bold { font-weight: 700; }
        .rounded { border-radius: 0.375rem; }
        .rounded-full { border-radius: 9999px; }
        .rounded-none { border-radius: 0; }
        .bg-white { background-color: white; }
        .border { border-width: 1px; }
        .border-4 { border-width: 4px; }
        .border-black { border-color: #000; }
        .border-gray-200 { border-color: #e5e7eb; }
        .text-gray-500 { color: #6b7280; }
        .shadow { box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1); }
        
        /* Size utilities for ProfilePhoto - with high specificity */
        .w-8 { width: 2rem !important; }
        .h-8 { height: 2rem !important; }
        .w-16 { width: 4rem !important; }
        .h-16 { height: 4rem !important; }
        .w-32 { width: 8rem !important; }
        .h-32 { height: 8rem !important; }
        .w-48 { width: 12rem !important; }
        .h-48 { height: 12rem !important; }
        
        /* Object fit utilities */
        .object-cover { object-fit: cover !important; }
        
        /* Background colors */
        .bg-white { background-color: white !important; }
        .bg-yellow-200 { background-color: #fef08a !important; }
        
        /* Text sizes */
        .text-sm { font-size: 0.875rem !important; line-height: 1.25rem !important; }
        
        /* Padding */
        .p-1 { padding: 0.25rem !important; }
        
        /* Box shadow utility for retro effect */
        .shadow-\\[4px_4px_0_\\#000\\] {
          box-shadow: 4px 4px 0 #000 !important;
        }
        
        /* Border utilities with high specificity */
        .border-4 { border-width: 4px !important; }
        .border-black { border-color: #000 !important; }
        .rounded-full { border-radius: 9999px !important; }
        .rounded-none { border-radius: 0 !important; }
      `;
    }
    
    return extractedCSS;
  }, []);

  // Generate and inject CSS into Shadow DOM
  const updateShadowCSS = React.useCallback(() => {
    if (!shadowRootRef.current) return;
    
    // Clean CSS and remove mode comments
    const cleanCustomCSS = customCSS ? customCSS.replace(/\/\* CSS_MODE:\w+ \*\/\n?/g, '') : '';
    // Add !important to all custom CSS declarations for proper override in shadow DOM
    const importantCustomCSS = cleanCustomCSS ? addImportantToCSS(cleanCustomCSS) : '';
    
    // Remove existing style element
    const existingStyle = shadowRootRef.current.querySelector('#shadow-styles');
    if (existingStyle) {
      existingStyle.remove();
    }
    
    // Get site CSS
    const siteCSS = getSiteCSS();
    
    // Create new style element for shadow DOM
    const styleElement = document.createElement('style');
    styleElement.id = 'shadow-styles';
    
    let finalCSS = '';
    
    // Handle different CSS modes
    if (cssMode === 'disable') {
      // CSS disabled mode: Include essential component CSS but no layout constraints
      // This matches how the actual profile page works - core CSS classes are still available
      // Extract body styles from custom CSS and apply them to shadow content
      const bodyStylesMatch = importantCustomCSS.match(/body\s*\{([^}]+)\}/g);
      let bodyStyles = '';
      if (bodyStylesMatch) {
        bodyStyles = bodyStylesMatch.map(match => {
          return match.replace(/body\s*\{/, '#shadow-content {');
        }).join('\n');
      }
      
      // Extract essential component styles from site CSS that should be protected
      const essentialComponentStyles = siteCSS.split('\n')
        .filter(line => 
          line.includes('.thread-module') ||
          line.includes('.retro-split-') ||
          line.includes('.profile-tabs') ||
          line.includes('.thread-button') ||
          line.includes('.thread-label') ||
          line.includes('.site-layout')
        )
        .join('\n');
      
      finalCSS = `
        /* Basic reset only */
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        /* All site CSS for component compatibility */
        ${siteCSS}
        
        /* Apply body styles to shadow content */
        ${bodyStyles}
        
        /* Custom CSS with !important */
        ${importantCustomCSS.replace(/body\s*\{[^}]+\}/g, '')}
        
        /* Essential component styles with high priority - these come last to override custom CSS */
        ${addImportantToCSS(essentialComponentStyles)}
        
        /* Thread color utilities for template components like NavigationBar */
        .bg-thread-cream { background-color: #F5E9D4 !important; }
        .border-thread-sage { border-color: #A18463 !important; }
        .text-thread-pine { color: #2E4B3F !important; }
        .text-thread-sunset { color: #B8860B !important; }
        .text-thread-sage { color: #A18463 !important; }
        .backdrop-blur-sm { backdrop-filter: blur(4px) !important; }
        
        /* NavigationBar template component styling */
        .site-header {
          background-color: rgba(245, 233, 212, 0.95) !important;
          backdrop-filter: blur(4px) !important;
        }
        
        /* Fallback styles come last - only apply if custom CSS doesn't override */
        #shadow-content {
          font-family: system-ui, sans-serif;
          font-size: 14px;
          line-height: 1.5;
          color: #333;
          min-height: 100vh;
          background: 
            linear-gradient(135deg, rgba(245, 233, 212, 0.05) 0%, rgba(245, 233, 212, 0.15) 100%),
            radial-gradient(circle at 20% 80%, rgba(161, 132, 99, 0.03) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(46, 75, 63, 0.02) 0%, transparent 50%),
            #FCFAF7;
          display: flex;
          flex-direction: column;
          width: 100%;
          margin: 0;
          padding: 0;
        }
        
        /* Default site-layout fallback - only applies if custom CSS doesn't override */
        .site-layout {
          min-height: 100vh;
          background: 
            linear-gradient(135deg, rgba(245, 233, 212, 0.05) 0%, rgba(245, 233, 212, 0.15) 100%),
            radial-gradient(circle at 20% 80%, rgba(161, 132, 99, 0.03) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(46, 75, 63, 0.02) 0%, transparent 50%),
            #FCFAF7;
          display: flex;
          flex-direction: column;
          font-family: system-ui, sans-serif;
          font-size: 16px;
          line-height: 1.6;
          color: #2F2F2F;
          width: 100%;
          margin: 0;
          padding: 0;
        }
      `;
    } else if (cssMode === 'override') {
      // Site CSS first, then custom CSS with higher specificity
      // Extract body styles from custom CSS and apply them to shadow content
      const bodyStylesMatch = importantCustomCSS.match(/body\s*\{([^}]+)\}/g);
      let bodyStyles = '';
      if (bodyStylesMatch) {
        bodyStyles = bodyStylesMatch.map(match => {
          return match.replace(/body\s*\{/, '#shadow-content {');
        }).join('\n');
      }
      
      finalCSS = `
        /* Extracted site CSS (base layer) */
        ${siteCSS}
        
        /* Apply body styles to shadow content first */
        ${bodyStyles}
        
        /* Custom CSS with !important - override everything */
        ${importantCustomCSS.replace(/body\s*\{[^}]+\}/g, '')}
        
        /* Fallback styles come last - only apply if custom CSS doesn't override */
        #shadow-content {
          max-width: 80rem; /* max-w-5xl */
          margin: 0 auto;
          padding: 2rem 1.5rem; /* py-8 px-6 */
          min-height: 100vh;
          background: 
            linear-gradient(135deg, rgba(245, 233, 212, 0.05) 0%, rgba(245, 233, 212, 0.15) 100%),
            radial-gradient(circle at 20% 80%, rgba(161, 132, 99, 0.03) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(46, 75, 63, 0.02) 0%, transparent 50%),
            #FCFAF7;
          display: flex;
          flex-direction: column;
        }
        
        /* Default site-layout fallback - only applies if custom CSS doesn't override */
        .site-layout {
          max-width: 80rem; /* max-w-5xl */
          margin: 0 auto;
          padding: 2rem 1.5rem; /* py-8 px-6 */
          min-height: 100vh;
          background: 
            linear-gradient(135deg, rgba(245, 233, 212, 0.05) 0%, rgba(245, 233, 212, 0.15) 100%),
            radial-gradient(circle at 20% 80%, rgba(161, 132, 99, 0.03) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(46, 75, 63, 0.02) 0%, transparent 50%),
            #FCFAF7;
          display: flex;
          flex-direction: column;
          font-family: system-ui, sans-serif;
          font-size: 16px;
          line-height: 1.6;
          color: #2F2F2F;
        }
      `;
    } else { // cssMode === 'inherit'
      // Site CSS and custom CSS blended together
      // For inherit mode, we need to handle body styles carefully:
      // - Apply body styles to shadow content for preview
      // - Keep body styles in CSS, but the profile page will handle them correctly
      const bodyStylesMatch = importantCustomCSS.match(/body\s*\{([^}]+)\}/g);
      let shadowBodyStyles = '';
      if (bodyStylesMatch) {
        shadowBodyStyles = bodyStylesMatch.map(match => {
          return match.replace(/body\s*\{/, '#shadow-content {');
        }).join('\n');
      }
      
      finalCSS = `
        /* Extracted site CSS */
        ${siteCSS}
        
        /* Apply body styles to shadow content first */
        ${shadowBodyStyles}
        
        /* Custom CSS with !important - inherits and extends site styles */
        ${importantCustomCSS}
        
        /* Fallback styles come last - only apply if custom CSS doesn't override */
        #shadow-content {
          max-width: 80rem; /* max-w-5xl */
          margin: 0 auto;
          padding: 2rem 1.5rem; /* py-8 px-6 */
          min-height: 100vh;
          background: 
            linear-gradient(135deg, rgba(245, 233, 212, 0.05) 0%, rgba(245, 233, 212, 0.15) 100%),
            radial-gradient(circle at 20% 80%, rgba(161, 132, 99, 0.03) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(46, 75, 63, 0.02) 0%, transparent 50%),
            #FCFAF7;
          display: flex;
          flex-direction: column;
        }
        
        /* Default site-layout fallback - only applies if custom CSS doesn't override */
        .site-layout {
          max-width: 80rem; /* max-w-5xl */
          margin: 0 auto;
          padding: 2rem 1.5rem; /* py-8 px-6 */
          min-height: 100vh;
          background: 
            linear-gradient(135deg, rgba(245, 233, 212, 0.05) 0%, rgba(245, 233, 212, 0.15) 100%),
            radial-gradient(circle at 20% 80%, rgba(161, 132, 99, 0.03) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(46, 75, 63, 0.02) 0%, transparent 50%),
            #FCFAF7;
          display: flex;
          flex-direction: column;
          font-family: system-ui, sans-serif;
          font-size: 16px;
          line-height: 1.6;
          color: #2F2F2F;
        }
      `;
    }
    
    // Add islands container visibility and ensure background applies
    finalCSS += `
      /* Islands container visibility */
      .islands-container {
        display: block !important;
        visibility: visible !important;
        opacity: 1 !important;
      }
      
      /* Ensure shadow content takes full space */
      #shadow-content {
        width: 100% !important;
        min-height: 100% !important;
        display: block !important;
      }
      
      /* Global image reset to prevent sizing conflicts */
      img {
        max-width: none !important;
        width: auto !important;
        height: auto !important;
      }
      
      /* ProfilePhoto utility overrides with maximum specificity */
      .profile-photo-image.w-8 { width: 2rem !important; }
      .profile-photo-image.h-8 { height: 2rem !important; }
      .profile-photo-image.w-16 { width: 4rem !important; }
      .profile-photo-image.h-16 { height: 4rem !important; }
      .profile-photo-image.w-32 { width: 8rem !important; }
      .profile-photo-image.h-32 { height: 8rem !important; }
      .profile-photo-image.w-48 { width: 12rem !important; }
      .profile-photo-image.h-48 { height: 12rem !important; }
      .profile-photo-image.object-cover { object-fit: cover !important; }
      .profile-photo-image.rounded-full { border-radius: 9999px !important; }
      .profile-photo-image.rounded-none { border-radius: 0 !important; }
      
      /* Essential layout utilities for templates */
      .flex { display: flex !important; }
      .flex-col { flex-direction: column !important; }
      .flex-wrap { flex-wrap: wrap !important; }
      .items-center { align-items: center !important; }
      .justify-center { justify-content: center !important; }
      .text-center { text-align: center !important; }
      .mb-4 { margin-bottom: 1rem !important; }
      .gap-4 { gap: 1rem !important; }
      
      /* ProfilePhoto specific utilities */
      .border-4 { border-width: 4px !important; }
      .border-black { border-color: #000 !important; }
      .bg-white { background-color: white !important; }
      .p-1 { padding: 0.25rem !important; }
      .shadow-\\[4px_4px_0_\\#000\\] { 
        box-shadow: 4px 4px 0 #000 !important; 
      }
      
      /* Template layout classes that might not be working */
      .retro-split-layout {
        display: flex !important;
        gap: 1rem !important;
        margin-bottom: 2rem !important;
        flex-wrap: wrap !important;
      }
      .retro-split-left {
        flex: 30% !important;
        min-width: 200px !important;
        text-align: center !important;
      }
      .retro-split-right {
        flex: 70% !important;
        min-width: 300px !important;
      }
    `;
    
    styleElement.textContent = finalCSS;
    
    // Insert at beginning of shadow root
    shadowRootRef.current.insertBefore(styleElement, shadowRootRef.current.firstChild);
  }, [customCSS, cssMode, getSiteCSS]);

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
              {renderIslandsDirectly()}
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

function PreviewStaticHTMLWithIslands({ 
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
function ProductionIslandRenderer({ 
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