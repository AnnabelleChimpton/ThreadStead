import React from 'react';
import { componentRegistry, validateAndCoerceProps } from './template-registry';
import type { TemplateNode } from './template-parser';
import { ResidentDataProvider } from '@/components/template/ResidentDataProvider';

// Transform AST to React elements
export function transformNodeToReact(node: TemplateNode, key?: string | number): React.ReactNode {
  if (node.type === 'text') {
    return node.value;
  }

  if (node.type === 'root') {
    const children = node.children?.map((child, index) => 
      transformNodeToReact(child, index)
    );
    return children;
  }

  if (node.type === 'element' && node.tagName) {
    const tagName = node.tagName;
    
    // Check if this is a registered component (try both original and capitalized)
    let componentRegistration = componentRegistry.get(tagName);
    
    if (!componentRegistration && tagName) {
      // Try case-insensitive match with registered components
      const allTags = componentRegistry.getAllowedTags();
      const exactMatch = allTags.find(tag => tag.toLowerCase() === tagName.toLowerCase());
      if (exactMatch) {
        componentRegistration = componentRegistry.get(exactMatch);
      }
    }
    
    if (componentRegistration) {
      // Transform custom component
      const { component: Component, props: propSchemas } = componentRegistration;
      
      // Extract and validate props from properties
      const rawProps = { ...node.properties };
      const validatedProps = validateAndCoerceProps(rawProps, propSchemas);
      
      // Handle children for components that support them (like Tabs)
      const children = node.children?.map((child, index) => 
        transformNodeToReact(child, index)
      );
      
      try {
        // Use a cleaner approach to create React elements
        const props = { ...validatedProps };
        if (key !== undefined) props.key = key;
        
        return React.createElement(
          Component,
          props,
          ...(children || [])
        );
      } catch (error) {
        console.error(`Error creating React element for ${tagName}:`, error);
        return React.createElement('div', { key }, `Error: Failed to render ${tagName}`);
      }
    } else {
      // Handle data-attribute syntax for components
      if (node.properties?.['data-component']) {
        const componentName = node.properties['data-component'];
        let componentRegistration = componentRegistry.get(componentName);
        
        // Try capitalized version if not found
        if (!componentRegistration) {
          const capitalizedName = componentName.charAt(0).toUpperCase() + componentName.slice(1);
          componentRegistration = componentRegistry.get(capitalizedName);
        }
        
        if (componentRegistration) {
          const { component: Component, props: propSchemas } = componentRegistration;
          
          // Extract props from data-attributes
          const rawProps: Record<string, any> = {};
          for (const [key, value] of Object.entries(node.properties)) {
            if (key.startsWith('data-') && key !== 'data-component') {
              const propName = key.replace('data-', '');
              rawProps[propName] = value;
            }
          }
          
          const validatedProps = validateAndCoerceProps(rawProps, propSchemas);
          
          return React.createElement(Component, { ...validatedProps, key });
        }
      }
      
      // Regular HTML element
      const allowedTags = ['div', 'p', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'section', 'article', 'main', 'header', 'footer', 'nav', 'aside', 'br'];
      
      if (allowedTags.includes(tagName.toLowerCase())) {
        const children = node.children?.map((child, index) => 
          transformNodeToReact(child, index)
        );
        
        // Clean properties for regular HTML elements
        const cleanProperties = { ...node.properties };
        delete cleanProperties['data-component'];
        
        return React.createElement(
          tagName,
          { ...cleanProperties, key },
          children?.length ? children : undefined
        );
      }
    }
  }

  // Fallback: return nothing for unknown elements
  return null;
}

// Main render function that wraps the tree in ResidentDataProvider
export interface RenderOptions {
  ast: TemplateNode;
  residentData: any;
}

export function renderTemplate({ ast, residentData }: RenderOptions): React.ReactElement {
  const transformedContent = transformNodeToReact(ast);
  
  return (
    <ResidentDataProvider data={residentData}>
      <div className="template-content">
        {Array.isArray(transformedContent) ? transformedContent : transformedContent}
      </div>
    </ResidentDataProvider>
  );
}

// Preview mode with error boundaries and warnings
export interface PreviewOptions extends RenderOptions {
  showWarnings?: boolean;
}

export function PreviewRenderer({ ast, residentData, showWarnings = true }: PreviewOptions): React.ReactElement {
  try {
      const content = renderTemplate({ ast, residentData });
    
    return (
      <div className="template-preview">
        {showWarnings && (
          <div className="template-warnings mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm">
            <p className="font-medium text-yellow-800 mb-1">Preview Mode</p>
            <p className="text-yellow-700">This is a preview of your template. Some features may not be fully functional.</p>
          </div>
        )}
        <div className="template-content">
          {content}
        </div>
      </div>
    );
  } catch (error) {
    return (
      <div className="template-error p-4 bg-red-50 border border-red-200 rounded">
        <h4 className="font-medium text-red-800 mb-2">Render Error</h4>
        <p className="text-red-700 text-sm">{String(error)}</p>
      </div>
    );
  }
}