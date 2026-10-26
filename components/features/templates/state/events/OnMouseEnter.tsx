'use client';

import React from 'react';
import { useTemplateState } from '@/lib/templates/state/TemplateStateProvider';
import { useResidentData } from '@/components/features/templates/ResidentDataProvider';
import { useForEachContext } from '../loops/ForEach';
import { executeActions } from './OnClick';
import { eventMarker, useElementEvent } from './element-events';

/**
 * OnMouseEnter Component - Event handler for mouse enter events
 *
 * Executes action components when the mouse enters the element.
 * Should be used as a child of hoverable elements.
 *
 * @example
 * ```xml
 * <div>
 *   <OnMouseEnter>
 *     <Set var="hovering" value="true" />
 *   </OnMouseEnter>
 *   <OnMouseLeave>
 *     <Set var="hovering" value="false" />
 *   </OnMouseLeave>
 *   Hover over me!
 * </div>
 * ```
 */

export interface OnMouseEnterProps {
  /** Action components to execute on mouse enter */
  children?: React.ReactNode;

  /** A selector for the page elements to watch, instead of the element it sits in */
  target?: string;

}

export default function OnMouseEnter(props: OnMouseEnterProps) {
  const { children, target } = props;
  const templateState = useTemplateState();
  const residentData = useResidentData();
  const forEachContext = useForEachContext();

  // On the element it sits in, or the elements matching target
  const marker = useElementEvent('enter', target, (element) => {
    executeActions(children, templateState, residentData, forEachContext, element);
  });
  return eventMarker(marker);
}
