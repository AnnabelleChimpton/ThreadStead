import React, { useCallback, useMemo } from 'react';
import { useUniversalStyles, type UniversalStyleProps, separateUniversalStyleProps } from '@/lib/templates/core/universal-styling';
import { useResidentCSSRenderMode } from './ResidentDataProvider';
import { getDefaultComponentCSSRenderMode } from '@/lib/utils/css/css-mode-mapper';

export interface CustomHTMLElementProps extends UniversalStyleProps {
  tagName?: string;          // div, span, section, etc. (default: 'div')
  innerHTML?: string;        // Sanitized HTML content
  content?: string;          // Alias for innerHTML (used by CanvasRenderer)
  className?: string;        // CSS classes
  style?: React.CSSProperties | string; // Inline styles (object or JSON string)
  children?: React.ReactNode;  // React children (alternative to innerHTML)
  cssRenderMode?: 'auto' | 'inherit' | 'custom'; // How to handle CSS for HTML content

  // Visual builder internal props
  _positioningMode?: 'absolute' | 'grid' | 'normal';
  _isInGrid?: boolean;
  _onContentChange?: (innerHTML: string, cssRenderMode?: string) => void; // Callback for content updates
}

/**
 * CustomHTMLElement - Flexible HTML component for the visual builder
 *
 * Allows users to insert custom HTML content that gets sanitized for security
 * and integrates fully with the universal styling system. Supports double-click
 * editing with a simple popup interface.
 */
