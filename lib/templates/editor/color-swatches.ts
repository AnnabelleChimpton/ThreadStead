/**
 * A swatch before every colour in the CSS pane: hex, rgb(), hsl() and the
 * colour names, as the CSS parser sees them. Clicking one opens the
 * browser's colour picker, and picking writes the new colour in place of
 * the old; a drag through the picker is one edit Undo takes back.
 * The Generators tab did this a long way round.
 */
import { syntaxTree } from '@codemirror/language';
import { Decoration, type DecorationSet, EditorView, ViewPlugin, type ViewUpdate, WidgetType } from '@codemirror/view';
import type { Range } from '@codemirror/state';
import { colorInputValue } from '@/lib/utils/css/color-input';

/** Words CSS takes as colours that a swatch can't show or change */
const NOT_SWATCHES = new Set(['inherit', 'initial', 'unset', 'revert', 'currentcolor', 'transparent']);

class Swatch extends WidgetType {
  constructor(readonly color: string, readonly length: number) {
    super();
  }

  eq(other: Swatch) {
    return other.color === this.color && other.length === this.length;
  }

  toDOM(view: EditorView) {
    const swatch = document.createElement('span');
    swatch.className = 'ts-color-swatch';
    const picker = document.createElement('input');
    picker.type = 'color';
    // Where the colour is now, however the text before it has changed
    picker.addEventListener('input', () => {
      const from = view.posAtDOM(swatch);
      view.dispatch({ changes: { from, to: from + Number(swatch.dataset.length), insert: picker.value }, userEvent: 'input.type.color' });
    });
    swatch.appendChild(picker);
    this.updateDOM(swatch);
    return swatch;
  }

  // The same element once a pick has changed the colour: a new one closed
  // the picker under the person's pointer
  updateDOM(swatch: HTMLElement) {
    swatch.style.background = this.color;
    swatch.dataset.length = String(this.length);
    const picker = swatch.querySelector('input')!;
    picker.setAttribute('aria-label', `Change ${this.color}`);
    if (document.activeElement !== picker) picker.value = colorInputValue(this.color);
    return true;
  }

  ignoreEvent() {
    return true;
  }
}

function swatches(view: EditorView): DecorationSet {
  const marks: Range<Decoration>[] = [];
  for (const { from, to } of view.visibleRanges) {
    syntaxTree(view.state).iterate({
      from,
      to,
      enter: (node) => {
        // The parser reads a selector like #bad or #cafe as a colour inside
        // an error: no swatch there, or anywhere it has given up
        if (node.node.parent?.type.isError) return false;
        const text = view.state.doc.sliceString(node.from, node.to);
        const isColor =
          node.name === 'ColorLiteral' ||
          (node.name === 'CallExpression' && /^(?:rgba?|hsla?)\(/i.test(text)) ||
          (node.name === 'ValueName' && !NOT_SWATCHES.has(text.toLowerCase()) && typeof CSS !== 'undefined' && CSS.supports('color', text));
        if (!isColor) return;
        marks.push(Decoration.widget({ widget: new Swatch(text, text.length), side: -1 }).range(node.from));
        return false;
      },
    });
  }
  return Decoration.set(marks);
}

const swatchTheme = EditorView.baseTheme({
  '.ts-color-swatch': {
    position: 'relative',
    display: 'inline-block',
    width: '0.8em',
    height: '0.8em',
    marginRight: '0.25em',
    verticalAlign: 'middle',
    border: '1px solid rgba(0,0,0,0.5)',
    cursor: 'pointer',
  },
  '.ts-color-swatch input': {
    position: 'absolute',
    inset: '0',
    width: '100%',
    height: '100%',
    opacity: '0',
    padding: '0',
    border: '0',
    cursor: 'pointer',
  },
});

export function colorSwatches() {
  return [
    ViewPlugin.fromClass(
      class {
        decorations: DecorationSet;
        constructor(view: EditorView) {
          this.decorations = swatches(view);
        }
        update(update: ViewUpdate) {
          if (update.docChanged || update.viewportChanged || syntaxTree(update.startState) !== syntaxTree(update.state)) {
            this.decorations = swatches(update.view);
          }
        }
      },
      { decorations: (plugin) => plugin.decorations }
    ),
    swatchTheme,
  ];
}
