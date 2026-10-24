'use client';

import React, { useEffect } from 'react';
import { globalTemplateStateManager } from '@/lib/templates/state/TemplateStateManager';

/** A variable's name, as written in the page */
const NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;

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

  /** Children (ignored) */
  children?: React.ReactNode;
}

export default function ArrayAt(props: ArrayAtProps) {
  const {
    var: targetVarName,
    array: arrayVarName,
    index: indexProp
  } = props;

  // The item is a computed variable, worked out the moment the list or the
  // index changes, so the next action in the same click already sees it.
  // An effect used to copy it over after the click: one step behind (the
  // Boombox showed the previous track: template audit 06 #13).
  useEffect(() => {
    if (!targetVarName || !NAME.test(arrayVarName ?? '') || indexProp === undefined) return;
    const index = String(indexProp).trim();
    const at = /^-?\d+$/.test(index) ? index : NAME.test(index) ? `$vars.${index}` : null;
    if (at === null) {
      console.warn(`[ArrayAt] Invalid index value: ${indexProp}`);
      return;
    }
    globalTemplateStateManager.unregisterVariable(targetVarName);
    globalTemplateStateManager.registerVariable({
      name: targetVarName,
      type: 'computed',
      computed: `$vars.${arrayVarName}.at(${at})`,
    });
  }, [targetVarName, arrayVarName, indexProp]);

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

  // Component renders nothing in normal mode
  return null;
}
