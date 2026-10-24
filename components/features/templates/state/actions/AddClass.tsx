'use client';

import React from 'react';
import { pageElements } from './page-targets';

/**
 * AddClass Component - Add a CSS class to an element
 *
 * Action component that adds a CSS class to target element(s).
 * Executed by event handlers like OnClick.
 *
 * @example
 * ```xml
 * <Button>
 *   <OnClick>
 *     <AddClass target="this" class="active" />
 *     <AddClass target="#sidebar" class="open" />
 *     <AddClass target=".items" class="highlighted" />
 *   </OnClick>
 *   Toggle Classes
 * </Button>
 * ```
 */

export interface AddClassProps {
  /** CSS selector or "this" for current element */
  target: string;

  /** Class name to add */
  className: string;
}

export default function AddClass(props: AddClassProps) {

  // Normal mode - render nothing (executed by event handler)
  return null;
}

/**
 * Execute AddClass action
 * Called by event handlers (OnClick, etc.)
 */
export function executeAddClassAction(props: AddClassProps, currentElement?: HTMLElement): void {
  const { target, className } = props;

  if (!target || !className) {
    console.warn('[AddClass] Missing target or className prop');
    return;
  }

  // Resolve target element(s)
  const elements = resolveTarget(target, currentElement);

  if (elements.length === 0) {
    console.warn(`[AddClass] No elements found for target: ${target}`);
    return;
  }

  // Add class to all matched elements
  elements.forEach((el) => {
    el.classList.add(className);
  });

  console.log(`[AddClass] Added class "${className}" to ${elements.length} element(s)`);
}

/**
 * Resolve target selector to DOM elements
 * Handles automatic user-content- prefix for ID selectors
 */
function resolveTarget(target: string, currentElement?: HTMLElement): HTMLElement[] {
  // Special case: "this" refers to the current element
  if (target === 'this' && currentElement) {
    return [currentElement];
  }

  // Only the page's own elements, never the site around it
  return pageElements(target);
}