export default function CustomHTMLElement({
  tagName = 'div',
  innerHTML = '',
  content = '',
  className = '',
  style,
  children,
  cssRenderMode = 'auto',
  _positioningMode = 'normal',
  _isInGrid = false,
  _onContentChange,
  ...rest
}: CustomHTMLElementProps & { cssrendermode?: string }) {
  // Get CSS render mode from context
  // Note: Advanced templates use forced 'disable' mode, so context may not be relevant
  const contextCSSRenderMode = useResidentCSSRenderMode();

  // Extract lowercase cssrendermode from rest props if it exists
  const lowercaseCSSRenderMode = (rest as any).cssrendermode;

  // Determine the effective CSS render mode
  const effectiveCSSRenderMode = useMemo(() => {
    // Resolve the actual CSS render mode from both potential prop names
    // Priority: lowercase cssrendermode > camelCase cssRenderMode > context > default
    const resolvedMode = lowercaseCSSRenderMode || cssRenderMode;

    // Component explicit settings take priority over context
    // Context is only used as fallback when component doesn't specify a mode
    return resolvedMode || contextCSSRenderMode || getDefaultComponentCSSRenderMode();
  }, [cssRenderMode, lowercaseCSSRenderMode, contextCSSRenderMode]);

  // Separate styling props from DOM props to prevent invalid HTML attributes
  const { styleProps, otherProps } = separateUniversalStyleProps(rest);

  // Clean other props - universal styling system already filtered out style props
  // Any remaining props in otherProps are safe to pass to DOM
  const cleanOtherProps = otherProps;

  // Generate universal styles
  const universalStyles = useUniversalStyles(styleProps, 'CustomHTMLElement');

  // Handle double-click to edit
  const handleDoubleClick = useCallback((_e: React.MouseEvent) => {
    // No-op: visual builder editing removed
  }, []);

  // Parse style prop if it's a CSS string
  const parsedStyle = typeof style === 'string' ?
    (() => {
      // Parse CSS string like "color: blue; font-size: 16px"
      const styles: Record<string, string> = {};
      style.split(';').forEach(declaration => {
        const colonIndex = declaration.indexOf(':');
        if (colonIndex > 0) {
          const property = declaration.slice(0, colonIndex).trim();
          const value = declaration.slice(colonIndex + 1).trim();
          if (property && value) {
            // Convert kebab-case to camelCase for React style objects
            const camelProperty = property.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
            styles[camelProperty] = value;
          }
        }
      });
      return styles;
    })() : (style || {});

  // Generate CSS class name based on render mode
  const getCSSModeClassName = (): string => {
    if (effectiveCSSRenderMode === 'auto') return 'custom-html-auto-reset';
    if (effectiveCSSRenderMode === 'inherit') return 'custom-html-inherit';
    if (effectiveCSSRenderMode === 'custom') return 'custom-html-custom';
    return '';
  };

  // Combine classes
  const finalClassName = [
    className,
    // CSS mode-specific class (always applicable)
    getCSSModeClassName(),
  ].filter(Boolean).join(' ');

  // Combine styles
  const finalStyle: React.CSSProperties = {
    ...parsedStyle,
    ...universalStyles,
  };

  // Determine content to display - consistent between environments
  const resolvedContent = useMemo(() => {
    // Priority: content > innerHTML > children (string)
    const activeContent = content || innerHTML || (typeof children === 'string' ? children : '');

    if (activeContent && activeContent.trim()) {
      return {
        content: activeContent,
        useInnerHTML: true
      };
    }

    // Consistent fallback for both environments - empty content
    // Visual builder placeholder only shown via title attribute
    return {
      content: '',
      useInnerHTML: false
    };
  }, [content, innerHTML, children]);

  const { content: contentToShow, useInnerHTML } = resolvedContent;


  // Create element props
  const elementProps = {
    className: finalClassName,
    style: finalStyle,
    onDoubleClick: handleDoubleClick,
    ...cleanOtherProps
  };

  return (
    <>
      {/* CSS styles - only inject when auto mode is enabled to minimize pollution */}
      {effectiveCSSRenderMode === 'auto' && (
        <style dangerouslySetInnerHTML={{
          __html: `
            @layer threadstead-template {
              /* Auto mode - Maximum specificity to override ALL Tailwind utilities */

              /* Container styling - override flex layout */
              .custom-html-auto-reset {
                line-height: 1.5 !important;
                /* Force container to allow block children even if parent has flex */
                display: block !important;
              }

              /* CRITICAL: Override any flex/inline layouts from Tailwind on the container */
              div.custom-html-auto-reset.custom-html-auto-reset {
                display: block !important;
                flex-direction: unset !important;
                align-items: unset !important;
                justify-content: unset !important;
              }

              /* Block elements with maximum specificity to beat Tailwind utilities */
              .custom-html-auto-reset h1,
              .custom-html-auto-reset h2,
              .custom-html-auto-reset h3,
              .custom-html-auto-reset h4,
              .custom-html-auto-reset h5,
              .custom-html-auto-reset h6 {
                display: block !important;
                margin: 0.75em 0 !important;
                font-weight: bold !important;
                line-height: 1.2 !important;
                /* Override any flex item properties */
                flex: none !important;
                align-self: unset !important;
                width: auto !important;
              }

              /* Specific heading sizes */
              .custom-html-auto-reset h1 { font-size: 2em !important; }
              .custom-html-auto-reset h2 { font-size: 1.5em !important; }
              .custom-html-auto-reset h3 { font-size: 1.17em !important; }
              .custom-html-auto-reset h4 { font-size: 1em !important; }
              .custom-html-auto-reset h5 { font-size: 0.83em !important; }
              .custom-html-auto-reset h6 { font-size: 0.67em !important; }

              /* Paragraph and text elements with anti-flex properties */
              .custom-html-auto-reset p {
                display: block !important;
                margin: 1em 0 !important;
                line-height: 1.5 !important;
                /* Override any flex item properties */
                flex: none !important;
                align-self: unset !important;
                width: auto !important;
              }

              /* Block containers */
              .custom-html-auto-reset div {
                display: block !important;
              }

              /* Lists */
              .custom-html-auto-reset ul,
              .custom-html-auto-reset ol {
                display: block !important;
                margin: 1em 0 !important;
                padding-left: 2em !important;
              }

              .custom-html-auto-reset li {
                display: list-item !important;
                margin: 0.25em 0 !important;
              }

              /* Line breaks */
              .custom-html-auto-reset br {
                display: block !important;
                margin: 0.5em 0 !important;
              }

              /* Spacing between consecutive elements */
              .custom-html-auto-reset h1 + *,
              .custom-html-auto-reset h2 + *,
              .custom-html-auto-reset h3 + *,
              .custom-html-auto-reset h4 + *,
              .custom-html-auto-reset h5 + *,
              .custom-html-auto-reset h6 + *,
              .custom-html-auto-reset p + * {
                margin-top: 1em !important;
              }
            }
          `
        }} />
      )}

      {/* Minimal inherit mode styles */}
      {effectiveCSSRenderMode === 'inherit' && (
        <style dangerouslySetInnerHTML={{
          __html: `
            @layer threadstead-template {
              .custom-html-inherit {
                line-height: inherit !important;
              }
            }
          `
        }} />
      )}

      {/* Custom mode styles - essential block-level styling while allowing customization */}
      {effectiveCSSRenderMode === 'custom' && (
        <style dangerouslySetInnerHTML={{
          __html: `
            @layer threadstead-template {
              /* Custom mode - Essential block-level styling with customization flexibility */
              .custom-html-custom {
                line-height: 1.4 !important;
                display: block !important; /* Ensure container is block */
              }

              /* Essential block-level styling for headings */
              .custom-html-custom h1,
              .custom-html-custom h2,
              .custom-html-custom h3,
              .custom-html-custom h4,
              .custom-html-custom h5,
              .custom-html-custom h6 {
                display: block !important;
                margin: 0.67em 0 !important;
                font-weight: bold !important;
                line-height: 1.2 !important;
              }

              /* Specific heading sizes - similar to auto mode but less aggressive */
              .custom-html-custom h1 { font-size: 2em !important; }
              .custom-html-custom h2 { font-size: 1.5em !important; }
              .custom-html-custom h3 { font-size: 1.17em !important; }
              .custom-html-custom h4 { font-size: 1em !important; }
              .custom-html-custom h5 { font-size: 0.83em !important; }
              .custom-html-custom h6 { font-size: 0.67em !important; }

              /* Essential paragraph styling */
              .custom-html-custom p {
                display: block !important;
                margin: 1em 0 !important;
                line-height: 1.5 !important;
              }

              /* Block containers */
              .custom-html-custom div {
                display: block !important;
              }

              /* Ensure critical elements maintain basic functionality */
              .custom-html-custom * {
                box-sizing: border-box;
              }

              /* Basic link functionality */
              .custom-html-custom a {
                cursor: pointer;
              }

              /* Basic list functionality */
              .custom-html-custom ul,
              .custom-html-custom ol {
                display: block !important;
                margin: 1em 0 !important;
                padding-left: 2em !important;
                list-style-position: inside;
              }

              .custom-html-custom li {
                display: list-item !important;
                margin: 0.25em 0 !important;
              }

              /* Line breaks */
              .custom-html-custom br {
                display: block !important;
                margin: 0.5em 0 !important;
              }
            }
          `
        }} />
      )}

      {contentToShow ? (
        useInnerHTML ? (
          React.createElement(tagName, {
            ...elementProps,
            dangerouslySetInnerHTML: { __html: contentToShow }
          })
        ) : (
          React.createElement(tagName, elementProps, contentToShow)
        )
      ) : null}

    </>
  );
}