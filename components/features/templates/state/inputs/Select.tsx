'use client';

import React from 'react';
import { useTemplateState } from '@/lib/templates/state/TemplateStateProvider';
import { useOnChangeHandler, filterOnChangeChildren } from '../events/OnChange';
import { Option, OptionProps } from '../Var';

/**
 * Select Component - Dropdown selection bound to a template variable
 *
 * Provides a controlled select dropdown that automatically syncs with template state.
 * Must contain Option children components.
 *
 * @example
 * ```xml
 * <Select var="theme">
 *   <Option value="retro">🕹️ Retro</Option>
 *   <Option value="neon">✨ Neon</Option>
 *   <Option value="minimal">⚪ Minimal</Option>
 * </Select>
 * ```
 */

export interface SelectProps {
  /** Variable name to bind */
  var: string;

  /** Placeholder text */
  placeholder?: string;

  /** Additional CSS classes */
  className?: string;

  /** Disabled state */
  disabled?: boolean;

  /** Internal: Visual builder mode flag */
  __visualBuilder?: boolean;
  _isInVisualBuilder?: boolean;

  /** Option children + optional OnChange */
  children?: React.ReactNode;
}

export default function Select(props: SelectProps) {
  const {
    var: varName,
    placeholder,
    className: customClassName,
    disabled = false,
    __visualBuilder,
    _isInVisualBuilder,
    children
  } = props;

  const templateState = useTemplateState();
  const isVisualBuilder = __visualBuilder === true || _isInVisualBuilder === true;

  // Get OnChange handler if present
  const onChangeHandler = useOnChangeHandler(children);
  const filteredChildren = filterOnChangeChildren(children);

  // Get current value from template state (reactive)
  // Try both unprefixed and prefixed versions (user-content- workaround)
  let variable = templateState.variables[varName];
  if (!variable && !varName.startsWith('user-content-')) {
    variable = templateState.variables[`user-content-${varName}`];
  }
  const currentValue = variable?.value;

  // Extract Option children
  const options: Array<{ value: any; label: React.ReactNode }> = [];
  React.Children.forEach(filteredChildren, (child) => {
    if (!React.isValidElement(child)) return;

    // Unwrap ResidentDataProvider if present (islands architecture)
    let actualChild = child;
    if (typeof child.type === 'function' &&
        (child.type.name === 'ResidentDataProvider' ||
         (child.type as any).displayName === 'ResidentDataProvider')) {
      const providerChildren = React.Children.toArray((child.props as any).children);
      if (providerChildren.length > 0 && React.isValidElement(providerChildren[0])) {
        actualChild = providerChildren[0];
      }
    }

    const componentName = typeof actualChild.type === 'function'
      ? actualChild.type.name || (actualChild.type as any).displayName
      : '';

    if (componentName === 'Option') {
      const optionProps = actualChild.props as OptionProps;
      options.push({
        value: optionProps.value,
        label: optionProps.children || optionProps.value
      });
    }
  });

  // Handle value changes
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedValue = e.target.value;

    // Try to find the actual option value (might be non-string)
    const matchingOption = options.find(opt => String(opt.value) === selectedValue);
    const actualValue = matchingOption ? matchingOption.value : selectedValue;

    templateState.setVariable(varName, actualValue);

    // Execute OnChange handler if present
    if (onChangeHandler) {
      onChangeHandler(actualValue);
    }
  };

  // Build className
  const baseClasses = 'template-select px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500';
  const finalClassName = customClassName
    ? `${baseClasses} ${customClassName}`
    : baseClasses;

  // Visual builder mode - show disabled select with indicator
  if (isVisualBuilder) {
    return (
      <div className="inline-block relative">
        <select
          disabled
          className={`${finalClassName} opacity-70`}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((opt, idx) => (
            <option key={idx} value={String(opt.value)}>
              {opt.label}
            </option>
          ))}
        </select>
        <div className="absolute -top-2 -right-2 px-1 py-0.5 bg-purple-500 text-white text-xs rounded">
          📋 Select
        </div>
      </div>
    );
  }

  // Normal mode - render functional select
  return (
    <select
      disabled={disabled}
      value={currentValue !== undefined ? String(currentValue) : ''}
      onChange={handleChange}
      className={finalClassName}
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options.map((opt, idx) => (
        <option key={idx} value={String(opt.value)}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

// Re-export Option for convenience
export { Option };
