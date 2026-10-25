/**
 * The page editors' shell. Panels stay mounted when another tab is picked:
 * the components and generators tabs insert into a code editor that has to
 * still be there. Hidden ones are out of the accessibility tree.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { history, undo } from '@codemirror/commands';
import EditorWorkspace, { CodeSettings, EditorMenu, MenuItem, PhoneCodeTools, tidyCode, useCodeSettings } from '../EditorWorkspace';

jest.mock('@/components/ui/PixelIcon', () => ({ PixelIcon: () => null }));

function Harness() {
  const [tab, setTab] = React.useState('html');
  return (
    <EditorWorkspace
      toolbar={<div>toolbar</div>}
      tabs={[
        { id: 'html', label: 'HTML', fill: true, content: <textarea aria-label="code" defaultValue="<p>hi</p>" /> },
        { id: 'components', label: 'Components', content: <button type="button">Guestbook</button> },
      ]}
      activeTab={tab}
      onTabChange={setTab}
      preview={<div>preview</div>}
    />
  );
}

beforeEach(() => window.localStorage.clear());

test('switching tabs keeps the code editor mounted, and hidden', () => {
  render(<Harness />);
  const code = screen.getByLabelText('code') as HTMLTextAreaElement;
  fireEvent.change(code, { target: { value: '<p>edited</p>' } });

  fireEvent.click(screen.getByRole('tab', { name: 'Components' }));
  expect(screen.getByRole('tab', { name: 'Components' })).toHaveAttribute('aria-selected', 'true');
  expect(screen.getByRole('button', { name: 'Guestbook' })).toBeInTheDocument();
  // Still there with its text, just not shown
  expect(screen.getByLabelText('code')).toBe(code);
  expect(code.value).toBe('<p>edited</p>');
  expect(code.closest('[role="tabpanel"]')).toHaveAttribute('hidden');
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
});

test('arrow keys move between tabs', () => {
  render(<Harness />);
  fireEvent.keyDown(screen.getByRole('tab', { name: 'HTML' }), { key: 'ArrowRight' });
  expect(screen.getByRole('tab', { name: 'Components' })).toHaveAttribute('aria-selected', 'true');
  fireEvent.keyDown(screen.getByRole('tab', { name: 'Components' }), { key: 'ArrowRight' });
  expect(screen.getByRole('tab', { name: 'HTML' })).toHaveAttribute('aria-selected', 'true');
});

test('the divider can be moved with the keyboard', () => {
  render(<Harness />);
  const divider = screen.getByRole('separator', { name: 'Drag to resize the preview' });
  const before = Number(divider.getAttribute('aria-valuenow'));
  fireEvent.keyDown(divider, { key: 'ArrowRight' });
  // No layout in jsdom, so nothing to clamp against: it just moves
  expect(Number(divider.getAttribute('aria-valuenow'))).toBe(before + 3);
});

test('More opens, runs an item, and closes on Escape or after a pick', () => {
  const reset = jest.fn();
  render(
    <EditorMenu>
      {(close) => <MenuItem onClick={() => { close(); reset(); }}>Reset to default</MenuItem>}
    </EditorMenu>
  );
  const more = screen.getByRole('button', { name: /More/ });
  expect(more).toHaveAttribute('aria-expanded', 'false');

  fireEvent.click(more);
  expect(more).toHaveAttribute('aria-expanded', 'true');
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(screen.queryByRole('button', { name: 'Reset to default' })).not.toBeInTheDocument();

  fireEvent.click(more);
  fireEvent.click(screen.getByRole('button', { name: 'Reset to default' }));
  expect(reset).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole('button', { name: 'Reset to default' })).not.toBeInTheDocument();
});

describe('code pane comforts', () => {
  function Settings() {
    const settings = useCodeSettings();
    return (
      <>
        <CodeSettings pane="html" settings={settings} />
        <output>{`${settings.wrap.html} ${settings.wrap.css} ${settings.size}`}</output>
      </>
    );
  }

  test('wrap and text size, remembered for next time', () => {
    const { unmount } = render(<Settings />);
    expect(screen.getByRole('status')).toHaveTextContent('true false 13');
    fireEvent.click(screen.getByLabelText('Wrap lines'));
    fireEvent.click(screen.getByRole('button', { name: 'Bigger text' }));
    expect(screen.getByRole('status')).toHaveTextContent('false false 14');
    unmount();

    render(<Settings />);
    expect(screen.getByRole('status')).toHaveTextContent('false false 14');
  });

  test("text size stops at the smallest, and says what it's at", () => {
    render(<Settings />);
    for (let i = 0; i < 5; i++) fireEvent.click(screen.getByRole('button', { name: 'Smaller text' }));
    expect(screen.getByRole('button', { name: 'Smaller text' })).toBeDisabled();
    expect(screen.getByRole('group', { name: 'Text size: 11px' })).toBeInTheDocument();
  });

  // jsdom lays nothing out, and CodeMirror measures text once a frame
  beforeAll(() => {
    Range.prototype.getClientRects = () => [] as unknown as DOMRectList;
    Range.prototype.getBoundingClientRect = () => ({ x: 0, y: 0, width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0, toJSON: () => ({}) });
  });

  const editor = (doc: string) => new EditorView({ state: EditorState.create({ doc, extensions: [history()] }), parent: document.body });

  test('Tidy is one edit: Undo puts it back', async () => {
    const view = editor('<main>\n<p>hi</p>\n</main>');
    expect(await tidyCode(view, 'html')).toBe(true);
    expect(view.state.doc.toString()).toBe('<main>\n  <p>hi</p>\n</main>');
    expect(await tidyCode(view, 'html')).toBe(false);
    undo(view);
    expect(view.state.doc.toString()).toBe('<main>\n<p>hi</p>\n</main>');
    view.destroy();
  });

  test("a phone's Undo and Find act on the code", async () => {
    const view = editor('one');
    view.dispatch({ changes: { from: 3, insert: ' two' } });
    render(<PhoneCodeTools view={() => view} />);
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    await waitFor(() => expect(view.state.doc.toString()).toBe('one'));
    fireEvent.click(screen.getByRole('button', { name: 'Find' }));
    await waitFor(() => expect(view.dom.querySelector('.cm-search')).not.toBeNull());
    view.destroy();
  });
});
