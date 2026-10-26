'use client';

import { useKeyEvent, type OnKeyPressProps } from './OnKeyPress';

/**
 * OnKeyUp: the actions inside run when a key is let go, the way OnKeyPress
 * runs them when it goes down. With the two, a page knows a key is held:
 *
 * ```xml
 * <OnKeyPress keyName="ArrowLeft" scroll="false"><Set var="left" value="true" /></OnKeyPress>
 * <OnKeyUp keyName="ArrowLeft"><Set var="left" value="false" /></OnKeyUp>
 * ```
 */
export default function OnKeyUp(props: OnKeyPressProps) {
  useKeyEvent('keyup', props);
  return null;
}
