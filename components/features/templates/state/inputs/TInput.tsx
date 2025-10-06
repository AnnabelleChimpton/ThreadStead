'use client';

import React from 'react';
import { useTemplateState } from '@/lib/templates/state/TemplateStateProvider';

/**
 * TInput Component - Text/number input bound to a template variable
 *
 * Named "TInput" (Template Input) to avoid conflict with HTML <input> element.
 * Provides a controlled input that automatically syncs with template state.
 *
 * @example
 * ```xml
 * <TInput var="username" placeholder="Enter your name" />
 * <TInput var="email" type="email" placeholder="you@example.com" />
 * <TInput var="age" type="number" min="0" max="120" />
 * <TInput var="bio" multiline="true" rows="4" placeholder="About you..." />
 * ```
 */

export interface TInputProps {
  /** Variable name to bind */
  var: string;

  /** Input type */
  type?: 'text' | 'email' | 'number' | 'password' | 'url' | 'tel';

  /** Placeholder text */
  placeholder?: string;

  /** Minimum value (for type="number") */
  min?: number | string;

  /** Maximum value (for type="number") */
  max?: number | string;

  /** Step value (for type="number") */
  step?: number | string;

  /** Use textarea instead of input */
  multiline?: boolean | string;

  /** Rows for textarea (when multiline=true) */
  rows?: number | string;

  /** Additional CSS classes */
  className?: string;

  /** Disabled state */
  disabled?: boolean;

  /** Internal: Visual builder mode flag */
  __visualBuilder?: boolean;
  _isInVisualBuilder?: boolean;

  /** Children (ignored) */
  children?: React.ReactNode;
}

export default function TInput(props: TInputProps) {
  const {
    var: varName,
    type = 'text',
    placeholder,
    min,
    max,
    step,
    multiline,
    rows = 3,
    className: customClassName,
    disabled = false,
    __visualBuilder,
    _isInVisualBuilder
  } = props;

  const templateState = useTemplateState();
  const isVisualBuilder = __visualBuilder === true || _isInVisualBuilder === true;

  // Convert string booleans to actual booleans
  const isMultiline = multiline === true || multiline === 'true';

  // Get current value from template state (reactive)
  const variable = templateState.variables[varName];
  const currentValue = variable?.value ?? '';

  // Handle value changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    let newValue: any = e.target.value;

    // Convert to number if type is number
    if (type === 'number' && newValue !== '') {
      newValue = Number(newValue);
    }

    templateState.setVariable(varName, newValue);
  };

  // Build className
  const baseClasses = 'template-input px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500';
  const finalClassName = customClassName
    ? `${baseClasses} ${customClassName}`
    : baseClasses;

  // Visual builder mode - show disabled input with indicator
  if (isVisualBuilder) {
    if (isMultiline) {
      return (
        <div className="inline-block relative">
          <textarea
            placeholder={placeholder}
            rows={typeof rows === 'string' ? parseInt(rows) : rows}
            disabled
            className={`${finalClassName} opacity-70 bg-gray-50 dark:bg-gray-800`}
            value={`[Bound to $vars.${varName}]`}
            readOnly
          />
          <div className="absolute -top-2 -right-2 px-1 py-0.5 bg-blue-500 text-white text-xs rounded">
            📝 TInput
          </div>
        </div>
      );
    } else {
      return (
        <div className="inline-block relative">
          <input
            type={type}
            placeholder={placeholder}
            disabled
            className={`${finalClassName} opacity-70 bg-gray-50 dark:bg-gray-800`}
            value={`[Bound to $vars.${varName}]`}
            readOnly
          />
          <div className="absolute -top-2 -right-2 px-1 py-0.5 bg-blue-500 text-white text-xs rounded">
            📝 TInput
          </div>
        </div>
      );
    }
  }

  // Normal mode - render functional input
  if (isMultiline) {
    return (
      <textarea
        placeholder={placeholder}
        rows={typeof rows === 'string' ? parseInt(rows) : rows}
        disabled={disabled}
        className={finalClassName}
        value={String(currentValue)}
        onChange={handleChange}
      />
    );
  } else {
    return (
      <input
        type={type}
        placeholder={placeholder}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        className={finalClassName}
        value={String(currentValue)}
        onChange={handleChange}
      />
    );
  }
}
