'use client';

import React from 'react';
import { useResidentData } from './ResidentDataProvider';
import { getNestedValue } from '@/lib/templates/conditional/condition-evaluator';

interface DebugValueProps {
  path: string;
}

/**
 * DebugValue Component - Shows the raw value and type of a data path
 * Useful for debugging template data issues
 */
export default function DebugValue({ path }: DebugValueProps) {
  const residentData = useResidentData();
  const value = getNestedValue(residentData, path);

  const valueType = Array.isArray(value) ? `array[${value.length}]` : typeof value;
  let valueStr: string;

  try {
    if (Array.isArray(value)) {
      valueStr = `[${value.length} items]`;
    } else if (typeof value === 'object' && value !== null) {
      valueStr = `{${Object.keys(value).length} keys}`;
    } else {
      valueStr = String(value);
    }
  } catch (e) {
    valueStr = '[Error stringifying]';
  }

  return (
    <span style={{
      fontFamily: 'monospace',
      backgroundColor: '#f0f0f0',
      padding: '2px 6px',
      borderRadius: '3px',
      fontSize: '0.9em'
    }}>
      <strong>{path}:</strong> {valueType} = {valueStr}
    </span>
  );
}
