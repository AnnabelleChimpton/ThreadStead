/**
 * Generators and the class reference put their CSS into the CodeMirror
 * editor through these. They used to look for a <textarea>, which stopped
 * existing when the editor became CodeMirror, so Insert silently did nothing.
 */
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { planCSSInsertion, insertCSSIntoView } from '../insertCSS';

const RULE = '.thread-surface {\n  color: pink;\n}';

function apply(doc: string, at: number, to = at) {
  const plan = planCSSInsertion(doc, at, to, RULE);
  return { text: doc.slice(0, plan.from) + plan.insert + doc.slice(plan.to), plan };
}

describe('planCSSInsertion', () => {
  it('appends on its own line after existing rules', () => {
    const doc = '.a {\n  color: red;\n}';
    expect(apply(doc, doc.length).text).toBe(`.a {\n  color: red;\n}\n${RULE}\n`);
  });

  it('never nests a rule inside another rule', () => {
    const doc = '.a {\n  color: red;\n}\n.b { margin: 0; }\n';
    const inside = doc.indexOf('color');
    const { text } = apply(doc, inside);
    expect(text).toBe(`.a {\n  color: red;\n}\n${RULE}\n.b { margin: 0; }\n`);
  });

  it('copes with nested blocks (media queries)', () => {
    const doc = '@media (max-width: 600px) {\n  .a { color: red; }\n}\n';
    const { text } = apply(doc, doc.indexOf('color'));
    expect(text).toBe(`@media (max-width: 600px) {\n  .a { color: red; }\n}\n${RULE}\n`);
  });

  it('replaces a selection between rules', () => {
    const doc = '.a {}\nOLD\n.b {}\n';
    const from = doc.indexOf('OLD');
    expect(apply(doc, from, from + 3).text).toBe(`.a {}\n${RULE}\n\n.b {}\n`);
  });

  it('puts the cursor right after the inserted rule', () => {
    const doc = '.a {}\n';
    const { text, plan } = apply(doc, doc.length);
    expect(text.slice(0, plan.cursor)).toBe(`.a {}\n${RULE}\n`);
  });
});

describe('insertCSSIntoView', () => {
  function makeView(doc: string, cursor: number) {
    const parent = document.createElement('div');
    document.body.appendChild(parent);
    return new EditorView({
      state: EditorState.create({ doc, selection: { anchor: cursor } }),
      parent,
    });
  }

  it('appends when the person has not placed the cursor yet', () => {
    const view = makeView('.a {}\n.b {}\n', 0);
    insertCSSIntoView(view, RULE, false);
    expect(view.state.doc.toString()).toBe(`.a {}\n.b {}\n${RULE}\n`);
    view.destroy();
  });

  it('inserts at the cursor once they have', () => {
    const view = makeView('.a {}\n.b {}\n', '.a {}\n'.length);
    insertCSSIntoView(view, RULE, true);
    expect(view.state.doc.toString()).toBe(`.a {}\n${RULE}\n.b {}\n`);
    view.destroy();
  });
});
