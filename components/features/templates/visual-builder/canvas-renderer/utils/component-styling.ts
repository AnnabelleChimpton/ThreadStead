/**
 * Component Styling Utilities
 *
 * Handles component styling logic for the visual builder canvas including:
 * - Category-based sizing strategies (full-width, content-driven, fixed)
 * - User CSS property overrides
 * - Animation states
 * - Z-index management
 *
 * Extracted from CanvasRenderer.tsx Phase 2 Step 3
 */

import type { ComponentItem } from '@/hooks/useCanvasState';
import { getComponentSizingCategory } from '@/lib/templates/visual-builder/grid-utils';

export interface ComponentStyleParams {
  component: ComponentItem;
  currentPosition: { x: number; y: number };
  isSelected: boolean;
  isDragging: boolean;
  isNewlyAdded: boolean;
  isRemoving: boolean;
}

export interface ComponentStyleResult {
  componentStyle: React.CSSProperties;
  wrapperStyle: React.CSSProperties;
}

/**
 * Calculate component styles based on type, category, and state
 */
export function calculateComponentStyles(params: ComponentStyleParams): ComponentStyleResult {
  const { component, currentPosition, isSelected, isDragging, isNewlyAdded, isRemoving } = params;

  let componentStyle: React.CSSProperties;

  // Get size from either visualBuilderState or legacy props
  const componentSize = component.visualBuilderState?.size || component.props?._size;
  const componentCategory = getComponentSizingCategory(component.type);

  // Special case: Always treat ThreadsteadNavigation as full-width
  const isNavigation = component.type.toLowerCase().includes('navigation');

  // Apply different sizing strategies based on component type
  if (componentCategory === 'full-width' || isNavigation) {
    // Full-width components (like navigation) take full canvas width
    componentStyle = {
      position: 'absolute',
      left: 0, // Always align to left edge
      top: currentPosition.y,
      width: '100%', // Full canvas width
      minWidth: '100%',
      height: 'auto', // Let content determine height
      minHeight: '70px', // Minimum navigation height
      maxHeight: '100px', // Prevent excessive height
      zIndex: 100, // Ensure navigation stays above other components
    };
  } else if (componentCategory === 'content-driven') {
    // Content-driven components (like Paragraph) should have flexible width
    // Handle both number (visualBuilderState.size) and string (props._size) formats
    const userWidth = componentSize?.width
      ? (typeof componentSize.width === 'number'
          ? componentSize.width
          : parseInt(String(componentSize.width).replace(/px$/, ''), 10))
      : 200;
    const userHeight = componentSize?.height
      ? (typeof componentSize.height === 'number'
          ? componentSize.height
          : parseInt(String(componentSize.height).replace(/px$/, ''), 10))
      : 150;

    componentStyle = {
      position: 'absolute' as const,
      left: currentPosition.x,
      top: currentPosition.y,
      // Use flexible width sizing to match AdvancedProfileRenderer behavior
      minWidth: `${userWidth}px`,
      minHeight: `${userHeight}px`,
      maxWidth: `${Math.min(Math.max(userWidth * 1.5, 400), 600)}px`, // Cap at 600px for consistent text wrapping
      width: 'fit-content',
      height: 'fit-content',
    };
  } else {
    // Other components use fixed sizing
    componentStyle = {
      position: 'absolute' as const,
      left: currentPosition.x,
      top: currentPosition.y,
      // Apply size if specified - handle both number and string formats
      width: componentSize?.width !== 'auto'
        ? (typeof componentSize?.width === 'number' ? `${componentSize.width}px` : componentSize?.width)
        : 'auto',
      height: componentSize?.height !== 'auto'
        ? (typeof componentSize?.height === 'number' ? `${componentSize.height}px` : componentSize?.height)
        : 'auto',
      minWidth: 50,
      minHeight: 30,
    };
  }

  // Helper to get CSS property from component props
  const getCSSProp = (key: string) => {
    // Check both props and publicProps for CSS properties
    if (component.publicProps && component.publicProps[key as keyof typeof component.publicProps] !== undefined) {
      return component.publicProps[key as keyof typeof component.publicProps];
    }
    if (component.props && component.props[key] !== undefined) {
      return component.props[key];
    }
    return undefined;
  };

  // Apply user-set CSS positioning properties (they take precedence over defaults)
  const userPosition = getCSSProp('position');
  const userZIndex = getCSSProp('zIndex');
  const userMinWidth = getCSSProp('minWidth');
  const userMaxWidth = getCSSProp('maxWidth');
  const userMinHeight = getCSSProp('minHeight');
  const userMaxHeight = getCSSProp('maxHeight');

  // Override position mode if user set it (unless it's navigation which must stay absolute)
  if (userPosition && !isNavigation) {
    // Convert 'fixed' to 'absolute' in visual builder to prevent canvas overflow
    // Fixed positioning escapes canvas boundaries (bad UX)
    const visualBuilderPosition = userPosition === 'fixed' ? 'absolute' : userPosition;
    componentStyle.position = visualBuilderPosition as any;
  }

  // Override z-index if user set it
  if (userZIndex !== undefined) {
    componentStyle.zIndex = Number(userZIndex);
  }

  // Override size constraints if user set them
  if (userMinWidth) componentStyle.minWidth = userMinWidth;
  if (userMaxWidth) componentStyle.maxWidth = userMaxWidth;
  if (userMinHeight) componentStyle.minHeight = userMinHeight;
  if (userMaxHeight) componentStyle.maxHeight = userMaxHeight;

  // Calculate wrapper style with animation states
  const wrapperStyle: React.CSSProperties = (componentCategory === 'full-width' || isNavigation) ? {
    position: 'absolute' as const,
    left: 0, // Always left-aligned
    top: currentPosition.y,
    width: '100%', // Full width
    height: 'auto', // Auto height
    minHeight: '70px',
    maxHeight: '100px',
    zIndex: isDragging ? 10 : (isSelected ? 5 : 100), // Higher z-index for navigation
    transform: isNewlyAdded ? 'scale(0.8)' : isRemoving ? 'scale(0.8)' : 'scale(1)',
    opacity: isRemoving ? 0 : 1,
    ...(isNewlyAdded && {
      animation: 'scaleInBounce 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards'
    })
  } : {
    ...componentStyle,
    zIndex: isDragging ? 10 : (isSelected ? 5 : 1),
    transform: isNewlyAdded ? 'scale(0.8)' : isRemoving ? 'scale(0.8)' : 'scale(1)',
    opacity: isRemoving ? 0 : 1,
    ...(isNewlyAdded && {
      animation: 'scaleInBounce 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards'
    })
  };

  return { componentStyle, wrapperStyle };
}
