'use client';

import React, { useEffect, useMemo } from 'react';
import { useTemplateStateWithDeps } from '@/lib/templates/state/TemplateStateProvider';
import { useOnChangeHandler, filterOnChangeChildren } from '../events/OnChange';

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

  /** Children (OnChange handlers) */
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
    children
  } = props;

  // IMPORTANT: Always call hooks before any conditional returns
  // PHASE 1.1: Use selective subscription - only re-render when this specific variable changes
  const dependencies = useMemo(() => varName ? [varName] : [], [varName]);
  const templateState = useTemplateStateWithDeps(dependencies);

  // Extract OnChange handler from children
  const changeHandler = useOnChangeHandler(children);

  // CRITICAL: Validate required props (after hooks)
  if (!varName) {
    console.error('[TInput] Missing required "var" prop');
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
        ⚠️ <strong>TInput Error:</strong> Missing required <code>var</code> prop.
        Example: <code>&lt;TInput var=&quot;myVariable&quot; /&gt;</code>
      </div>
    );
  }

  // Convert string booleans to actual booleans
  const isMultiline = multiline === true || multiline === 'true';

  // PHASE 1.1 FIX: Use getVariable() to get current value, not stale snapshot
  const currentValue = templateState.getVariable(varName) ?? '';

  // Handle value changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    let newValue: any = e.target.value;

    // Convert to number if type is number
    if (type === 'number' && newValue !== '') {
      newValue = Number(newValue);
    }

    templateState.setVariable(varName, newValue);

    // Execute OnChange handler if present
    if (changeHandler) {
      changeHandler(newValue);
    }
  };

  // Build className
  const baseClasses = 'template-input px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500';
  const finalClassName = customClassName
    ? `${baseClasses} ${customClassName}`
    : baseClasses;

  // Normal mode - render functional input
  if (isMultiline) {
    return (
      <>
        <textarea
          placeholder={placeholder}
          rows={typeof rows === 'string' ? parseInt(rows) : rows}
          disabled={disabled}
          className={finalClassName}
          value={String(currentValue)}
          onChange={handleChange}
        />
        {children}
      </>
    );
  } else {
    return (
      <>
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
        {children}
      </>
    );
  }
}
