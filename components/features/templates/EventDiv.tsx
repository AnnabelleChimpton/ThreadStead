'use client';

import React from 'react';
import { UniversalCSSProps, separateCSSProps, applyCSSProps, removeTailwindConflicts } from '@/lib/templates/styling/universal-css-props';
import { useOnHoverHandler, filterOnHoverChildren } from './state/events/OnHover';
import { useOnMouseEnterHandler } from './state/events/OnMouseEnter';
import { useOnMouseLeaveHandler } from './state/events/OnMouseLeave';

/**
 * EventDiv Component - Interactive div that supports event handlers
 *
 * A div wrapper that integrates with template event handlers like OnHover,
 * OnMouseEnter, OnMouseLeave. Use this instead of native <div> when you need
 * event handling in templates.
 *
 * @example
 * ```xml
 * <EventDiv class="p-4 border-2 rounded">
 *   <OnHover>
 *     <Increment var="hoverCount" />
 *   </OnHover>
 *   <p>Hover over me!</p>
 * </EventDiv>
 *
 * <EventDiv class="p-4 rounded">
 *   <OnMouseEnter>
 *     <Set var="isHovering" value="true" />
 *   </OnMouseEnter>
 *   <OnMouseLeave>
 *     <Set var="isHovering" value="false" />
 *   </OnMouseLeave>
 *   <p>Mouse tracking area</p>
 * </EventDiv>
 * ```
 */

export interface EventDivProps extends UniversalCSSProps {
  /** Div content and event handlers */
  children?: React.ReactNode;

  /** Additional CSS classes */
  className?: string;
  class?: string; // Allow both className and class

  /** HTML id attribute */
  id?: string;

  /** Inline styles */
  style?: React.CSSProperties;

  /** Internal: Visual builder mode flag */
  __visualBuilder?: boolean;
  _isInVisualBuilder?: boolean;
}

export default function EventDiv(props: EventDivProps) {
  const { cssProps, componentProps } = separateCSSProps(props);
  const {
    children,
    className: customClassName,
    class: customClass,
    id,
    style: inlineStyle,
    __visualBuilder,
    _isInVisualBuilder
  } = componentProps;

  const isVisualBuilder = __visualBuilder === true || _isInVisualBuilder === true;

  // Extract event handlers from children
  const hoverHandlers = useOnHoverHandler(children);
  const mouseEnterHandler = useOnMouseEnterHandler(children);
  const mouseLeaveHandler = useOnMouseLeaveHandler(children);

  // Filter out event handler components from visible children
  const visibleChildren = React.useMemo(() => {
    const eventComponentNames = ['OnHover', 'OnMouseEnter', 'OnMouseLeave'];
    const filtered: React.ReactNode[] = [];

    React.Children.forEach(children, (child) => {
      if (!React.isValidElement(child)) {
        filtered.push(child);
        return;
      }

      // Unwrap ResidentDataProvider if present
      let actualChild = child;
      if (typeof child.type === 'function' &&
          (child.type.name === 'ResidentDataProvider' ||
           (child.type as any).displayName === 'ResidentDataProvider')) {
        const providerChildren = React.Children.toArray((child.props as any).children);
        if (providerChildren.length > 0 && React.isValidElement(providerChildren[0])) {
          actualChild = providerChildren[0];
        }
      }

      // Check if this is an event handler component
      const componentName = typeof actualChild.type === 'function'
        ? actualChild.type.name || (actualChild.type as any).displayName
        : '';

      // Skip event handler components
      if (!eventComponentNames.includes(componentName)) {
        filtered.push(child);
      }
    });

    return filtered;
  }, [children]);

  // Apply CSS properties as inline styles
  const cssStyle = applyCSSProps(cssProps);
  const finalStyle = { ...cssStyle, ...inlineStyle };

  // Build className - support both className and class props
  const baseClasses = 'template-event-div';
  const filteredClasses = removeTailwindConflicts(baseClasses, cssProps);
  const userClasses = customClassName || customClass || '';
  const finalClassName = userClasses
    ? `${filteredClasses} ${userClasses}`
    : filteredClasses;

  // Combine handlers - prefer specific handlers over OnHover
  const onMouseEnterFn = mouseEnterHandler || hoverHandlers.onMouseEnter;
  const onMouseLeaveFn = mouseLeaveHandler || hoverHandlers.onMouseLeave;

  // Visual builder mode - show indicator
  if (isVisualBuilder) {
    return (
      <div
        id={id}
        className={`${finalClassName} border-2 border-dashed border-green-400 dark:border-green-600 relative`}
        style={finalStyle}
      >
        <div className="absolute -top-2 -right-2 px-2 py-0.5 bg-green-500 text-white text-xs rounded font-mono">
          🎯 EventDiv
        </div>
        {visibleChildren}
      </div>
    );
  }

  // Normal mode - functional div with event handlers
  return (
    <div
      id={id}
      className={finalClassName}
      style={finalStyle}
      onMouseEnter={onMouseEnterFn || undefined}
      onMouseLeave={onMouseLeaveFn || undefined}
    >
      {visibleChildren}
    </div>
  );
}
