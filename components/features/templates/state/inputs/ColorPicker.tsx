'use client';

import React from 'react';
import { useTemplateState } from '@/lib/templates/state/TemplateStateProvider';
import { useOnChangeHandler, filterOnChangeChildren } from '../events/OnChange';

/**
 * ColorPicker Component - Color picker input bound to a template variable
 *
 * Provides a controlled color picker that automatically syncs with template state.
 *
 * @example
 * ```xml
 * <ColorPicker var="accentColor" />
 * <ColorPicker var="bgColor" label="Background Color" />
 * ```
 */

export interface ColorPickerProps {
  /** Variable name to bind (string hex color) */
  var: string;

  /** Label text */
  label?: string;

  /** Additional CSS classes */
  className?: string;

  /** Disabled state */
  disabled?: boolean;

  /** Internal: Visual builder mode flag */
  __visualBuilder?: boolean;
  _isInVisualBuilder?: boolean;

  /** Children (OnChange handlers) */
  children?: React.ReactNode;
}

export default function ColorPicker(props: ColorPickerProps) {
  const {
    var: varName,
    label,
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
  const currentValue = typeof variable?.value === 'string' ? variable.value : '#000000';

  // Handle value changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    templateState.setVariable(varName, newValue);

    // Execute OnChange handler if present
    if (onChangeHandler) {
      onChangeHandler(newValue);
    }
  };

  // Build className
  const baseClasses = 'template-color-picker flex items-center gap-3';
  const finalClassName = customClassName
    ? `${baseClasses} ${customClassName}`
    : baseClasses;

  // Visual builder mode - show disabled color picker with indicator
  if (isVisualBuilder) {
    return (
      <div className="inline-block relative">
        <div className={`${finalClassName} opacity-70 p-2`}>
          {label && (
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {label}
            </label>
          )}
          <div className="flex items-center gap-2">
            <input
              type="color"
              disabled
              value="#000000"
              readOnly
              className="w-12 h-12 rounded cursor-pointer border-2 border-gray-300 dark:border-gray-600"
            />
            <span className="text-sm text-gray-600 dark:text-gray-400 font-mono">
              #000000
            </span>
          </div>
          <div className="absolute -top-2 -right-2 px-1 py-0.5 bg-purple-500 text-white text-xs rounded">
            🎨 ColorPicker
          </div>
        </div>
      </div>
    );
  }

  // Normal mode - render functional color picker
  return (
    <div className={finalClassName}>
      {label && (
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}
      <div className="flex items-center gap-2">
        <input
          type="color"
          disabled={disabled}
          value={currentValue}
          onChange={handleChange}
          className="w-12 h-12 rounded cursor-pointer border-2 border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
        />
        <span className="text-sm text-gray-600 dark:text-gray-400 font-mono">
          {currentValue}
        </span>
      </div>
      {/* Render OnChange children (they won't display but are part of the component tree) */}
      <div className="hidden">{filteredChildren}</div>
    </div>
  );
}
