/**
 * A slider moved with the arrow keys runs its OnChange like a drag does
 * (template audit 06 #14e); Tab landing on it doesn't, and nor does a key
 * that didn't move it (at the end already; bug bash 2026-10-26).
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react';

const onChange = jest.fn();
let volume = 5;
jest.mock('@/lib/templates/state/TemplateStateProvider', () => ({
  useTemplateStateWithDeps: () => ({ getVariable: () => volume, setVariable: jest.fn() }),
}));
jest.mock('../../events/OnChange', () => ({
  useOnChangeHandler: () => onChange,
  filterOnChangeChildren: () => null,
}));

import Slider from '../Slider';

test('arrow, Page, Home and End keys run OnChange when they come up; Tab doesn\'t', () => {
  const { container, rerender } = render(<Slider var="volume" min={0} max={10} />);
  const range = container.querySelector('input[type="range"]')!;
  fireEvent.keyUp(range, { key: 'Tab' });
  expect(onChange).not.toHaveBeenCalled();
  for (const key of ['ArrowRight', 'PageUp', 'Home', 'End']) {
    fireEvent.keyDown(range, { key });
    volume += 1;
    rerender(<Slider var="volume" min={0} max={10} />);
    fireEvent.keyUp(range, { key });
  }
  expect(onChange).toHaveBeenCalledTimes(4);
});

test("a key that didn't move it doesn't run OnChange", () => {
  onChange.mockClear();
  const { container } = render(<Slider var="volume" min={0} max={10} />);
  const range = container.querySelector('input[type="range"]')!;
  fireEvent.keyDown(range, { key: 'End' });
  fireEvent.keyUp(range, { key: 'End' });
  expect(onChange).not.toHaveBeenCalled();
});
