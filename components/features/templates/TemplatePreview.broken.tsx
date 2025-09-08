// Fixed Template preview component with CSS layers instead of !important nightmare
import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ResidentDataProvider } from '@/components/features/templates/ResidentDataProvider';
import type { ResidentData } from '@/components/features/templates/ResidentDataProvider';
import type { User } from '@prisma/client';
import type { CompiledTemplate } from '@/lib/templates/compilation/compiler';
import { componentRegistry, validateAndCoerceProps } from '@/lib/templates/core/template-registry';
import { generatePreviewCSS, type CSSMode } from '@/lib/css-layers';
import { useSiteCSS } from '@/hooks/useSiteCSS';

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
  const validComponents = componentRegistry.getAllowedTags();
  
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<root>${templateContent}</root>`, 'text/xml');
  
  if (doc.documentElement.tagName === 'parsererror') {
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
      
      const props: any = {};
      for (let i = 0; i < element.attributes.length; i++) {
        const attr = element.attributes[i];
        props[attr.name] = attr.value;
      }
      
      const children: any[] = [];
      
      for (let i = 0; i < element.childNodes.length; i++) {
        const child = element.childNodes[i];
        
        if (child.nodeType === 1) {
          const childElement = child as Element;
          const childResult = processElement(childElement, islandId);
          
          if (childResult) {
            children.push(childResult);
          }
        }
      }
      
      const island = {
        id: islandId,
        component: properComponentName,
        props,
        children,
        parentId: parentId || undefined
      };
      
      islands.push(island);
      return island;
    }
    
    return null;
  }
  
  for (let i = 0; i < doc.documentElement.childNodes.length; i++) {
    const child = doc.documentElement.childNodes[i];
    if (child.nodeType === 1) {
      processElement(child as Element);
    }
  }
  
  return { islands };
}

// Fallback regex parser for when XML parsing fails
function parseTemplateWithRegex(templateContent: string, validComponents: string[]): { islands: any[] } {
  const islands: any[] = [];
  let islandCounter = 0;
  
  validComponents.forEach((component) => {
    const regex = new RegExp(`<${component}([^>]*)(?:/>|>.*?</${component}>)`, 'gi');
    let match;
    
    while ((match = regex.exec(templateContent)) !== null) {
      const propsString = match[1] || '';
      const props: any = {};
      
      const propRegex = /(\w+)=["']([^"']+)["']/g;
      let propMatch;
      while ((propMatch = propRegex.exec(propsString)) !== null) {
        props[propMatch[1]] = propMatch[2];
      }
      
      islands.push({
        id: `mock-island-${islandCounter++}`,
        component,
        props,
        children: []
      });
    }
  });
  
  return { islands };
}

interface ShadowPortalProps {
  children: React.ReactNode;
  shadowRoot: ShadowRoot;
}

function ShadowPortal({ children, shadowRoot }: ShadowPortalProps) {
  const container = shadowRoot.querySelector('#shadow-content');
  if (!container) return null;
  
  return createPortal(children, container);
}

interface TemplatePreviewProps {
  user: User;
  template: string;
  customCSS: string;
  cssMode: string;
  renderMode: string;
  residentData: ResidentData;
  onCompile?: (template: CompiledTemplate) => void;
  onError?: (error: string) => void;
}

export default function TemplatePreview({
  user,
  template,
  customCSS,
  cssMode,
  renderMode,
  residentData,
  onCompile,
  onError
}: TemplatePreviewProps) {
  const [compiledTemplate, setCompiledTemplate] = useState<CompiledTemplate | null>(null);
  
  // Compile template when it changes
  useEffect(() => {
    if (!template) return;
    
    try {
      // Parse template to get islands
      const parsed = parseNestedTemplate(template);
      const compiled: CompiledTemplate = {
        islands: parsed.islands,
        staticHTML: template,
        mode: 'enhanced',
        compiledAt: new Date(),
        errors: [],
        warnings: []
      };
      
      setCompiledTemplate(compiled);
      onCompile?.(compiled);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Template compilation failed:', errorMessage);
      onError?.(errorMessage);
    }
  }, [template, onCompile, onError]);
  const shadowHostRef = React.useRef<HTMLDivElement>(null);
  const shadowRootRef = React.useRef<ShadowRoot | null>(null);
  const [shadowReady, setShadowReady] = React.useState(false);
  const { css: siteWideCSS } = useSiteCSS();
  
  const previewId = React.useMemo(() => `preview-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, []);

  // Initialize Shadow DOM
  React.useEffect(() => {
    if (shadowHostRef.current && !shadowRootRef.current) {
      try {
        const shadowRoot = shadowHostRef.current.attachShadow({ mode: 'open' });
        shadowRootRef.current = shadowRoot;
        
        const container = document.createElement('div');
        container.id = 'shadow-content';
        container.className = 'site-layout';
        shadowRoot.appendChild(container);
        
        setShadowReady(true);
      } catch (error) {
        console.error('Failed to create Shadow DOM:', error);
      }
    }
  }, []);

  // Extract site CSS from document stylesheets for shadow DOM
  const getSiteCSS = React.useCallback(() => {
    let extractedCSS = '';
    
    try {
      const stylesheets = Array.from(document.styleSheets);
      
      for (const sheet of stylesheets) {
        try {
          if (sheet.href && !sheet.href.startsWith(window.location.origin)) {
            continue;
          }
          
          const rules = Array.from(sheet.cssRules || []);
          for (const rule of rules) {
            extractedCSS += rule.cssText + '\n';
          }
        } catch (e) {
          // Skip stylesheets we can't access
          continue;
        }
      }
    } catch (e) {
      console.warn('Could not extract site CSS:', e);
    }
    
    return extractedCSS;
  }, []);

  // Generate and inject CSS into Shadow DOM using CSS layers
  const updateShadowCSS = React.useCallback(() => {
    if (!shadowRootRef.current) return;
    
    const existingStyle = shadowRootRef.current.querySelector('#shadow-styles');
    if (existingStyle) {
      existingStyle.remove();
    }
    
    // Generate layered CSS using our new system
    const layeredCSS = generatePreviewCSS({
      cssMode: cssMode as CSSMode,
      templateMode: 'enhanced',
      siteWideCSS: getSiteCSS(),
      userCustomCSS: customCSS || '',
      profileId: previewId
    });
    
    const styleElement = document.createElement('style');
    styleElement.id = 'shadow-styles';
    
    const finalCSS = `
      /* CSS Layers approach - clean and predictable */
      ${layeredCSS}
      
      /* Shadow DOM specific styles */
      #shadow-content {
        width: 100%;
        min-height: 400px;
        display: block;
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
    `;
    
    styleElement.textContent = finalCSS;
    shadowRootRef.current.insertBefore(styleElement, shadowRootRef.current.firstChild);
  }, [customCSS, cssMode, getSiteCSS, previewId]);

  // Update shadow DOM styles when CSS or mode changes
  React.useEffect(() => {
    if (shadowReady) {
      updateShadowCSS();
    }
  }, [shadowReady, updateShadowCSS, cssMode]);

  // Return early if no compiled template yet
  if (!compiledTemplate) {
    return (
      <div className="islands-preview-wrapper">
        <div className="islands-status-bar p-2 bg-gray-50 border-b text-xs text-gray-600">
          <span>⏳ Compiling template...</span>
        </div>
      </div>
    );
  }

  // Render islands directly in shadow DOM
  const renderIslandsDirectly = () => {
    try {
      if (!compiledTemplate || !compiledTemplate.islands) {
        return <div className="p-4 text-gray-500">No islands to render</div>;
      }

      const renderIsland = (island: any) => {
        const registration = componentRegistry.get(island.component);
        if (!registration) {
          console.warn(`Component ${island.component} not found in registry`);
          return null;
        }

        const Component = registration.component;
        
        // Validate and coerce props
        const validatedProps = validateAndCoerceProps(island.props, registration.props);

        const childElements = (island.children || []).map((childIsland: any) => 
          renderIsland(childIsland)
        ).filter(Boolean);

        return React.createElement(
          Component,
          {
            ...validatedProps,
            key: island.id
          },
          ...childElements
        );
      };

      const elements = compiledTemplate.islands
        .filter((island: any) => !island.parentId)
        .map(renderIsland)
        .filter(Boolean);

      if (elements.length === 0) {
        return <div className="p-4 text-gray-500">No valid components to render</div>;
      }

      return (
        <ResidentDataProvider data={residentData}>
          <div className="islands-container">
            {elements}
          </div>
        </ResidentDataProvider>
      );

    } catch (error) {
      console.error('renderIslandsDirectly: Error occurred:', error);
      return (
        <div style={{ color: 'red', border: '1px solid red', padding: '8px' }}>
          <strong>Render Error:</strong> {error instanceof Error ? error.message : String(error)}
        </div>
      );
    }
  };

  return (
    <div className="islands-preview-wrapper">
      <div className="islands-status-bar p-2 bg-gray-50 border-b text-xs text-gray-600 flex justify-between">
        <span>🏝️ Islands Mode (Shadow DOM Isolated)</span>
        <span>
          {compiledTemplate.islands?.length || 0} interactive components
        </span>
      </div>
      
      <div
        ref={shadowHostRef}
        style={{
          width: '100%',
          minHeight: '400px',
          border: '1px solid #e5e7eb',
          borderTop: 'none',
          backgroundColor: '#fafafa'
        }}
      />
      
      {!shadowReady && (
        <div className="shadow-loading p-4 text-center text-gray-500">
          Initializing shadow DOM...
        </div>
      )}
      
      {shadowReady && shadowRootRef.current && (
        <ShadowPortal shadowRoot={shadowRootRef.current}>
          <React.Suspense fallback={<div className="p-4">Loading islands...</div>}>
            {renderIslandsDirectly()}
          </React.Suspense>
        </ShadowPortal>
      )}
    </div>
  );
}