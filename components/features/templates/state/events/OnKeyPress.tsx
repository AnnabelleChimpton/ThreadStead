'use client';

import React, { useEffect, useRef } from 'react';
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

  // Whether the key is down: kept across renders, since the listener is
  // set up again whenever the page's state changes (as a press changes it)
  const down = useRef(false);

  useEffect(() => {
    if (!keyToWatch) {
      return;
    }

    // Whether this key: a letter in either case, since Shift turns the
    // keyup of "a" into "A" and a held key never let go (bug bash 2026-10-26)
    const isKey = (key: string) => key === keyToWatch || (keyToWatch.length === 1 && key.toLowerCase() === keyToWatch.toLowerCase());
    const run = () => executeActions(children, templateState, residentData, forEachContext);

    const handleKey = (event: KeyboardEvent) => {
      if (!isKey(event.key)) return;
      if (event.type === 'keydown') down.current = true;
      if (event.type !== type) {
        return;
      }
      if (type === 'keyup') {
        // Let go: whatever it was pressed in, so a held key is never stuck
        if (!down.current) return;
        down.current = false;
        run();
        return;
      }
      // Browser shortcuts (Ctrl+C, Cmd+F) aren't a press of the letter
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      // Not while someone types: a letter key went off in the guestbook box,
      // the site's search and chat too (template audit Rafa R23). Only text
      // fields: a checkbox or slider clicked for a game's settings left its
      // keys dead (bug bash 2026-10-26)
      const target = event.target as HTMLElement | null;
      if (target?.closest?.(TYPING)) return;
      // Space and Enter on a focused button or clickable press that, and only that
      if ((event.key === ' ' || event.key === 'Enter') && target?.closest?.(PRESSABLE)) return;
      if (!keepsScroll && SCROLLING_KEYS.has(event.key)) event.preventDefault();
      run();
    };

    // A key let go while the page wasn't looking (another tab or window)
    // never sends its keyup: count it let go when the page loses focus
    const letGo = () => {
      if (type !== 'keyup' || !down.current) return;
      down.current = false;
      run();
    };
    const hidden = () => {
      if (document.visibilityState === 'hidden') letGo();
    };

    document.addEventListener('keydown', handleKey);
    document.addEventListener('keyup', handleKey);
    window.addEventListener('blur', letGo);
    document.addEventListener('visibilitychange', hidden);
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.removeEventListener('keyup', handleKey);
      window.removeEventListener('blur', letGo);
      document.removeEventListener('visibilitychange', hidden);
    };
  }, [type, keyToWatch, keepsScroll, children, templateState, residentData, forEachContext]);
}

/** Where keys are typing: text fields, not checkboxes, sliders or radios */
const TYPING = 'textarea, select, [contenteditable]:not([contenteditable="false"]), input:not([type]), ' +
  ['text', 'email', 'search', 'url', 'tel', 'password', 'number', 'date', 'datetime-local', 'month', 'time', 'week']
    .map((kind) => `input[type="${kind}" i]`).join(', ');

/** What Space and Enter press when it has focus */
const PRESSABLE = 'button, a[href], [role="button"], input[type="checkbox" i], input[type="radio" i], summary';

export default function OnKeyPress(props: OnKeyPressProps) {
  useKeyEvent('keydown', props);
  // Nothing to see: it listens on the whole page
  return null;
}
