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

  /** Action components to execute on key press */
  children?: React.ReactNode;

  /** Internal: Visual builder mode flag */
  __visualBuilder?: boolean;
  _isInVisualBuilder?: boolean;
}

export default function OnKeyPress(props: OnKeyPressProps) {
  const {
    keyName: keyToWatch,
    children,
    __visualBuilder,
    _isInVisualBuilder
  } = props;

  const templateState = useTemplateState();
  const residentData = useResidentData();
  const forEachContext = useForEachContext();
  const isVisualBuilder = __visualBuilder === true || _isInVisualBuilder === true;

  // Set up global keyboard listener
  useEffect(() => {
    // Don't set up listener in visual builder mode
    if (isVisualBuilder || !keyToWatch) {
      return;
    }

    const handleKeyPress = (event: KeyboardEvent) => {
      // Check if the pressed key matches
      if (event.key === keyToWatch) {
        executeActions(children, templateState, residentData, forEachContext);
      }
    };

    // Add event listener to document
    document.addEventListener('keydown', handleKeyPress);

    // Cleanup on unmount
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [keyToWatch, children, isVisualBuilder, templateState, residentData, forEachContext]);

  // Visual builder mode - show indicator
  if (isVisualBuilder) {
    return (
      <div className="inline-block px-2 py-1 bg-amber-100 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700 rounded text-xs text-amber-700 dark:text-amber-300 font-mono">
        ⌨️ OnKeyPress: {keyToWatch || '(no key)'}
        {children && (
          <div className="mt-1 pl-2 border-l-2 border-amber-400 dark:border-amber-600">
            {children}
          </div>
        )}
      </div>
    );
  }

  // Normal mode - render nothing (uses global event listener)
  return null;
}
