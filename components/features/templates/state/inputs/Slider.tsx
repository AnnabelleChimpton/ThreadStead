'use client';

import React from 'react';
import { useTemplateState } from '@/lib/templates/state/TemplateStateProvider';
import { useOnChangeHandler, filterOnChangeChildren } from '../events/OnChange';

/**
 * Slider Component - Range slider input bound to a numeric template variable
 *
 * Provides a controlled slider that automatically syncs with template state.
 *
 * @example
 * ```xml
 * <Slider var="volume" min="0" max="100" step="1" />
 * <Slider var="fontSize" min="12" max="32" showValue="true" />
 * ```
 */

export interface SliderProps {
  /** Variable name to bind (should be number type) */
  var: string;

  /** Minimum value */
  min: number;

  /** Maximum value */
  max: number;

  /** Step increment */
  step?: number;

  /** Show current value next to slider */
  showValue?: boolean;

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

export default function Slider(props: SliderProps) {
  const {
    var: varName,
    min,
    max,
    step = 1,
    showValue = false,
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
  const variable = templateState.variables[varName];
  const currentValue = typeof variable?.value === 'number' ? variable.value : min;

  // Handle value changes (fires on every movement - updates state)
  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);
    templateState.setVariable(varName, newValue);
  };

  // Handle when user releases the slider (mouse or touch)
  const handleRelease = () => {
    // Execute OnChange handler if present
    if (onChangeHandler) {
      onChangeHandler(currentValue);
    }
  };

  // Build className
  const baseClasses = 'template-slider flex flex-col gap-1';
  const finalClassName = customClassName
    ? `${baseClasses} ${customClassName}`
    : baseClasses;

  // Visual builder mode - show disabled slider with indicator
  if (isVisualBuilder) {
    return (
      <div className="inline-block relative">
        <div className={`${finalClassName} opacity-70 p-2`}>
          {label && (
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {label}
              {showValue && <span className="ml-2 text-gray-500">({min})</span>}
            </label>
          )}
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            disabled
            value={min}
            readOnly
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          <div className="absolute -top-2 -right-2 px-1 py-0.5 bg-purple-500 text-white text-xs rounded">
            🎚️ Slider
          </div>
        </div>
      </div>
    );
  }

  // Normal mode - render functional slider
  return (
    <div className={finalClassName}>
      {label && (
        <div className="flex justify-between items-center">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {label}
          </label>
          {showValue && (
            <span className="text-sm text-gray-600 dark:text-gray-400 font-mono">
              {currentValue}
            </span>
          )}
        </div>
      )}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        value={currentValue}
        onInput={handleInput}
        onMouseUp={handleRelease}
        onTouchEnd={handleRelease}
        className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600 hover:accent-blue-700"
      />
      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-500">
        <span>{min}</span>
        <span>{max}</span>
      </div>
      {/* Render OnChange children (they won't display but are part of the component tree) */}
      <div className="hidden">{filteredChildren}</div>
    </div>
  );
}
