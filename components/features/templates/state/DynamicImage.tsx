'use client';

import React from 'react';
import { useTemplateState } from '@/lib/templates/state/TemplateStateProvider';
import { useForEachContext } from './loops/ForEach';
import { globalTemplateStateManager } from '@/lib/templates/state/TemplateStateManager';

/**
 * DynamicImage Component - Image with src bound to a template variable
 *
 * Renders an <img> tag with the src attribute dynamically bound to a variable value.
 * Solves the limitation that HTML attributes don't support $vars interpolation.
 *
 * @example
 * ```xml
 * <Var name="profilePic" type="string" initial="https://example.com/avatar.jpg" />
 * <DynamicImage var="profilePic" alt="Profile Picture" />
 *
 * <Var name="currentImage" type="computed" expression="$vars.images[$vars.currentIndex]" />
 * <DynamicImage var="currentImage" alt="Gallery" width="500" height="400" />
 * ```
 */

export interface DynamicImageProps {
  /** Variable name containing the image URL */
  var: string;

  /** Alt text for accessibility */
  alt?: string;

  /** Image width (CSS value or number in pixels) */
  width?: string | number;

  /** Image height (CSS value or number in pixels) */
  height?: string | number;

  /** Additional CSS classes */
  className?: string;

  /** Scope ID for scoped variable resolution (provided by ForEach) */
  scopeId?: string;

}

export default function DynamicImage(props: DynamicImageProps) {
  const {
    var: varName,
    alt = '',
    width,
    height,
    className,
    scopeId: propScopeId,
  } = props;

  // IMPORTANT: Always call hooks before any conditional returns
  const templateState = useTemplateState();
  const forEachContext = useForEachContext();

  // CRITICAL: Validate required props (after hooks)
  if (!varName) {
    return (
      <div style={{
        padding: '12px',
        margin: '8px 0',
        backgroundColor: '#fef2f2',
        border: '2px solid #dc2626',
        borderRadius: '6px',
        color: '#dc2626',
        fontSize: '13px'
      }}>
        ⚠️ <strong>DynamicImage Error:</strong> Missing required <code>var</code> prop.
        Example: <code>&lt;DynamicImage var=&quot;imageUrl&quot; alt=&quot;Description&quot; /&gt;</code>
      </div>
    );
  }

  // Determine which scope to use: prop (from ForEach processing) or context (from non-island component)
  const scopeId = propScopeId || forEachContext?.scopeId;

  // Resolve variable value using scoped resolution
  let imageUrl: string;

  if (scopeId) {
    // Use scoped variable resolution (works across islands)
    const scopedValue = globalTemplateStateManager.getVariableInScope(scopeId, varName);
    imageUrl = scopedValue ? String(scopedValue) : '';
  } else {
    // No scope - use global template variables
    const variable = templateState.variables[varName];
    imageUrl = variable?.value ? String(variable.value) : '';
  }

  // Build style object if width/height provided
  const style: React.CSSProperties = {};
  if (width) {
    style.width = typeof width === 'number' ? `${width}px` : width;
  }
  if (height) {
    style.height = typeof height === 'number' ? `${height}px` : height;
  }

  // Build className
  const baseClasses = 'template-dynamic-image';
  const finalClassName = className
    ? `${baseClasses} ${className}`
    : baseClasses;

  // Normal mode - render actual image
  // Handle missing/invalid URL gracefully
  if (!imageUrl) {
    return (
      <div
        className={`${finalClassName} flex items-center justify-center bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded`}
        style={style}
      >
        <div className="text-center text-gray-400 dark:text-gray-500 text-sm">
          <div className="text-2xl mb-1">🖼️</div>
          <div>No image</div>
        </div>
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt={alt}
      className={finalClassName}
      style={Object.keys(style).length > 0 ? style : undefined}
    />
  );
}
