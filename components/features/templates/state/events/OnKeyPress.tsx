'use client';

import React, { useEffect } from 'react';
import { useTemplateState } from '@/lib/templates/state/TemplateStateProvider';
import { useResidentData } from '@/components/features/templates/ResidentDataProvider';
import { useForEachContext } from '../loops/ForEach';
import { executeActions } from './OnClick';

/**
 * OnKeyPress Component - Event handler for keyboard events
 *
 * Executes action components when a specific key is pressed.
 * Works globally on the document.
 *
 * @example
 * ```xml
 * <OnKeyPress keyName="Enter">
 *   <Set var="submitted" value="true" />
 * </OnKeyPress>
 *
 * <OnKeyPress keyName="Escape">
 *   <Set var="modalOpen" value="false" />
 * </OnKeyPress>
 * ```
 */

export interface OnKeyPressProps {
  /** Key to listen for (e.g., "Enter", "Escape", "ArrowUp") */
  keyName: string;

  /** false: the key doesn't also scroll the page (arrows, Space, Page Up…) */
  scroll?: boolean | string;

  /** Action components to execute on key press */
  children?: React.ReactNode;

}

/** Keys that scroll the page when nothing else takes them */
const SCROLLING_KEYS = new Set([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'PageUp', 'PageDown', 'Home', 'End']);

/**
 * Runs the actions inside when `keyName` goes down (keydown) or comes back
 * up (keyup), anywhere on the page but never while someone types in a
 * field. OnKeyPress and OnKeyUp together tell a game a key is held down:
 * set a variable on one, clear it on the other, and move on an OnInterval.
 */
export function useKeyEvent(type: 'keydown' | 'keyup', props: OnKeyPressProps) {
  const { keyName: keyToWatch, children } = props;
  const keepsScroll = props.scroll !== false && props.scroll !== 'false';

  const templateState = useTemplateState();
  const residentData = useResidentData();
  const forEachContext = useForEachContext();

  useEffect(() => {
    if (!keyToWatch) {
      return;
    }

    const handleKey = (event: KeyboardEvent) => {
      // Not while someone types: a letter key went off in the guestbook box,
      // the site's search and chat too (template audit Rafa R23)
      const target = event.target as HTMLElement | null;
      if (target?.closest?.('input, textarea, select, [contenteditable]:not([contenteditable="false"])')) return;
      if (event.key !== keyToWatch) return;
      // Space on a button or a clickable presses it; only keep the page still
      if (!keepsScroll && SCROLLING_KEYS.has(event.key) && !target?.closest?.('button, a[href], [role="button"]')) event.preventDefault();
      executeActions(children, templateState, residentData, forEachContext);
    };

    document.addEventListener(type, handleKey);
    return () => {
      document.removeEventListener(type, handleKey);
    };
  }, [type, keyToWatch, keepsScroll, children, templateState, residentData, forEachContext]);
}

export default function OnKeyPress(props: OnKeyPressProps) {
  useKeyEvent('keydown', props);
  // Nothing to see: it listens on the whole page
  return null;
}
