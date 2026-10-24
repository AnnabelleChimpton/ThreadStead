/**
 * OnInterval runs at most every 50ms. With no floor, fifty timers at 16ms
 * kept a phone half busy (template audit 12); CSS animates smoother anyway.
 * A page that asks for less hears why in the editor.
 */
import React from 'react';
import { render } from '@testing-library/react';
import { coercePropValue } from '@/lib/templates/core/template-registry-types';
import { componentRegistry } from '@/lib/templates/core/template-registry';

jest.mock('@/lib/templates/state/TemplateStateProvider', () => ({ useTemplateState: () => ({}) }));
jest.mock('@/components/features/templates/ResidentDataProvider', () => ({ useResidentData: () => ({}) }));
jest.mock('../../loops/ForEach', () => ({ useForEachContext: () => null }));
jest.mock('../OnClick', () => ({ executeActions: jest.fn() }));

import OnInterval, { MIN_INTERVAL_MS } from '../OnInterval';

test('the component never runs faster than every 50ms', () => {
  jest.useFakeTimers();
  const spy = jest.spyOn(global, 'setInterval');
  render(<OnInterval milliseconds={1}>{null}</OnInterval>);
  jest.advanceTimersByTime(200);
  expect(spy.mock.calls.map((call) => call[1])).toContain(MIN_INTERVAL_MS);
  expect(spy.mock.calls.map((call) => call[1])).not.toContain(1);
  jest.useRealTimers();
});

test('the editor says so for a page that asks for less', () => {
  const props = componentRegistry.get('OnInterval')!.props;
  expect(coercePropValue('10', props.milliseconds, 'milliseconds')).toEqual({ value: 50, problem: 'milliseconds is at least 50. Using 50.' });
  expect(coercePropValue('0.01', props.seconds, 'seconds')).toMatchObject({ value: 0.05 });
});
