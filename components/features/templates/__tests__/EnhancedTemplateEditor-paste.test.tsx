/**
 * Pasting a whole Neocities page: <style> blocks and Google Fonts links move
 * to the CSS tab (fonts as @import lines), so the CSS tab shows everything
 * the page's look depends on.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import EnhancedTemplateEditor from '../EnhancedTemplateEditor';
import { ToastProvider } from '@/contexts/ToastContext';

// CodeMirror (the only next/dynamic import the editor uses) becomes a textarea
jest.mock('next/dynamic', () => () => {
  const FakeDynamic = (props: { value: string; placeholder?: string; onChange?: (value: string) => void }) =>
    typeof props.onChange === 'function' ? (
      <textarea
        aria-label={props.placeholder?.startsWith('Write your page') ? 'template-code' : 'css-code'}
        value={props.value}
        onChange={(e) => props.onChange?.(e.target.value)}
      />
    ) : null;
  return FakeDynamic;
});

const user = { id: 'test-user-123', primaryHandle: 'testuser@local', handles: [], profile: {} };

const FONT_HREF = 'https://fonts.googleapis.com/css2?family=VT323&amp;family=Pixelify+Sans:wght@400;700&amp;display=swap';
const FONT_IMPORT = '@import url("https://fonts.googleapis.com/css2?family=VT323&family=Pixelify+Sans:wght@400;700&display=swap");';

const pasted = (links: string, style = '<style>body { color: pink; }</style>') => `<!DOCTYPE html>
<html>
<head>
<title>my website</title>
${links}
${style}
</head>
<body>
<p>hello</p>
</body>
</html>`;

beforeEach(() => {
  global.fetch = jest.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => ({ success: true, compiled: { islands: [] } }),
  })) as unknown as typeof fetch;
  window.localStorage.clear();
});

afterEach(() => jest.restoreAllMocks());

async function renderAndPaste(value: string, initialCSS = '') {
  const onSave = jest.fn().mockResolvedValue(undefined);
  render(
    <ToastProvider>
      <EnhancedTemplateEditor
        user={user}
        initialTemplate="<p>before</p>"
        initialCSS={initialCSS}
        initialTemplateMode="advanced"
        initialEditorMode="template"
        onSave={onSave}
      />
    </ToastProvider>
  );
  fireEvent.change(screen.getByLabelText('template-code'), { target: { value } });
  // The save message replaces it once saved
  const message = document.body.textContent || '';
  fireEvent.click(screen.getByRole('button', { name: /save/i }));
  await waitFor(() => expect(onSave).toHaveBeenCalled());
  const [template, css] = onSave.mock.calls[0];
  return { template: template as string, css: css as string, message };
}

describe('EnhancedTemplateEditor paste handling', () => {
  it('moves Google Fonts links into the CSS as @import lines, ahead of the <style> CSS', async () => {
    const { template, css, message } = await renderAndPaste(
      pasted(
        '<link rel="preconnect" href="https://fonts.googleapis.com">\n' +
          '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n' +
          '<link rel="preconnect" href="https://example.neocities.org">\n' +
          `<link href="${FONT_HREF}" rel="stylesheet">`
      )
    );

    expect(message).toContain('Moved your <style> CSS and Google Fonts links to the CSS tab');
    expect(template).not.toContain('fonts.googleapis.com/css2');
    expect(template).not.toContain('<style');
    // Google's preconnect hints go with it; anything else is left for the report
    expect(template).not.toContain('fonts.g');
    expect(template).toContain('<link rel="preconnect" href="https://example.neocities.org">');
    // No blank lines where the moved tags were
    expect(template).toContain('<title>my website</title>\n<link rel="preconnect" href="https://example.neocities.org">\n</head>');
    expect(css).toBe(`${FONT_IMPORT}\n\nbody { color: pink; }`);
  });

  it('moves fonts alone and skips imports the CSS already has', async () => {
    const { css, message } = await renderAndPaste(
      pasted(`<link rel="stylesheet" href="${FONT_HREF}">\n<link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Lobster">`, ''),
      `${FONT_IMPORT}\np { margin: 0; }`
    );

    expect(message).toContain('Moved your Google Fonts links to the CSS tab as @import lines');
    expect(css).toBe(
      `${FONT_IMPORT}\np { margin: 0; }\n\n/* Extracted from HTML */\n@import url("https://fonts.googleapis.com/css?family=Lobster");`
    );
  });

  it('leaves other stylesheet links, and preconnects with no font to go with them, in the HTML', async () => {
    const { template, css } = await renderAndPaste(
      pasted('<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="stylesheet" href="https://example.neocities.org/style.css">', '')
    );

    expect(template).toContain('https://example.neocities.org/style.css');
    expect(template).toContain('<link rel="preconnect" href="https://fonts.googleapis.com">');
    expect(css).toBe('');
  });
});
