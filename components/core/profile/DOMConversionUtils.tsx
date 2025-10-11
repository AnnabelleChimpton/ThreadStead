// DOM conversion utilities for transforming HTML to React elements

import React from 'react';
import type { Island } from '@/lib/templates/compilation/compiler';
import type { ResidentData } from '@/components/features/templates/ResidentDataProvider';
import { normalizeAttributeName } from '@/lib/templates/core/attribute-mappings';

// Import island renderers (will be created next)
import { ProductionIslandRendererWithHTMLChildren } from './IslandRenderers';

// Parse HTML content to React children
export function parseHTMLToReactChildren(
  html: string,
  allIslands: Island[],
  residentData: ResidentData,
  onIslandRender: (islandId: string) => void,
  onIslandError: (error: Error, islandId: string) => void
): React.ReactNode {
  if (!html || html.trim() === '') {
    return null;
  }

  // Check if we're in a browser environment
  if (typeof document === 'undefined') {
    return null;
  }

  // Create a temporary div to parse the HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;

  // Process the parsed HTML nodes
  // Create a counter object to ensure unique keys across the entire tree
  const keyCounter = { value: 0 };

  // Convert DOM nodes to React elements
  return domToReact(tempDiv, allIslands, residentData, onIslandRender, onIslandError, false, keyCounter);
}

// Convert DOM nodes to React elements recursively
export function domToReact(
  node: Node,
  allIslands: Island[],
  residentData: ResidentData,
  onIslandRender: (islandId: string) => void,
  onIslandError: (error: Error, islandId: string) => void,
  isInVisualBuilder = false,
  keyCounter = { value: 0 }
): React.ReactNode {
  // Text node
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent;
  }

  // Element node
  if (node.nodeType === Node.ELEMENT_NODE) {
    const element = node as Element;
    const tagName = element.tagName.toLowerCase();

    // Check if this is an island placeholder
    const islandId = element.getAttribute('data-island');
    if (islandId) {
      const island = allIslands.find(i => i.id === islandId);
      if (island) {
        // Parse the inner HTML of this island to get its HTML children
        const innerHTMLContent = element.innerHTML;
        const parsedInnerChildren = innerHTMLContent ?
          parseHTMLToReactChildren(innerHTMLContent, allIslands, residentData, onIslandRender, onIslandError) :
          null;

        return (
          <ProductionIslandRendererWithHTMLChildren
            key={island.id}
            island={island}
            allIslands={allIslands}
            residentData={residentData}
            htmlChildren={parsedInnerChildren}
            onIslandRender={onIslandRender}
            onIslandError={onIslandError}
          />
        );
      }
    }

    // Regular HTML element - convert attributes (FIXED: use global counter for unique keys)
    const props: any = { key: `element-${element.tagName}-${keyCounter.value++}` };

    // Copy attributes as props with centralized attribute normalization
    // This eliminates another ~125 lines of duplicate attribute mapping code
    for (let i = 0; i < element.attributes.length; i++) {
      const attr = element.attributes[i];
      const propName = normalizeAttributeName(attr.name);

      // Special handling for style attribute - convert CSS string to React style object
      if (propName === 'style') {
        props[propName] = parseStyleString(attr.value);
      } else {
        props[propName] = attr.value;
      }
    }

    // Check if this is a grid container and enhance with CSS Grid styles
    const isGridContainer = props.className &&
                           (props.className.includes('template-container') &&
                            props.className.includes('grid-container'));

    if (isGridContainer) {
      // Parse existing style or create new one
      const existingStyle = props.style || '';
      const existingStyleObj = typeof existingStyle === 'string' ?
        parseStyleString(existingStyle) : existingStyle;

      // Extract grid configuration from style
      const gridColumns = existingStyleObj.gridTemplateColumns || 'repeat(12, 1fr)';
      const gridGap = existingStyleObj.gap || '16px';

      // Enhance with CSS Grid styles
      props.style = {
        ...existingStyleObj,
        display: 'grid',
        gridTemplateColumns: gridColumns,
        gap: gridGap,
        width: existingStyleObj.width || '800px',
        minHeight: existingStyleObj.minHeight || existingStyleObj.height || '600px',
      };
    }

    // Convert children recursively
    const children = Array.from(node.childNodes)
      .map(child => domToReact(child, allIslands, residentData, onIslandRender, onIslandError, isInVisualBuilder, keyCounter))
      .filter(child => child !== null && child !== '');

    // Create React element
    return React.createElement(tagName, props, ...children);
  }

  return null;
}

// Helper function to parse CSS style string into object
export function parseStyleString(styleString: string): Record<string, string> {
  const styles: Record<string, string> = {};
  if (!styleString) return styles;

  styleString.split(';').forEach(declaration => {
    const colonIndex = declaration.indexOf(':');
    if (colonIndex > 0) {
      const property = declaration.slice(0, colonIndex).trim();
      const value = declaration.slice(colonIndex + 1).trim();
      if (property && value) {
        // Convert kebab-case to camelCase for React style objects
        const camelProperty = property.replace(/-([a-z])/g, (match, letter) => letter.toUpperCase());
        styles[camelProperty] = value;
      }
    }
  });

  return styles;
}
