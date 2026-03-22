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

}

export default function OnKeyPress(props: OnKeyPressProps) {
  const {
    keyName: keyToWatch,
    children,
  } = props;

  const templateState = useTemplateState();
  const residentData = useResidentData();
  const forEachContext = useForEachContext();

  // Set up global keyboard listener
  useEffect(() => {
    if (!keyToWatch) {
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
  }, [keyToWatch, children, templateState, residentData, forEachContext]);

  // Normal mode - render nothing (uses global event listener)
  return null;
}
