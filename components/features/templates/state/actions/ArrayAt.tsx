'use client';

import React, { useEffect } from 'react';
import { useTemplateState } from '@/lib/templates/state/TemplateStateProvider';

/**
 * ArrayAt Component - Reactively get an array element at a specific index
 *
 * This component watches an array and index variable, and automatically updates
 * a target variable with the array element at that index whenever either changes.
 *
 * This solves the limitation that computed variables don't support dynamic array
 * indexing like `$vars.images[$vars.currentIndex]`.
 *
 * @example
 * ```xml
 * <Var name="images" type="array" initial='["img1.jpg", "img2.jpg", "img3.jpg"]' />
 * <Var name="currentIndex" type="number" initial="0" />
 * <Var name="currentImage" type="string" initial="" />
 *
 * <!-- Automatically updates currentImage when images or currentIndex changes -->
 * <ArrayAt var="currentImage" array="images" index="currentIndex" />
 *
 * <DynamicImage var="currentImage" alt="Gallery" />
 * ```
 */

export interface ArrayAtProps {
  /** Target variable name to store the array element */
  var: string;

  /** Source array variable name */
  array: string;

  /** Index variable name or literal number */
  index: string | number;

  /** Internal: Visual builder mode flag */
  __visualBuilder?: boolean;
  _isInVisualBuilder?: boolean;

  /** Children (ignored) */
  children?: React.ReactNode;
}

export default function ArrayAt(props: ArrayAtProps) {
  const {
    var: targetVarName,
    array: arrayVarName,
    index: indexProp,
    __visualBuilder,
    _isInVisualBuilder
  } = props;

  // IMPORTANT: Always call hooks before any conditional returns
  const templateState = useTemplateState();
  const isVisualBuilder = __visualBuilder === true || _isInVisualBuilder === true;

  // Normal mode - reactive effect to update target variable
  useEffect(() => {
    // Skip in visual builder mode
    if (isVisualBuilder) {
      return;
    }

    // Validate required props inside effect
    if (!targetVarName || !arrayVarName || indexProp === undefined) {
      return;
    }

    // Check if array variable exists
    const arrayVariable = templateState.variables[arrayVarName];
    if (!arrayVariable) {
      console.warn(`[ArrayAt] Array variable "${arrayVarName}" not found`);
      return;
    }

    // Get the array value
    const arrayValue = arrayVariable.value;
    if (!Array.isArray(arrayValue)) {
      console.warn(`[ArrayAt] Variable "${arrayVarName}" is not an array (type: ${typeof arrayValue})`);
      return;
    }

    // Resolve index value
    let indexValue: number;
    if (typeof indexProp === 'number') {
      indexValue = indexProp;
    } else if (typeof indexProp === 'string') {
      // Check if it's a variable reference
      const indexVariable = templateState.variables[indexProp];
      if (indexVariable !== undefined) {
        indexValue = typeof indexVariable.value === 'number'
          ? indexVariable.value
          : parseInt(String(indexVariable.value), 10);
      } else {
        // Try parsing as literal number
        indexValue = parseInt(indexProp, 10);
      }
    } else {
      console.warn(`[ArrayAt] Invalid index type: ${typeof indexProp}`);
      return;
    }

    // Validate index
    if (isNaN(indexValue)) {
      console.warn(`[ArrayAt] Invalid index value: ${indexProp}`);
      return;
    }

    // Get element at index (allow negative indices like array.at())
    let element: any;
    if (indexValue < 0) {
      // Negative index: count from end
      element = arrayValue[arrayValue.length + indexValue];
    } else {
      element = arrayValue[indexValue];
    }

    // Register target variable if it doesn't exist
    if (!templateState.variables[targetVarName]) {
      templateState.registerVariable({
        name: targetVarName,
        type: 'string', // Default to string, will be coerced based on value
        initial: element !== undefined ? element : ''
      });
    }

    // Update target variable with the element value
    templateState.setVariable(targetVarName, element !== undefined ? element : '');

  }, [
    isVisualBuilder,
    targetVarName,
    arrayVarName,
    indexProp,
    // CRITICAL: Watch the actual array and index values, not the entire variables object
    templateState.variables[arrayVarName]?.value,
    typeof indexProp === 'string' ? templateState.variables[indexProp]?.value : indexProp,
    templateState.getVariable,
    templateState.setVariable,
    templateState.registerVariable
  ]);

  // CRITICAL: Validate required props (after hooks)
  if (!targetVarName) {
    console.error('[ArrayAt] Missing required "var" prop');
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
        ⚠️ <strong>ArrayAt Error:</strong> Missing required <code>var</code> prop.
        Example: <code>&lt;ArrayAt var=&quot;currentItem&quot; array=&quot;items&quot; index=&quot;currentIndex&quot; /&gt;</code>
      </div>
    );
  }

  if (!arrayVarName) {
    console.error('[ArrayAt] Missing required "array" prop');
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
        ⚠️ <strong>ArrayAt Error:</strong> Missing required <code>array</code> prop.
        Example: <code>&lt;ArrayAt var=&quot;currentItem&quot; array=&quot;items&quot; index=&quot;0&quot; /&gt;</code>
      </div>
    );
  }

  if (indexProp === undefined) {
    console.error('[ArrayAt] Missing required "index" prop');
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
        ⚠️ <strong>ArrayAt Error:</strong> Missing required <code>index</code> prop.
        Example: <code>&lt;ArrayAt var=&quot;currentItem&quot; array=&quot;items&quot; index=&quot;currentIndex&quot; /&gt;</code>
      </div>
    );
  }

  // Visual builder mode - show indicator
  if (isVisualBuilder) {
    return (
      <div className="inline-block px-2 py-1 bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700 rounded text-xs text-blue-700 dark:text-blue-300 font-mono">
        📋 ArrayAt: {targetVarName} = {arrayVarName}[{String(indexProp)}]
      </div>
    );
  }

  // Component renders nothing in normal mode
  return null;
}
