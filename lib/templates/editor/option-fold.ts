/**
 * A page's theme option lines (<meta name="color:Paper" content="…"> and
 * font:…), folded in the HTML pane to one line that reads "5 page options"
 * with their colours, so a beginner's first line is their page. The Options
 * strip above the code changes them; a click on the folded line opens them.
 * Folded when they first appear: when the pane opens, or a starter or a
 * pasted page brings them.
 */
import { codeFolding, foldEffect } from '@codemirror/language';
import { EditorView } from '@codemirror/view';
import type { EditorState, Text } from '@codemirror/state';
import { scanThemeOptions, type ThemeOption } from '@/lib/templates/compilation/theme-options';

const OPTION_LINE = /^\s*<meta\b[^<>]*\bname\s*=\s*["']?(?:color|font):[^<>]*>\s*$/i;
/** They sit near the top; a long page isn't scanned on every key */
const LOOK_AT_LINES = 100;

/** The first run of two or more lines holding nothing but option <meta>s */
export function optionLines(doc: Text): { from: number; to: number } | null {
  let first = 0;
  for (let n = 1; n <= Math.min(doc.lines, LOOK_AT_LINES) + 1; n++) {
    const isOption = n <= doc.lines && OPTION_LINE.test(doc.line(n).text);
    if (isOption && !first) first = n;
    if (!isOption && first) {
      if (n - first >= 2) return { from: doc.line(first).from, to: doc.line(n - 1).to };
      first = 0;
    }
  }
  return null;
}

/** Fold the option lines, if there are any */
export function foldOptionLines(view: EditorView) {
  const range = optionLines(view.state.doc);
  if (range) view.dispatch({ effects: foldEffect.of(range) });
}

function placeholder(view: EditorView, onclick: (event: Event) => void, options: ThemeOption[] | null): HTMLElement {
  const element = document.createElement('span');
  element.className = 'cm-foldPlaceholder';
  element.onclick = onclick;
  if (!options) {
    // Any other fold looks as it always has
    element.textContent = '…';
    element.setAttribute('aria-label', 'folded code');
    element.title = 'unfold';
    return element;
  }
  element.title = 'Show the lines that set these';
  element.textContent = `${options.length} page option${options.length === 1 ? '' : 's'}`;
  for (const option of options) {
    if (option.type !== 'color') continue;
    const swatch = document.createElement('span');
    swatch.className = 'ts-option-swatch';
    // Checked colours only (scanThemeOptions), so nothing else gets in
    swatch.style.background = option.value;
    element.appendChild(swatch);
  }
  return element;
}

export function optionFolding() {
  return [
    codeFolding({
      // A folded run of option lines gets its options; any other fold, null
      preparePlaceholder: (state: EditorState, range: { from: number; to: number }) => {
        const text = state.sliceDoc(range.from, range.to);
        return text.split('\n').every((line) => OPTION_LINE.test(line)) ? scanThemeOptions(text).options : null;
      },
      placeholderDOM: placeholder,
    }),
    // Lines that weren't there before (a starter, a pasted page): folded once
    EditorView.updateListener.of((update) => {
      if (update.docChanged && !optionLines(update.startState.doc) && optionLines(update.state.doc)) {
        setTimeout(() => foldOptionLines(update.view));
      }
    }),
    EditorView.baseTheme({
      '.ts-option-swatch': {
        display: 'inline-block',
        width: '0.75em',
        height: '0.75em',
        marginLeft: '0.3em',
        verticalAlign: 'middle',
        border: '1px solid rgba(0,0,0,0.5)',
      },
    }),
  ];
}
