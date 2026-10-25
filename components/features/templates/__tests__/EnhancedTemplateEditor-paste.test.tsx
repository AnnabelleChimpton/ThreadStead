/**
 * Pasting a whole Neocities page: <style> blocks and Google Fonts links move
 * to the CSS tab (fonts as @import lines), so the CSS tab shows everything
 * the page's look depends on.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import EnhancedTemplateEditor from '../EnhancedTemplateEditor';
import { ToastProvider } from '@/contexts/ToastContext';
import { STARTERS, splitStarter } from '@/lib/templates/starters';

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

// jsdom lays nothing out, and a real CodeMirror (pasteInto) measures text once a frame
beforeAll(() => {
  Range.prototype.getClientRects = () => [] as unknown as DOMRectList;
  Range.prototype.getBoundingClientRect = () => ({ x: 0, y: 0, width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0, toJSON: () => ({}) });
});

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
  // An answer to "Use this page's CSS?" lands a tick later
  await act(async () => {});
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

  it("a whole page with its own <style> replaces an untouched starter's CSS, so its rules don't restyle it", async () => {
    const { css } = await renderAndPaste(pasted(''), splitStarter(STARTERS[0].template).css)
    expect(css).toBe('body { color: pink; }')
  })

  it('over CSS of your own, it asks first: Use its CSS replaces it, Add it to mine keeps it', async () => {
    jest.spyOn(window, 'confirm').mockReturnValueOnce(true)
    expect((await renderAndPaste(pasted(''), 'h2 { font-size: 1rem; }')).css).toBe('body { color: pink; }')
  })

  it('Add it to mine puts it under your CSS', async () => {
    jest.spyOn(window, 'confirm').mockReturnValueOnce(false)
    expect((await renderAndPaste(pasted(''), 'h2 { font-size: 1rem; }')).css).toBe('h2 { font-size: 1rem; }\n\n/* Extracted from HTML */\nbody { color: pink; }')
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

  it('a whole page keeps its Google Fonts even when the CSS it replaces had them too', () => {
    const { movePastedStyles } = jest.requireActual('@/lib/templates/editor/pasted-styles')
    expect(movePastedStyles(pasted(`<link rel="stylesheet" href="${FONT_HREF}">`), `${FONT_IMPORT}\nh2 { color: red }`).css)
      .toBe(`${FONT_IMPORT}\n\nbody { color: pink; }`)
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

describe('onItsOwnLine: an insert at the end or start of a line gets a line of its own', () => {
  const { onItsOwnLine } = jest.requireActual('../EnhancedTemplateEditor')
  // `|` is the cursor before, and where it lands after
  const insert = (marked: string, snippet: string, cursor = snippet.length) => {
    const pos = marked.indexOf('|')
    const doc = marked.replace('|', '')
    const placed = onItsOwnLine(doc, pos, snippet, cursor)
    const out = doc.slice(0, placed.from) + placed.insert + doc.slice(placed.from)
    return out.slice(0, placed.cursor) + '|' + out.slice(placed.cursor)
  }
  test.each([
    ['at the end of a line, indented like it', '  <p>hi</p>|\n</main>', '<Guestbook />', '  <p>hi</p>\n  <Guestbook />|\n</main>'],
    ['at the start of a line, above it', '<main>\n  |<p>hi</p>', '<Guestbook />', '<main>\n  <Guestbook />|\n  <p>hi</p>'],
    ['in the middle of text, where the cursor is', '<p>You rolled |today</p>', '<ShowVar name="roll" />', '<p>You rolled <ShowVar name="roll" />|today</p>'],
    ['on an empty line, as it is', '<main>\n  |\n</main>', '<Bio />', '<main>\n  <Bio />|\n</main>'],
  ])('%s', (_case, marked, snippet, expected) => expect(insert(marked, snippet)).toBe(expected))

  test('a snippet over several lines keeps them indented, and the cursor lands inside', () => {
    expect(insert('  <p>hi</p>|', '<RetroCard>\n  \n</RetroCard>', 14)).toBe('  <p>hi</p>\n  <RetroCard>\n    |\n  </RetroCard>')
  })
})

describe('dropping an .html file on the HTML pane', () => {
  async function drop(contents: string, name = 'index.html') {
    const onSave = jest.fn().mockResolvedValue(undefined)
    render(
      <ToastProvider>
        <EnhancedTemplateEditor user={user} initialTemplate="<p>before</p>" initialCSS="" initialTemplateMode="advanced" initialEditorMode="template" onSave={onSave} />
      </ToastProvider>
    )
    // jsdom's File has no text(); every browser's does
    const file = { name, type: 'text/html', text: async () => contents }
    fireEvent.drop(screen.getByLabelText('template-code'), { dataTransfer: { files: [file] } })
    await waitFor(() => expect((screen.getByLabelText('template-code') as HTMLTextAreaElement).value).not.toBe('<p>before</p>'))
    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => expect(onSave).toHaveBeenCalled())
    const [template, css] = onSave.mock.calls[0]
    return { template: template as string, css: css as string }
  }

  it('a whole page takes the place of what was there, its CSS to the CSS tab', async () => {
    const { template, css } = await drop(pasted(''))
    expect(template).not.toContain('before')
    expect(template).toContain('<p>hello</p>')
    expect(css).toBe('body { color: pink; }')
  })

  it('a piece of a page goes in with what was there', async () => {
    const { template } = await drop('<p>a piece</p>', 'piece.htm')
    expect(template).toContain('<p>before</p>')
    expect(template).toContain('<p>a piece</p>')
  })
})

describe('Bring in my page from my site (Starter pages)', () => {
  it('lists your verified sites, and brings the page in like a dropped one', async () => {
    global.fetch = jest.fn(async (url: string, init?: { method?: string }) => {
      if (String(url).includes('/api/sites/import')) {
        return init?.method === 'POST'
          ? { ok: true, status: 200, json: async () => ({ html: pasted('', '<style>h1 { color: crimson; }</style>') }) }
          : { ok: true, status: 200, json: async () => ({ sites: [{ id: 's1', address: 'pat.neocities.org' }] }) }
      }
      return { ok: true, status: 200, json: async () => ({ success: true, compiled: { islands: [] } }) }
    }) as unknown as typeof fetch
    const onSave = jest.fn().mockResolvedValue(undefined)
    render(
      <ToastProvider>
        <EnhancedTemplateEditor user={user} initialTemplate="<p>before</p>" initialCSS="" initialTemplateMode="advanced" initialEditorMode="template" onSave={onSave} />
      </ToastProvider>
    )
    fireEvent.click(screen.getByRole('tab', { name: 'Starter pages' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Bring in pat.neocities.org' }))
    await waitFor(() => expect((screen.getByLabelText('template-code') as HTMLTextAreaElement).value).toContain('<p>hello</p>'))
    expect(screen.getByRole('tab', { name: 'HTML' })).toHaveAttribute('aria-selected', 'true')
    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => expect(onSave).toHaveBeenCalled())
    const [template, css] = onSave.mock.calls[0]
    expect(template).not.toContain('before')
    expect(css).toBe('h1 { color: crimson; }')
  })

  it('with no verified site, points to Settings', async () => {
    global.fetch = jest.fn(async () => ({ ok: true, status: 200, json: async () => ({ sites: [] }) })) as unknown as typeof fetch
    render(
      <ToastProvider>
        <EnhancedTemplateEditor user={user} initialTemplate="<p>before</p>" initialTemplateMode="advanced" initialEditorMode="template" onSave={jest.fn()} />
      </ToastProvider>
    )
    fireEvent.click(screen.getByRole('tab', { name: 'Starter pages' }))
    expect(await screen.findByRole('link', { name: 'Add it in Settings' })).toHaveAttribute('href', '/settings?tab=sites')
  })
})
