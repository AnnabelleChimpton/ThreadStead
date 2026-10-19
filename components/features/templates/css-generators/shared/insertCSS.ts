import type { EditorView } from '@codemirror/view';

export interface CSSInsertion {
  from: number;
  to: number;
  insert: string;
  /** Where the cursor lands afterwards: just past the inserted rule. */
  cursor: number;
}

/**
 * Where and how a generated rule goes into a stylesheet. The rule always gets
 * its own lines, and a cursor sitting inside another rule's `{ … }` moves to
 * just after that rule's closing brace, so a generator never nests one rule
 * inside another.
 */
export function planCSSInsertion(doc: string, from: number, to: number, snippet: string): CSSInsertion {
  let depth = 0;
  for (let i = 0; i < from; i++) {
    if (doc[i] === '{') depth++;
    else if (doc[i] === '}') depth = Math.max(0, depth - 1);
  }
  if (depth > 0) {
    let i = from;
    while (i < doc.length && depth > 0) {
      if (doc[i] === '{') depth++;
      else if (doc[i] === '}') depth--;
      i++;
    }
    if (doc[i] === '\n') i++;
    from = to = i;
  }

  const before = from > 0 && doc[from - 1] !== '\n' ? '\n' : '';
  const insert = `${before}${snippet.trim()}\n`;
  return { from, to, insert, cursor: from + insert.length };
}

/**
 * Put a generated rule into the CodeMirror editor. At the cursor once the
 * person has clicked into the editor; before that, at the end, so the new rule
 * comes after (and wins over) whatever is already there.
 */
export function insertCSSIntoView(view: EditorView, snippet: string, atCursor: boolean) {
  const doc = view.state.doc.toString();
  const { from, to } = atCursor ? view.state.selection.main : { from: doc.length, to: doc.length };
  const plan = planCSSInsertion(doc, from, to, snippet);
  view.dispatch({
    changes: { from: plan.from, to: plan.to, insert: plan.insert },
    selection: { anchor: plan.cursor },
    scrollIntoView: true,
  });
  view.focus();
  // On a phone the tools sit below the editor; bring the editor back up so
  // the new rule is visible. A no-op when it's already on screen. Instant:
  // the site's smooth scrolling gets cut short by the editor's own scroll.
  view.dom.scrollIntoView?.({ block: 'nearest', behavior: 'instant' });
}
