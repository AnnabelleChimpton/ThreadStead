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

async function renderAndPaste(value: string, initialCSS = '', how: 'paste' | 'type' = 'paste') {
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
  const code = screen.getByLabelText('template-code');
  if (how === 'paste') fireEvent.paste(code, { clipboardData: { getData: () => value } });
  else fireEvent.change(code, { target: { value } });
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

  it("a whole page with its own <style> replaces the old CSS, so the starter's rules don't restyle it", async () => {
    const { css } = await renderAndPaste(pasted(''), 'h2 { font-size: 1rem; }')
    expect(css).toBe('body { color: pink; }')
  })

  it('a piece of a page adds its CSS once, even when the same <style> comes back', async () => {
    const { css } = await renderAndPaste('<p>hi</p>\n<style>p { color: teal; }</style>', 'p { color: teal; }')
    expect(css).toBe('p { color: teal; }')
  })

  it('leaves other stylesheet links, and preconnects with no font to go with them, in the HTML', () => {
    // Nothing to move: the paste goes in as it is
    const { movePastedStyles } = jest.requireActual('@/lib/templates/editor/pasted-styles')
    expect(movePastedStyles(
      pasted('<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="stylesheet" href="https://example.neocities.org/style.css">', ''),
      ''
    )).toBeNull()
  });
});

describe('only a paste moves them (template audit 07 #3)', () => {
  it('a <style> typed by hand stays where it was written', async () => {
    const { template, css } = await renderAndPaste('<p>hi</p>\n<style>p { color: teal; }</style>', '', 'type')
    expect(template).toContain('<style>p { color: teal; }</style>')
    expect(css).toBe('')
  })

  it('a <style media> keeps its media, and a whole page replaces the CSS even over another whole page', () => {
    const { movePastedStyles } = jest.requireActual('@/lib/templates/editor/pasted-styles')
    expect(movePastedStyles('<p>x</p><style media="print">nav { display: none }</style>', '').css)
      .toBe('@media print {\nnav { display: none }\n}')
    expect(movePastedStyles(pasted(''), 'h2 { color: red }').css).toBe('body { color: pink; }')
    expect(movePastedStyles('<p>no styles</p>', 'x')).toBeNull()
  })

})

describe('one undo takes back a paste and the CSS it moved (template audit 07 #3)', () => {
  // A real CodeMirror: the editor dispatches the paste with the CSS on it
  const { EditorView } = jest.requireActual('@codemirror/view')
  const { history, undo, redo } = jest.requireActual('@codemirror/commands')
  const { movePastedStyles, pastedCSS, pastedCSSHistory } = jest.requireActual('@/lib/templates/editor/pasted-styles')

  function pasteInto(css: string) {
    let current = css
    const setCSS = (update: (css: string) => string) => { current = update(current) }
    const view = new EditorView({ doc: '<p>starter</p>', extensions: [history(), pastedCSSHistory(setCSS)] })
    const moved = movePastedStyles(pasted(''), css)
    view.dispatch(view.state.replaceSelection(moved.html), { effects: pastedCSS.of({ from: css, to: moved.css }) })
    return { view, css: () => current, edit: (next: string) => { current = next } }
  }

  it('undo puts the old CSS back with the old HTML, and redo moves it again', () => {
    const { view, css } = pasteInto('h2 { font-size: 1rem; }')
    expect(css()).toBe('body { color: pink; }')
    undo(view)
    expect(view.state.doc.toString()).toBe('<p>starter</p>')
    expect(css()).toBe('h2 { font-size: 1rem; }')
    redo(view)
    expect(view.state.doc.toString()).toContain('<p>hello</p>')
    expect(css()).toBe('body { color: pink; }')
  })

  it('CSS edited since the paste stays as it is', () => {
    const { view, css, edit } = pasteInto('h2 { font-size: 1rem; }')
    edit('body { color: teal; }')
    undo(view)
    expect(css()).toBe('body { color: teal; }')
  })
})

describe('afterEnclosingTag: inserts never land inside a tag', () => {
  // After Insert image the cursor sits in alt="", and the next palette
  // insert went into the attribute: <img alt="<FriendDisplay />"> (template audit 07 #6)
  const { afterEnclosingTag } = jest.requireActual('../EnhancedTemplateEditor')
  const at = (marked: string) => {
    const pos = marked.indexOf('|')
    const html = marked.replace('|', '')
    const out = afterEnclosingTag(html, pos)
    return html.slice(0, out) + '|' + html.slice(out)
  }
  test.each([
    ['<img src="cat.png" alt="|">', '<img src="cat.png" alt="">|'],
    ['<p class="a|b">hi</p>', '<p class="ab">|hi</p>'],
    ['<p>hi |there</p>', '<p>hi |there</p>'],
    ['<p>2 < 3 and |more</p>', '<p>2 < 3 and |more</p>'],
    ['<img alt="">|<p>x</p>', '<img alt="">|<p>x</p>'],
  ])('%s → %s', (marked, expected) => expect(at(marked)).toBe(expected))
})
