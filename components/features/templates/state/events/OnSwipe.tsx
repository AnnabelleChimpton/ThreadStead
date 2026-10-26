'use client';

import React from 'react';
import { useTemplateState } from '@/lib/templates/state/TemplateStateProvider';
import { useResidentData } from '@/components/features/templates/ResidentDataProvider';
import { useForEachContext } from '../loops/ForEach';
import { executeActions } from './OnClick';
import { eventMarker, useSwipe, type SwipeDirection } from './element-events';

/**
 * OnSwipe: the actions inside run when someone swipes across the element
 * it sits in (or the elements matching target), on a phone or tablet, or
 * dragging with the mouse. For games on a phone, next to the OnKeyPress
 * arrows a keyboard uses.
 *
 * ```xml
 * <div class="board">
 *   <OnSwipe direction="left"><Decrement var="x" /></OnSwipe>
 *   <OnSwipe direction="right"><Increment var="x" /></OnSwipe>
 * </div>
 * ```
 */
export interface OnSwipeProps {
  /** left, right, up or down; any way when it isn't set */
  direction?: string;
  /** How far, in pixels, before it counts as a swipe */
  distance?: number | string;
  /** A selector for the page elements to watch, instead of the element it sits in */
  target?: string;
  children?: React.ReactNode;
}

const DIRECTIONS = new Set(['left', 'right', 'up', 'down']);

export default function OnSwipe(props: OnSwipeProps) {
  const { children, target } = props;
  const direction = props.direction?.trim().toLowerCase();
  const distance = Number(props.distance);
  const templateState = useTemplateState();
  const residentData = useResidentData();
  const forEachContext = useForEachContext();

  const marker = useSwipe(
    direction && DIRECTIONS.has(direction) ? (direction as SwipeDirection) : undefined,
    target,
    Number.isFinite(distance) && distance > 0 ? distance : 30,
    (element) => executeActions(children, templateState, residentData, forEachContext, element)
  );
  return eventMarker(marker);
}
