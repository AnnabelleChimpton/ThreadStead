'use client';

import React from 'react';
import { UniversalCSSProps, separateCSSProps, applyCSSProps, removeTailwindConflicts } from '@/lib/templates/styling/universal-css-props';
import { useOnClickHandler, filterOnClickChildren } from './state/events/OnClick';

/**
 * Button Component - Interactive button that supports OnClick event handlers
 *
 * This component wraps a native HTML button and integrates with the
 * template variable system's OnClick event handler.
 *
 * @example
 * ```xml
 * <Button>
 *   <OnClick>
 *     <Set var="counter" expression="$vars.counter + 1" />
 *   </OnClick>
 *   Click me!
 * </Button>
 * ```
 */

export interface ButtonProps extends UniversalCSSProps {
  /** Button content and OnClick handlers */
  children?: React.ReactNode;

  /** Additional CSS classes */
  className?: string;

  /** Element ID */
  id?: string;

  /** Button type (button, submit, reset) */
  type?: 'button' | 'submit' | 'reset';

  /** Disabled state */
  disabled?: boolean;

  /** Internal: Visual builder mode flag */
  __visualBuilder?: boolean;
  _isInVisualBuilder?: boolean;
}

export default function Button(props: ButtonProps) {
  const { cssProps, componentProps } = separateCSSProps(props);
  const {
    children,
    className: customClassName,
    id,
    type = 'button',
    disabled = false,
    __visualBuilder,
    _isInVisualBuilder
  } = componentProps;

  const isVisualBuilder = __visualBuilder === true || _isInVisualBuilder === true;

  // Extract OnClick handler from children
  const clickHandler = useOnClickHandler(children);

  // Filter out OnClick components from visible children
  const visibleChildren = filterOnClickChildren(children);

  // Apply CSS properties as inline styles
  const style = applyCSSProps(cssProps);

  // Build className
  const baseClasses = 'template-button';
  const filteredClasses = removeTailwindConflicts(baseClasses, cssProps);
  const finalClassName = customClassName
    ? `${filteredClasses} ${customClassName}`
    : filteredClasses;

  // Visual builder mode - show indicator
  if (isVisualBuilder) {
    return (
      <div className={`${finalClassName} inline-block relative border-2 border-dashed border-blue-400 dark:border-blue-600 p-2 rounded`} style={style}>
        <button
          type={type}
          disabled={true}
          className="opacity-70"
        >
          {visibleChildren}
        </button>
        {clickHandler && (
          <div className="absolute -top-2 -right-2 px-1 py-0.5 bg-blue-500 text-white text-xs rounded">
            📌 OnClick
          </div>
        )}
      </div>
    );
  }

  // Normal mode - render functional button
  return (
    <button
      id={id}
      type={type}
      disabled={disabled}
      className={finalClassName}
      style={style}
      onClick={clickHandler || undefined}
    >
      {visibleChildren}
    </button>
  );
}
