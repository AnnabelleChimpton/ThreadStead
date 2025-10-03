/**
 * Component prop preparation utilities for canvas renderer
 */

import React from 'react';
import type { ComponentItem } from '@/hooks/useCanvasState';
import type { VisualBuilderContext } from '@/lib/templates/core/standard-component-interface';
import { stripPositioningFromStyle } from './css-utilities';

/**
 * Prepare props for component rendering with support for both legacy and standardized prop structures
 * This handles the transition from the old prop system to the new standardized system
 */
export function prepareComponentProps(
  component: ComponentItem,
  isSelected: boolean,
  onContentChange: (content: string, cssRenderMode?: string) => void,
  isNested: boolean = false
): Record<string, any> {
  // Check if component uses new standardized prop structure or publicProps
  // CRITICAL: Heading and TextElement should ALWAYS use LEGACY path even if they have publicProps
  // This is because PropertyPanel routes their CSS props to 'props', not 'publicProps'
  const legacyComponentTypes = ['Heading', 'TextElement'];
  const isLegacyComponentType = legacyComponentTypes.includes(component.type);

  const hasPublicProps = component.publicProps && Object.keys(component.publicProps).length > 0;
  const isStandardizedComponent = hasPublicProps && !isLegacyComponentType;

  if (isStandardizedComponent) {
    // NEW: Use separated prop structure
    const visualBuilderContext: VisualBuilderContext = {
      isInVisualBuilder: true,
      isSelected: isSelected,
      isHovered: false, // This would be managed by hover state
      onContentChange: onContentChange,
      // For nested components, positioning mode should be 'normal' to avoid conflicting absolute positioning
      positioningMode: isNested ? 'normal' : (component.positioningMode === 'absolute' ? 'absolute' : 'normal'),
      size: component.visualBuilderState?.size || component.props?._size
    };

    // Use publicProps directly for rendering
    const baseProps: any = { ...component.publicProps };

    // CRITICAL FIX: Clean up legacy lowercase properties from publicProps
    // If we find 'backgroundcolor', normalize it to 'backgroundColor'
    if (baseProps.backgroundcolor && !baseProps.backgroundColor) {
      baseProps.backgroundColor = baseProps.backgroundcolor;
      delete baseProps.backgroundcolor;
    }

    // CRITICAL FIX: Strip positioning props to prevent double positioning
    // The CanvasRenderer wrapper div handles all positioning in Visual Builder
    // Components should render at 0,0 relative to their wrapper
    delete baseProps.position;
    delete baseProps.top;
    delete baseProps.right;
    delete baseProps.bottom;
    delete baseProps.left;

    // CRITICAL FIX: Also strip positioning from style prop (string or object)
    // separateCSSProps() parses the style prop and extracts positioning from it
    // We need to clean the style prop to prevent double positioning
    if (baseProps.style) {
      baseProps.style = stripPositioningFromStyle(baseProps.style);
    }

    return {
      ...baseProps,
      __visualBuilder: visualBuilderContext
    };
  } else {
    // LEGACY: Use old prop structure for backward compatibility
    // CRITICAL FIX: Merge both props and publicProps for components that have both
    // This handles cases where PropertyPanel saves CSS to publicProps but we need to read from both
    const finalProps = {
      ...(component.props || {}),
      ...(component.publicProps || {})  // publicProps takes precedence
    };

    // Extract CSS properties from legacy props for conversion to inline styles
    // This ensures universal CSS styling works for all components, not just standardized ones
    const cssProperties = [
      'backgroundColor', 'color', 'textColor', 'borderColor', 'accentColor',
      'fontSize', 'fontFamily', 'fontWeight', 'textAlign', 'lineHeight',
      'padding', 'margin', 'border', 'borderRadius', 'borderWidth', 'boxShadow',
      'opacity', 'position', 'top', 'right', 'bottom', 'left', 'width', 'height',
      'minWidth', 'minHeight', 'maxWidth', 'maxHeight', 'zIndex', 'display',
      'flexDirection', 'justifyContent', 'alignItems', 'alignSelf', 'gap',
      'rowGap', 'columnGap', 'gridTemplateColumns', 'gridTemplateRows',
      'gridColumn', 'gridRow', 'gridArea', 'customCSS'
    ];

    // Map of legacy lowercase property names to correct camelCase names
    const legacyPropertyMap: Record<string, string> = {
      'backgroundcolor': 'backgroundColor',
      'textcolor': 'textColor',
      'bordercolor': 'borderColor',
      'accentcolor': 'accentColor',
      'fontsize': 'fontSize',
      'fontfamily': 'fontFamily',
      'fontweight': 'fontWeight',
      'textalign': 'textAlign',
      'lineheight': 'lineHeight',
      'borderradius': 'borderRadius',
      'borderwidth': 'borderWidth',
      'boxshadow': 'boxShadow',
      'minwidth': 'minWidth',
      'minheight': 'minHeight',
      'maxwidth': 'maxWidth',
      'maxheight': 'maxHeight',
      'zindex': 'zIndex',
      'flexdirection': 'flexDirection',
      'justifycontent': 'justifyContent',
      'alignitems': 'alignItems',
      'alignself': 'alignSelf',
      'rowgap': 'rowGap',
      'columngap': 'columnGap',
      'gridtemplatecolumns': 'gridTemplateColumns',
      'gridtemplaterows': 'gridTemplateRows',
      'gridcolumn': 'gridColumn',
      'gridrow': 'gridRow',
      'gridarea': 'gridArea',
      'customcss': 'customCSS'
    };

    // Separate CSS properties from other props with legacy name normalization
    const extractedCSSProps: any = {};
    const remainingProps: any = {};

    Object.keys(finalProps).forEach(key => {
      // Check if this is a legacy lowercase CSS property and normalize it
      const normalizedKey = legacyPropertyMap[key.toLowerCase()] || key;

      if (cssProperties.includes(normalizedKey)) {
        // Extract CSS property with normalized camelCase name
        extractedCSSProps[normalizedKey] = (finalProps as any)[key];
      } else {
        // Keep non-CSS properties
        remainingProps[key] = (finalProps as any)[key];
      }
    });

    // Convert CSS properties to inline styles
    const cssInlineStyles: React.CSSProperties = {};
    if (extractedCSSProps.backgroundColor) cssInlineStyles.backgroundColor = extractedCSSProps.backgroundColor;
    if (extractedCSSProps.color) cssInlineStyles.color = extractedCSSProps.color;
    if (extractedCSSProps.textColor) cssInlineStyles.color = extractedCSSProps.textColor; // textColor is alias
    if (extractedCSSProps.borderColor) cssInlineStyles.borderColor = extractedCSSProps.borderColor;
    if (extractedCSSProps.fontSize) cssInlineStyles.fontSize = extractedCSSProps.fontSize;
    if (extractedCSSProps.fontFamily) cssInlineStyles.fontFamily = extractedCSSProps.fontFamily;
    if (extractedCSSProps.fontWeight) cssInlineStyles.fontWeight = extractedCSSProps.fontWeight;
    if (extractedCSSProps.textAlign) cssInlineStyles.textAlign = extractedCSSProps.textAlign;
    if (extractedCSSProps.lineHeight) cssInlineStyles.lineHeight = extractedCSSProps.lineHeight;
    if (extractedCSSProps.padding) cssInlineStyles.padding = extractedCSSProps.padding;
    if (extractedCSSProps.margin) cssInlineStyles.margin = extractedCSSProps.margin;
    if (extractedCSSProps.border) cssInlineStyles.border = extractedCSSProps.border;
    if (extractedCSSProps.borderRadius) cssInlineStyles.borderRadius = extractedCSSProps.borderRadius;
    if (extractedCSSProps.borderWidth) cssInlineStyles.borderWidth = extractedCSSProps.borderWidth;
    if (extractedCSSProps.boxShadow) cssInlineStyles.boxShadow = extractedCSSProps.boxShadow;
    if (extractedCSSProps.opacity) cssInlineStyles.opacity = extractedCSSProps.opacity;
    if (extractedCSSProps.display) cssInlineStyles.display = extractedCSSProps.display;
    if (extractedCSSProps.flexDirection) cssInlineStyles.flexDirection = extractedCSSProps.flexDirection;
    if (extractedCSSProps.justifyContent) cssInlineStyles.justifyContent = extractedCSSProps.justifyContent;
    if (extractedCSSProps.alignItems) cssInlineStyles.alignItems = extractedCSSProps.alignItems;
    if (extractedCSSProps.alignSelf) cssInlineStyles.alignSelf = extractedCSSProps.alignSelf;
    if (extractedCSSProps.gap) cssInlineStyles.gap = extractedCSSProps.gap;
    if (extractedCSSProps.rowGap) cssInlineStyles.rowGap = extractedCSSProps.rowGap;
    if (extractedCSSProps.columnGap) cssInlineStyles.columnGap = extractedCSSProps.columnGap;
    if (extractedCSSProps.gridTemplateColumns) cssInlineStyles.gridTemplateColumns = extractedCSSProps.gridTemplateColumns;
    if (extractedCSSProps.gridTemplateRows) cssInlineStyles.gridTemplateRows = extractedCSSProps.gridTemplateRows;

    // CRITICAL FIX: DO NOT include positioning props in Visual Builder rendering
    // The CanvasRenderer wrapper div handles all positioning - components render at 0,0 relative to wrapper
    // This prevents double positioning bug where components were positioned twice
    // Note: We still extracted these props above (they're in extractedCSSProps) but we intentionally
    // don't add them to cssInlineStyles so they don't get applied to the component

    // CRITICAL FIX: Clean the existing style prop before merging
    // Handle both string and object style props from HTML parser
    let existingStyleObj: React.CSSProperties = {};
    if (remainingProps.style) {
      if (typeof remainingProps.style === 'string') {
        // Parse string style and convert to object, stripping positioning
        const cleanedStyleString = stripPositioningFromStyle(remainingProps.style) as string;
        // Parse the cleaned string into an object
        cleanedStyleString.split(';').forEach(declaration => {
          const [property, value] = declaration.split(':').map(s => s.trim());
          if (property && value) {
            // Convert kebab-case to camelCase
            const camelProperty = property.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
            (existingStyleObj as any)[camelProperty] = value;
          }
        });
      } else if (typeof remainingProps.style === 'object') {
        // Clean object style by removing positioning
        existingStyleObj = stripPositioningFromStyle(remainingProps.style) as React.CSSProperties;
      }
    }

    // Merge CSS inline styles with cleaned existing style prop
    const mergedStyle = { ...existingStyleObj, ...cssInlineStyles };

    // Additional safety: Strip positioning from merged styles (redundant but safe)
    delete mergedStyle.position;
    delete mergedStyle.top;
    delete mergedStyle.right;
    delete mergedStyle.bottom;
    delete mergedStyle.left;

    const preparedProps = {
      ...remainingProps,
      style: mergedStyle, // Inject converted CSS as inline styles
      _isInVisualBuilder: true,
      // For nested components, use 'grid' positioning mode for better layout behavior
      _positioningMode: isNested ? 'grid' : component.positioningMode,
      _size: component.props?._size,
      _onContentChange: onContentChange
    };

    return preparedProps;
  }
}
