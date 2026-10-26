'use client';

import React, { useMemo } from 'react';
import { useTemplateStateWithDeps } from '@/lib/templates/state/TemplateStateProvider';
import { useOnChangeHandler } from '../events/OnChange';

/**
 * Checkbox Component - Checkbox input bound to a boolean template variable
 *
 * Provides a controlled checkbox that automatically syncs with template state.
 *
 * @example
 * ```xml
 * <Checkbox var="agreedToTerms" label="I agree to the terms" />
 * <Checkbox var="darkMode" label="🌙 Dark Mode" />
 * <Checkbox var="notifications" label="Enable notifications" />
 * <Checkbox var="watered" label="Watered">
 *   <OnChange><Increment var="ticks" /></OnChange>
 * </Checkbox>
 * ```
 */

export interface CheckboxProps {
  /** Variable name to bind (should be boolean type) */
  var: string;

  /** Label text to display next to checkbox */
  label?: string;

  /** Additional CSS classes */
  className?: string;

  /** Disabled state */
  disabled?: boolean;

  /** Children (an OnChange; nothing else shows) */
  children?: React.ReactNode;
}

export default function Checkbox(props: CheckboxProps) {
  const {
    var: varName,
    label,
    className: customClassName,
    disabled = false,
    children,
  } = props;

  // PHASE 1.1: Use selective subscription - only re-render when this specific variable changes
  const dependencies = useMemo(() => varName ? [varName] : [], [varName]);
  const templateState = useTemplateStateWithDeps(dependencies);

  // PHASE 1.1 FIX: Use getVariable() to get current value, not stale snapshot
  const currentValue = Boolean(templateState.getVariable(varName));

  // Extract OnChange handler from children, as the other inputs do
  const changeHandler = useOnChangeHandler(children);

  // Handle value changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    templateState.setVariable(varName, e.target.checked);

    // Execute OnChange handler if present
    if (changeHandler) {
      changeHandler(e.target.checked);
    }
  };

  // Build className
  const baseClasses = 'template-checkbox ts-checkbox inline-flex items-center gap-2 cursor-pointer';
  const finalClassName = customClassName
    ? `${baseClasses} ${customClassName}`
    : baseClasses;

  // Normal mode - render functional checkbox
  return (
    <label className={finalClassName}>
      <input
        type="checkbox"
        disabled={disabled}
        checked={currentValue}
        onChange={handleChange}
        className="ts-checkbox-box w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
      />
      {label && (
        <span className="ts-checkbox-label text-sm select-none">
          {label}
        </span>
      )}
    </label>
  );
}
