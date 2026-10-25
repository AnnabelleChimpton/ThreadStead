/**
 * Picking a component in the palette shows what it does, its example and
 * the example running (ComponentPreview); "Put it in my page" inserts the
 * example. A tooltip said what it did, which a phone never shows.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ComponentPalette from '../ComponentPalette';
import type { ComponentSchema } from '@/lib/templates/editor/component-autocomplete';
import { createMockResidentData } from './test-utils';

jest.mock('@/components/ui/PixelIcon', () => ({ PixelIcon: () => null }));
// The preview itself is tested on its own (ComponentPreview.test.tsx)
jest.mock('next/dynamic', () => () => function Preview({ example }: { example: string }) {
  return <div data-testid="preview">{example}</div>;
});

const schemas: ComponentSchema[] = [
  { name: 'Guestbook', id: 'guestbook', group: 'connected', description: 'Your guestbook.', example: '<Guestbook />', acceptsChildren: false, props: [] },
  { name: 'Var', id: 'var', group: 'logic', description: 'A page variable.', example: '<Var name="n" />', acceptsChildren: false, props: [] },
  { name: 'Tab', id: 'tab', group: 'layout', description: 'One tab.', example: '<Tab title="One">…</Tab>', acceptsChildren: true, parent: 'Tabs', props: [] },
];

function palette(onInsert = jest.fn()) {
  render(<ComponentPalette schemas={schemas} onInsert={onInsert} residentData={createMockResidentData()} />);
  // Every one listed, whatever the beginner set holds
  fireEvent.click(screen.getByRole('button', { name: 'Show all 3' }));
  return onInsert;
}

test('picking one shows what it does and runs its example; nothing goes in yet', () => {
  const onInsert = palette();
  fireEvent.click(screen.getByRole('button', { name: '<Guestbook />' }));
  const card = screen.getByRole('region', { name: 'Guestbook' });
  expect(card).toHaveTextContent('Your guestbook.');
  expect(screen.getByTestId('preview')).toHaveTextContent('<Guestbook />');
  expect(screen.getByRole('button', { name: '<Guestbook />' })).toHaveAttribute('aria-pressed', 'true');
  expect(onInsert).not.toHaveBeenCalled();
});

test('"Put it in my page" inserts the example', () => {
  const onInsert = palette();
  fireEvent.click(screen.getByRole('button', { name: '<Guestbook />' }));
  fireEvent.click(screen.getByRole('button', { name: 'Put it in my page' }));
  expect(onInsert).toHaveBeenCalledWith('<Guestbook />');
});

test('a logic tag says it shows nothing by itself; one that goes inside another says so', () => {
  palette();
  fireEvent.click(screen.getByRole('button', { name: '<Var />' }));
  expect(screen.getByText(/shows nothing by itself/)).toBeInTheDocument();
  expect(screen.queryByTestId('preview')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: '<Tab>' }));
  expect(screen.getByText('It goes inside <Tabs>.')).toBeInTheDocument();
});
