/**
 * Opening the HTML editor on a standard-layout profile starts from the Plain
 * page starter, never a blank box. It once replaced the saved CSS with a
 * blank stylesheet with no warning, so one "Save & Go Live" silently dropped
 * the person's theme; now the starter brings its own CSS, and the editor
 * says before the save that the old look stays in History.
 *
 * Pins:
 *  - a new HTML page opens with Plain page, saying the old look is kept
 *  - a save that changes the CSS says the old look is in History
 *  - Reset to Default always asks, since it saves straight away
 *  - the header shows no developer text
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import EnhancedTemplateEditor from '../EnhancedTemplateEditor';
import { ToastProvider } from '@/contexts/ToastContext';
import { STARTERS, splitStarter } from '@/lib/templates/starters';

// CodeMirror (the only next/dynamic import the editor uses) becomes a textarea.
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

const THEME = '/* Charcoal Nights */\n.ts-profile-header { background: #1a1816; color: #e8853d; }\n';
const DEFAULT_LAYOUT = '<RetroCard>\n  <ProfileHeader />\n</RetroCard>';

function installFetch() {
  global.fetch = jest.fn(async (url: any, init?: any) => {
    const u = String(url);
    if (u.includes('/template/default')) {
      // What the endpoint used to send: a blank starter stylesheet. The
      // editor must keep its own CSS even then.
      return {
        ok: true,
        status: 200,
        json: async () => ({
          template: DEFAULT_LAYOUT,
          css: '/* Site-wide CSS will be inherited */\n/* Add your custom CSS below to extend the site styles */\n\n',
          cssMode: 'inherit',
        }),
      } as any;
    }
    if (u.includes('/api/templates/compile')) {
      const body = JSON.parse(init.body);
      return {
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          compiled: { compiledFrom: body.template, islands: [] },
          errors: [],
          warnings: [],
          strippedComponents: [],
        }),
      } as any;
    }
    return { ok: true, status: 200, json: async () => ({}) } as any;
  }) as any;
}

const user = { id: 'test-user-123', primaryHandle: 'testuser@local', handles: [], profile: {} };

function renderEditor(props: Partial<React.ComponentProps<typeof EnhancedTemplateEditor>> = {}) {
  const onSave = jest.fn().mockResolvedValue(undefined);
  render(
    <ToastProvider>
      <EnhancedTemplateEditor
        user={user}
        initialTemplate=""
        initialCSS={THEME}
        initialTemplateMode="enhanced"
        initialEditorMode="template"
        onSave={onSave}
        {...props}
      />
    </ToastProvider>
  );
  return { onSave };
}

const PLAIN = splitStarter(STARTERS[0].template);

async function waitForPlainPage() {
  await waitFor(() =>
    expect((screen.getByLabelText('template-code') as HTMLTextAreaElement).value).toBe(PLAIN.html)
  );
}

function openCSSTab() {
  fireEvent.click(screen.getByRole('button', { name: 'CSS Styles' }));
  return screen.getByLabelText('css-code') as HTMLTextAreaElement;
}

beforeEach(() => {
  installFetch();
  window.localStorage.clear();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('A new HTML page (?mode=template on a standard-layout profile)', () => {
  it('opens with the Plain page starter, HTML and CSS', async () => {
    renderEditor();
    await waitForPlainPage();
    expect(STARTERS[0].id).toBe('plain-page');
    expect(openCSSTab().value).toBe(PLAIN.css);
  });

  it('says before saving that the old look stays in History, and saves the starter', async () => {
    const { onSave } = renderEditor();
    await waitForPlainPage();
    expect(screen.getByText('Saving changes your CSS. The old look stays in History.')).toBeInTheDocument();
    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith('/api/templates/compile', expect.anything())
    );
    await act(async () => {});

    fireEvent.click(screen.getByRole('button', { name: 'Save & Go Live' }));

    await waitFor(() => expect(onSave).toHaveBeenCalled());
    const [savedTemplate, savedCSS] = onSave.mock.calls[0];
    expect(savedTemplate).toBe(PLAIN.html);
    expect(savedCSS).toBe(PLAIN.css);
  });
});

describe('A save that changes the CSS', () => {
  it('says beforehand and afterwards that the old look is in History', async () => {
    const { onSave } = renderEditor({ initialTemplate: '<p>my page</p>', initialTemplateMode: 'advanced' });
    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith('/api/templates/compile', expect.anything())
    );

    expect(screen.queryByText(/old look/i)).not.toBeInTheDocument();
    fireEvent.change(openCSSTab(), { target: { value: '/* something new */' } });

    expect(screen.getByText('Saving changes your CSS. The old look stays in History.')).toBeInTheDocument();

    await act(async () => {});
    fireEvent.click(screen.getByRole('button', { name: 'Save Template' }));

    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][1]).toBe('/* something new */');
    await waitFor(() => expect(screen.getByText('✓ Saved. Your old look is in History.')).toBeInTheDocument());
    // Now the new CSS is the saved one; the "before" note goes away.
    expect(screen.queryByText('Saving changes your CSS. The old look stays in History.')).not.toBeInTheDocument();
  });
});

describe('Reset to Default', () => {
  it('asks first even with nothing unsaved, because it saves straight away', async () => {
    renderEditor({ initialTemplate: '<p>my page</p>', initialTemplateMode: 'advanced' });
    await screen.findByLabelText('template-code');
    (global.fetch as jest.Mock).mockClear();

    fireEvent.click(screen.getByRole('button', { name: /reset to default/i }));

    const dialog = await screen.findByRole('alertdialog');
    expect(dialog).toHaveTextContent('Your current HTML and CSS stay in History.');
    // Nothing was written yet.
    expect(global.fetch).not.toHaveBeenCalledWith(expect.stringContaining('/api/profile/'), expect.anything());
  });
});

describe('Editor header', () => {
  it('shows no developer text', async () => {
    renderEditor({ initialTemplate: '<p>my page</p>', initialTemplateMode: 'advanced' });
    await screen.findByLabelText('template-code');

    const text = document.body.textContent || '';
    expect(text).not.toMatch(/Database:/);
    expect(text).not.toMatch(/Profile Mode/);
    expect(text).not.toMatch(/CSS Mode:/);
    expect(screen.getByText('your own HTML layout')).toBeInTheDocument();
  });
});
