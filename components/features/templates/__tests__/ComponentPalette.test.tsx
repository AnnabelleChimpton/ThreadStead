/**
 * Picking a component in the palette shows what it does, its example and
 * the example running (ComponentPreview); "Put it in my page" inserts the
 * example. A tooltip said what it did, which a phone never shows. Search
 * puts the best match first, and the arrow keys and Enter work from it.
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
  { name: 'Button', id: 'button', group: 'interactive', description: 'A button. Put an OnClick inside it.', example: '<Button>Hi</Button>', acceptsChildren: true, props: [] },
  { name: 'OnClick', id: 'onclick', group: 'logic', description: 'Runs the actions inside on a click.', example: '<OnClick />', acceptsChildren: true, props: [] },
];

function palette(onInsert = jest.fn()) {
  render(<ComponentPalette schemas={schemas} onInsert={onInsert} residentData={createMockResidentData()} />);
  // Every one listed, whatever the beginner set holds
  fireEvent.click(screen.getByRole('button', { name: 'Show all 5' }));
  return onInsert;
}

test('picking one shows what it does and runs its example; nothing goes in yet', () => {
  const onInsert = palette();
  fireEvent.click(screen.getByRole('option', { name: /<Guestbook \/>/ }));
  const card = screen.getByRole('region', { name: 'Guestbook' });
  expect(card).toHaveTextContent('Your guestbook.');
  expect(screen.getByTestId('preview')).toHaveTextContent('<Guestbook />');
  expect(screen.getByRole('option', { name: /<Guestbook \/>/ })).toHaveAttribute('aria-selected', 'true');
  expect(onInsert).not.toHaveBeenCalled();
});

test('"Put it in my page" inserts the example', () => {
  const onInsert = palette();
  fireEvent.click(screen.getByRole('option', { name: /<Guestbook \/>/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Put it in my page' }));
  expect(onInsert).toHaveBeenCalledWith('<Guestbook />');
});

test('a logic tag says it shows nothing by itself; one that goes inside another says so', () => {
  palette();
  fireEvent.click(screen.getByRole('option', { name: /<Var \/>/ }));
  expect(screen.getByText(/shows nothing by itself/)).toBeInTheDocument();
  expect(screen.queryByTestId('preview')).toBeNull();
  fireEvent.click(screen.getByRole('option', { name: /<Tab>/ }));
  expect(screen.getByText('It goes inside <Tabs>.')).toBeInTheDocument();
});

test('each row says what it is for in a line', () => {
  palette();
  expect(screen.getByRole('option', { name: /<Button>/ })).toHaveTextContent('A button.');
  expect(screen.getByRole('option', { name: /<Button>/ })).not.toHaveTextContent('Put an OnClick');
});

test('search puts the component named first, then arrow keys and Enter pick from the list', () => {
  palette();
  const search = screen.getByRole('combobox', { name: 'Search components' });
  fireEvent.change(search, { target: { value: 'onclick' } });
  const options = screen.getAllByRole('option');
  expect(options[0]).toHaveTextContent('<OnClick>');
  expect(options[1]).toHaveTextContent('<Button>');
  fireEvent.keyDown(search, { key: 'ArrowDown' });
  fireEvent.keyDown(search, { key: 'Enter' });
  expect(screen.getByRole('region', { name: 'Button' })).toBeInTheDocument();
});
