'use client';

import React from 'react';
import { UniversalCSSProps, separateCSSProps, applyCSSProps, removeTailwindConflicts } from '@/lib/templates/styling/universal-css-props';
import { useOnClickHandler, filterOnClickChildren } from './state/events/OnClick';

/**
 * Button Component - Interactive button that supports OnClick event handlers
 *
 * This component wraps a native HTML button and integrates with the
 * template variable system's OnClick event handler. An OnClick anywhere
 * else runs on the element it sits in (element-events.tsx); here the
 * Button runs it, with target="this" meaning the button.
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

}

export default function Button(props: ButtonProps) {
  const { cssProps, componentProps } = separateCSSProps(props);
  const {
    children,
    className: customClassName,
    id,
    type = 'button',
    disabled = false,
  } = componentProps;

  // aria-* as the page wrote them (aria-pressed, aria-expanded, aria-controls)
  const ariaProps = Object.fromEntries(Object.entries(props).filter(([name]) => name.startsWith('aria-')));

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

  return (
    <button
      {...ariaProps}
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
