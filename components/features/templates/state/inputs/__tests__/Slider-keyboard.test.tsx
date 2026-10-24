/**
 * A slider moved with the arrow keys runs its OnChange like a drag does
 * (template audit 06 #14e); Tab landing on it doesn't.
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react';

const onChange = jest.fn();
jest.mock('@/lib/templates/state/TemplateStateProvider', () => ({
  useTemplateStateWithDeps: () => ({ getVariable: () => 5, setVariable: jest.fn() }),
}));
jest.mock('../../events/OnChange', () => ({
  useOnChangeHandler: () => onChange,
  filterOnChangeChildren: () => null,
}));

import Slider from '../Slider';

test('arrow, Page, Home and End keys run OnChange when they come up; Tab doesn\'t', () => {
  const { container } = render(<Slider var="volume" min={0} max={10} />);
  const range = container.querySelector('input[type="range"]')!;
  fireEvent.keyUp(range, { key: 'Tab' });
  expect(onChange).not.toHaveBeenCalled();
  for (const key of ['ArrowRight', 'PageUp', 'Home', 'End']) fireEvent.keyUp(range, { key });
  expect(onChange).toHaveBeenCalledTimes(4);
});
