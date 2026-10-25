/**
 * Safe History (PLAN-NEXT step 8):
 *  - Look shows a version in the preview and leaves the code alone; Load
 *    from there puts it in the editor; Back goes back.
 *  - A save in another tab reaches this one: with nothing unsaved it takes
 *    that version (and the next save is based on it); with unsaved edits it
 *    keeps them and says so. Its own saves go out to the other tabs.
 *  - ?tab=css opens on the CSS tab.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { BroadcastChannel as NodeBroadcastChannel } from 'worker_threads';
import EnhancedTemplateEditor from '../EnhancedTemplateEditor';
import { ToastProvider } from '@/contexts/ToastContext';

jest.mock('next/dynamic', () => () => {
  const FakeDynamic = (props: any) =>
    typeof props.onChange === 'function' ? (
      <textarea
        aria-label={props.placeholder?.startsWith('Write your page') ? 'template-code' : 'css-code'}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
      />
    ) : null;
  return FakeDynamic;
});

const realChannel = (global as any).BroadcastChannel;
beforeAll(() => { (global as any).BroadcastChannel = NodeBroadcastChannel; });
afterAll(() => { (global as any).BroadcastChannel = realChannel; });

const user = { id: 'tabs-user', primaryHandle: 'pat@local', handles: [], profile: {} };
const OLD = { id: 'r1', trigger: 'template-save', templateMode: 'advanced', cssMode: 'disable', hideNavigation: false, createdAt: new Date().toISOString(), customTemplate: '<p>the old page</p>', customCSS: 'p { color: blue; }' };

let compiled: string[] = [];
beforeEach(() => {
  compiled = [];
  window.localStorage.clear();
  global.fetch = jest.fn(async (url: any, init?: any) => {
    const u = String(url);
    if (u.includes('/api/templates/compile')) {
      const { template } = JSON.parse(init.body);
      compiled.push(template);
      return { ok: true, status: 200, json: async () => ({ success: true, artifact: { v: 1, tree: [], islands: [] }, errors: [], warnings: [], strippedComponents: [] }) } as any;
    }
    if (u.includes('template-revisions?id=')) return { ok: true, status: 200, json: async () => ({ revision: OLD }) } as any;
    if (u.includes('template-revisions')) return { ok: true, status: 200, json: async () => ({ revisions: [{ ...OLD, templateChars: 20, cssChars: 10 }] }) } as any;
    return { ok: true, status: 200, json: async () => ({}) } as any;
  }) as any;
});

function renderEditor(props: Partial<React.ComponentProps<typeof EnhancedTemplateEditor>> = {}) {
  const onSave = jest.fn().mockResolvedValue('2026-10-25T12:00:00.000Z');
  const onSavedElsewhere = jest.fn();
  const view = render(
    <ToastProvider>
      <EnhancedTemplateEditor
        user={user}
        initialTemplate="<p>my page</p>"
        initialCSS="p { color: red; }"
        initialCSSMode="disable"
        initialTemplateMode="advanced"
        initialEditorMode="template"
        onSave={onSave}
        onSavedElsewhere={onSavedElsewhere}
        {...props}
      />
    </ToastProvider>
  );
  return { onSave, onSavedElsewhere, ...view };
}

const code = () => screen.getByLabelText('template-code') as HTMLTextAreaElement;

function otherTab() {
  const channel = new NodeBroadcastChannel(`threadstead:page-saved:${user.id}`);
  const heard: any[] = [];
  channel.onmessage = (event: any) => heard.push(event.data);
  return { channel, heard };
}

describe('Look', () => {
  it('shows a version in the preview without touching the code; Back goes back', async () => {
    renderEditor();
    fireEvent.click(screen.getByRole('button', { name: /History/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Look' }));
    expect(await screen.findByText("Showing how your page looked moments ago. Your code hasn't changed.")).toBeInTheDocument();
    expect(compiled).toContain('<p>the old page</p>');
    expect(code().value).toBe('<p>my page</p>');
    expect(screen.getByText('A version from History')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Showing' })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: 'Back to my code' }));
    expect(screen.queryByText(/Showing how your page looked/)).toBeNull();
    expect(screen.getByRole('button', { name: 'Look' })).toBeInTheDocument();
  });

  it('Load it puts the version in the editor', async () => {
    renderEditor();
    fireEvent.click(screen.getByRole('button', { name: /History/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Look' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Load it' }));
    // Nothing unsaved, so no question first
    await waitFor(() => expect(code().value).toBe('<p>the old page</p>'));
    expect(screen.queryByText(/Showing how your page looked/)).toBeNull();
  });

  it('an edit puts the preview back on the code', async () => {
    renderEditor();
    fireEvent.click(screen.getByRole('button', { name: /History/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Look' }));
    await screen.findByText(/Showing how your page looked/);
    fireEvent.change(code(), { target: { value: '<p>my page, more</p>' } });
    expect(screen.queryByText(/Showing how your page looked/)).toBeNull();
  });
});

describe('Saves in other tabs', () => {
  it('with nothing unsaved, this editor takes the saved version', async () => {
    const { onSavedElsewhere } = renderEditor();
    const { channel } = otherTab();
    channel.postMessage({ css: 'p { color: green; }', cssMode: 'disable', page: { template: '<p>saved elsewhere</p>', useStandardLayout: false, hideNavigation: false }, savedAt: 'T2' });
    await waitFor(() => expect(code().value).toBe('<p>saved elsewhere</p>'));
    expect(onSavedElsewhere).toHaveBeenCalledWith('T2');
    expect(screen.getByText('Saved in another tab. This is that version.')).toBeInTheDocument();
    expect(screen.queryByText('Unsaved')).toBeNull();
    channel.close();
  });

  it('with unsaved edits, it keeps them and says so', async () => {
    const { onSavedElsewhere } = renderEditor();
    fireEvent.change(code(), { target: { value: '<p>my edit</p>' } });
    const { channel } = otherTab();
    channel.postMessage({ css: '', cssMode: 'inherit', page: { template: '<p>saved elsewhere</p>', useStandardLayout: false, hideNavigation: false }, savedAt: 'T2' });
    expect(await screen.findByText('Your page was saved in another tab. Saving here puts this version over it.')).toBeInTheDocument();
    expect(code().value).toBe('<p>my edit</p>');
    expect(onSavedElsewhere).not.toHaveBeenCalled();
    channel.close();
  });

  it('its own save goes out to the other tabs, with the save time', async () => {
    const { onSave } = renderEditor();
    const { channel, heard } = otherTab();
    await waitFor(() => expect(compiled.length).toBeGreaterThan(0));
    fireEvent.change(code(), { target: { value: '<p>saved here</p>' } });
    await act(async () => {});
    fireEvent.click(screen.getByRole('button', { name: 'Save & Go Live' }));
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    await waitFor(() => expect(heard).toEqual([{
      css: 'p { color: red; }',
      cssMode: 'disable',
      page: { template: '<p>saved here</p>', useStandardLayout: false, hideNavigation: false },
      savedAt: '2026-10-25T12:00:00.000Z',
    }]));
    channel.close();
  });
});

it('?tab=css opens on the CSS tab', () => {
  renderEditor({ initialTab: 'css' });
  expect(screen.getByRole('tab', { name: 'CSS' })).toHaveAttribute('aria-selected', 'true');
});
