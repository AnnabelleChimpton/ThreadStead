'use client';

import React, { useMemo } from 'react';
import { useTemplateStateWithDeps } from '@/lib/templates/state/TemplateStateProvider';

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

  /** Internal: Visual builder mode flag */
  __visualBuilder?: boolean;
  _isInVisualBuilder?: boolean;

  /** Children (ignored) */
  children?: React.ReactNode;
}

export default function Checkbox(props: CheckboxProps) {
  const {
    var: varName,
    label,
    className: customClassName,
    disabled = false,
    __visualBuilder,
    _isInVisualBuilder
  } = props;

  // PHASE 1.1: Use selective subscription - only re-render when this specific variable changes
  const dependencies = useMemo(() => varName ? [varName] : [], [varName]);
  const templateState = useTemplateStateWithDeps(dependencies);
  const isVisualBuilder = __visualBuilder === true || _isInVisualBuilder === true;

  // PHASE 1.1 FIX: Use getVariable() to get current value, not stale snapshot
  const currentValue = Boolean(templateState.getVariable(varName));

  // Handle value changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    templateState.setVariable(varName, e.target.checked);
  };

  // Build className
  const baseClasses = 'template-checkbox inline-flex items-center gap-2 cursor-pointer';
  const finalClassName = customClassName
    ? `${baseClasses} ${customClassName}`
    : baseClasses;

  // Visual builder mode - show disabled checkbox with indicator
  if (isVisualBuilder) {
    return (
      <div className="inline-block relative">
        <label className={`${finalClassName} opacity-70`}>
          <input
            type="checkbox"
            disabled
            checked={false}
            readOnly
            className="w-4 h-4 rounded border-gray-300"
          />
          <span className="text-sm">
            {label || `[Bound to $vars.${varName}]`}
          </span>
        </label>
        <div className="absolute -top-2 -right-2 px-1 py-0.5 bg-purple-500 text-white text-xs rounded">
          ☑️ Checkbox
        </div>
      </div>
    );
  }

  // Normal mode - render functional checkbox
  return (
    <label className={finalClassName}>
      <input
        type="checkbox"
        disabled={disabled}
        checked={currentValue}
        onChange={handleChange}
        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
      />
      {label && (
        <span className="text-sm select-none">
          {label}
        </span>
      )}
    </label>
  );
}
