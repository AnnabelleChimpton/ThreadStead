'use client';

import React, { createContext, useContext, useMemo } from 'react';
import { useTemplateStateWithDeps } from '@/lib/templates/state/TemplateStateProvider';
import { useOnChangeHandler, filterOnChangeChildren } from '../events/OnChange';

/**
 * RadioGroup Component - Radio button group bound to a template variable
 *
 * Provides a controlled radio group that automatically syncs with template state.
 * Must contain Radio children components.
 *
 * @example
 * ```xml
 * <RadioGroup var="favoriteColor">
 *   <Radio value="red" label="❤️ Red" />
 *   <Radio value="blue" label="💙 Blue" />
 *   <Radio value="green" label="💚 Green" />
 * </RadioGroup>
 * ```
 */

export interface RadioGroupProps {
  /** Variable name to bind (string type recommended) */
  var: string;

  /** Additional CSS classes */
  className?: string;

  /** Layout direction */
  direction?: 'vertical' | 'horizontal';

  /** Internal: Visual builder mode flag */
  __visualBuilder?: boolean;
  _isInVisualBuilder?: boolean;

  /** Radio children + optional OnChange */
  children?: React.ReactNode;
}

// Context to share radio group state with Radio children
interface RadioGroupContextType {
  selectedValue: any;
  groupName: string;
  onChange: (value: any) => void;
  isVisualBuilder: boolean;
}

const RadioGroupContext = createContext<RadioGroupContextType | null>(null);

export function useRadioGroupContext() {
  const context = useContext(RadioGroupContext);
  if (!context) {
    throw new Error('Radio must be used within a RadioGroup');
  }
  return context;
}

export default function RadioGroup(props: RadioGroupProps) {
  const {
    var: varName,
    className: customClassName,
    direction = 'vertical',
    __visualBuilder,
    _isInVisualBuilder,
    children
  } = props;

  // PHASE 1.1: Use selective subscription - only re-render when this specific variable changes
  const dependencies = useMemo(() => varName ? [varName] : [], [varName]);
  const templateState = useTemplateStateWithDeps(dependencies);
  const isVisualBuilder = __visualBuilder === true || _isInVisualBuilder === true;

  // Get OnChange handler if present
  const onChangeHandler = useOnChangeHandler(children);
  const filteredChildren = filterOnChangeChildren(children);

  // PHASE 1.1 FIX: Use getVariable() to get current value, not stale snapshot
  const value = templateState.getVariable(varName);
  const currentValue = value !== undefined ? value : '';

  // Generate unique group name
  const groupName = React.useMemo(() => `radio-group-${varName}-${Math.random().toString(36).slice(2)}`, [varName]);

  // Handle value changes (memoized to prevent unnecessary re-renders)
  const handleChange = React.useCallback((value: any) => {
    templateState.setVariable(varName, value);

    // Execute OnChange handler if present
    if (onChangeHandler) {
      onChangeHandler(value);
    }
  }, [templateState, varName, onChangeHandler]);

  // Build className
  const baseClasses = direction === 'horizontal'
    ? 'template-radio-group flex flex-row gap-4'
    : 'template-radio-group flex flex-col gap-2';
  const finalClassName = customClassName
    ? `${baseClasses} ${customClassName}`
    : baseClasses;

  // Context value for Radio children (memoized to prevent unnecessary re-renders)
  const contextValue: RadioGroupContextType = React.useMemo(() => ({
    selectedValue: currentValue,
    groupName,
    onChange: handleChange,
    isVisualBuilder
  }), [currentValue, groupName, handleChange, isVisualBuilder]);

  // Visual builder mode - show indicator
  if (isVisualBuilder) {
    return (
      <div className="inline-block relative">
        <div className={`${finalClassName} opacity-70 p-2 border-2 border-dashed border-purple-300 dark:border-purple-700 rounded`}>
          <div className="text-xs text-purple-600 dark:text-purple-400 font-mono mb-2">
            🔘 RadioGroup (${varName})
          </div>
          <RadioGroupContext.Provider value={contextValue}>
            {filteredChildren}
          </RadioGroupContext.Provider>
        </div>
      </div>
    );
  }

  // Normal mode - render functional radio group
  return (
    <div className={finalClassName} role="radiogroup">
      <RadioGroupContext.Provider value={contextValue}>
        {filteredChildren}
      </RadioGroupContext.Provider>
    </div>
  );
}

/**
 * Radio Component - Individual radio button option
 *
 * Must be used as a child of RadioGroup.
 *
 * @example
 * ```xml
 * <Radio value="option1" label="Option 1" />
 * <Radio value="option2" label="Option 2" />
 * ```
 */

export interface RadioProps {
  /** Value this radio button represents */
  value: any;

  /** Label text to display */
  label?: string;

  /** Disabled state */
  disabled?: boolean;

  /** Additional CSS classes */
  className?: string;

  /** Internal: Visual builder mode flag */
  __visualBuilder?: boolean;
  _isInVisualBuilder?: boolean;

  /** Children (used as label text) */
  children?: React.ReactNode;
}

export function Radio(props: RadioProps) {
  const {
    value,
    label,
    disabled = false,
    className: customClassName,
    children
  } = props;

  const context = useRadioGroupContext();
  const { selectedValue, groupName, onChange, isVisualBuilder } = context;

  // Use children as label, fallback to label prop, then value
  const displayLabel = children || label || String(value);

  // Compare values with type coercion for string/number compatibility
  // Handle undefined/null by converting to empty string
  const isChecked = String(selectedValue ?? '') === String(value ?? '');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      onChange(value);
    }
  };

  // Build className
  const baseClasses = 'template-radio inline-flex items-center gap-2 cursor-pointer';
  const finalClassName = customClassName
    ? `${baseClasses} ${customClassName}`
    : baseClasses;

  // Visual builder mode - show disabled radio
  if (isVisualBuilder) {
    return (
      <label className={`${finalClassName} opacity-70`}>
        <input
          type="radio"
          disabled
          checked={false}
          readOnly
          className="w-4 h-4 border-gray-300"
        />
        <span className="text-sm">
          {displayLabel}
        </span>
      </label>
    );
  }

  // Normal mode - render functional radio
  return (
    <label className={finalClassName}>
      <input
        type="radio"
        name={groupName}
        value={String(value)}
        disabled={disabled}
        checked={isChecked}
        onChange={handleChange}
        className="w-4 h-4 border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 accent-blue-600"
      />
      <span className="text-sm select-none">
        {displayLabel}
      </span>
    </label>
  );
}
