'use client';

import React from 'react';
import { useResidentData } from './ResidentDataProvider';
import { useTemplateState } from '@/lib/templates/state/TemplateStateProvider';
import { getNestedValue } from '@/lib/templates/conditional/condition-evaluator';

interface DebugValueProps {
  path?: string;
  name?: string; // Alias for template variables
  var?: string; // Alternative to 'name' for template variables
}

/**
 * DebugValue Component - Shows the raw value and type of a data path or template variable
 * Useful for debugging template data issues
 *
 * @example
 * <DebugValue path="owner.displayName" />
 * <DebugValue var="numbers" /> // Shows $vars.numbers
 * <DebugValue name="numbers" /> // Also works
 */
export default function DebugValue({ path, name, var: varName }: DebugValueProps) {
  const residentData = useResidentData();
  const templateState = useTemplateState();

  console.log('[DebugValue] Props received:', { path, name, var: varName });

  // Priority: var > name > path
  const actualPath = varName ? `$vars.${varName}` : (name ? `$vars.${name}` : path);

  console.log('[DebugValue] Resolving:', { actualPath });

  // For template variables, access directly from templateState for reactivity
  let value;
  if (actualPath?.startsWith('$vars.')) {
    const varPath = actualPath.slice(6);
    const parts = varPath.split('.');
    const variableName = parts[0];

    // Direct access to trigger re-render on variable changes
    const variable = templateState.variables[variableName] ||
                     templateState.variables[`user-content-${variableName}`];
    value = variable?.value;

    // Handle nested properties
    for (let i = 1; i < parts.length; i++) {
      if (value === null || value === undefined) {
        value = undefined;
        break;
      }
      value = value[parts[i]];
    }
  } else {
    // For resident data, use getNestedValue
    value = getNestedValue(residentData, actualPath || '');
  }

  console.log('[DebugValue] Value found:', {
    actualPath,
    value,
    type: typeof value,
    availableVars: Object.keys(templateState.variables)
  });

  const valueType = Array.isArray(value) ? `array[${value.length}]` : typeof value;
  let valueStr: string;

  try {
    if (Array.isArray(value)) {
      valueStr = JSON.stringify(value);
    } else if (typeof value === 'object' && value !== null) {
      valueStr = JSON.stringify(value);
    } else {
      valueStr = String(value);
    }
  } catch (e) {
    valueStr = '[Error stringifying]';
  }

  const displayPath = actualPath || 'undefined';

  return (
    <span style={{
      fontFamily: 'monospace',
      backgroundColor: '#f0f0f0',
      padding: '2px 6px',
      borderRadius: '3px',
      fontSize: '0.9em'
    }}>
      <strong>{displayPath}:</strong> {valueType} = {valueStr}
    </span>
  );
}
