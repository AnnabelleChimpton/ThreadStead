/**
 * Words on the preview, the preview's side (design/words-on-preview/DESIGN.md).
 * Browser only, for pages/template-preview.tsx.
 *
 * An editor compile marks each element with where its words are in the
 * source (data-ts-text: a range for each text node in it, "x" where it
 * can't be said) and where its start tag is (data-ts-at). With Words on,
 * the outermost elements holding words become editable (plain text only).
 * Leaving one sends its changed runs to the editor, which writes them into
 * the code as one edit. An edit that takes out or adds a tag, or adds words
 * the code has no place for, goes back: tags are the code's business.
 * Alt-click sends where an element's tag is, Words on or off.
 */
import type { WordsChange } from './words';

export type WordsMessage =
  | { type: 'WORDS_EDIT'; changes: WordsChange[] }
  | { type: 'WORDS_REFUSED' }
  | { type: 'GO_TO_SOURCE'; at: number };

interface Run {
  node: Text;
  range: [number, number];
  original: string;
}

// Sunset with a faint light ring, so it shows on a dark page and a light one
const STYLE = `
[data-words-host] { cursor: text; }
[data-words-host]:hover { outline: 2px dashed #e27d60 !important; outline-offset: 2px !important; }
[data-words-host]:focus { outline: 2px solid #e27d60 !important; outline-offset: 2px !important; box-shadow: 0 0 0 5px rgba(255, 255, 255, 0.35) !important; }
`;

/** Components and the site's chrome aren't the page's words */
const NOT_WORDS = 'ts-island, [data-site-chrome], textarea, select, option, script, style';

export function wordsOnPage(doc: Document, send: (message: WordsMessage) => void, revert: () => void) {
  let on = false;
  let runs: Run[] = [];
  let hosts: HTMLElement[] = [];
  let shut: HTMLElement[] = [];
  // `only`: the block is one run of words and nothing else (most headings,
  // paragraphs, list items and links). Typing over all of it gives the
  // browser a new text node, so its words are read whole.
  let editing: { host: HTMLElement; observer: MutationObserver; broken: boolean; only: Run | null } | null = null;
  const style = doc.createElement('style');
  style.textContent = STYLE;

  const root = () => doc.querySelector('[data-template-root]');

  const index = () => {
    runs = [];
    const page = root();
    if (!page) return;
    for (const el of Array.from(page.querySelectorAll<HTMLElement>('[data-ts-text]'))) {
      if (el.closest(NOT_WORDS)) continue;
      const ranges = el.getAttribute('data-ts-text')!.split(',');
      const texts = Array.from(el.childNodes).filter((n): n is Text => n.nodeType === 3);
      // The browser read the HTML into different text nodes than the compile: leave it be
      if (texts.length !== ranges.length) continue;
      texts.forEach((node, i) => {
        const range = ranges[i].match(/^(\d+)-(\d+)$/);
        if (!range || !node.data.trim()) return;
        runs.push({ node, range: [Number(range[1]), Number(range[2])], original: node.data });
      });
    }
  };

  const clear = () => {
    for (const host of hosts) {
      host.removeAttribute('contenteditable');
      host.removeAttribute('data-words-host');
    }
    for (const el of shut) el.removeAttribute('contenteditable');
    hosts = [];
    shut = [];
  };

  const apply = () => {
    clear();
    index();
    if (!on) return;
    const owners = new Set(runs.map((run) => run.node.parentElement!));
    for (const el of owners) {
      let up = el.parentElement;
      while (up && !owners.has(up)) up = up.parentElement;
      if (up) continue;
      el.setAttribute('contenteditable', 'plaintext-only');
      el.setAttribute('data-words-host', '');
      hosts.push(el);
      // A component inside stays the component's
      for (const inner of Array.from(el.querySelectorAll<HTMLElement>('ts-island'))) {
        inner.setAttribute('contenteditable', 'false');
        shut.push(inner);
      }
    }
  };

  // A tag taken out or put in, or words where the code has no text, can't go back as words
  const breaks = (records: MutationRecord[], only: Run | null) =>
    records.some((record) =>
      record.type === 'childList' &&
      [...Array.from(record.addedNodes), ...Array.from(record.removedNodes)].some((node) =>
        node.nodeType === 1
          ? (node as Element).localName !== 'br'
          : !only && node.nodeType === 3 && !runs.some((run) => run.node === node) && !!(node as Text).data.trim()
      )
    );

  const start = (host: HTMLElement) => {
    const only = host.childNodes.length === 1 ? runs.find((run) => run.node === host.firstChild) ?? null : null;
    const observer = new MutationObserver((records) => {
      if (editing && breaks(records, editing.only)) editing.broken = true;
    });
    observer.observe(host, { childList: true, subtree: true });
    editing = { host, observer, broken: false, only };
  };

  const finish = () => {
    if (!editing) return;
    const { host, observer, only } = editing;
    // Records not delivered yet: an edit and leaving it in the same moment
    const broken = editing.broken || breaks(observer.takeRecords(), only);
    observer.disconnect();
    editing = null;
    if (broken) {
      send({ type: 'WORDS_REFUSED' });
      revert();
      return;
    }
    const changes = (only
      ? [{ range: only.range, before: only.original, after: (host.textContent ?? '').replace(/\n$/, '') }]
      : runs
          .filter((run) => host.contains(run.node) || (!run.node.isConnected && run.node.parentElement === null))
          // A run emptied out: the browser may take its text node away
          .map((run) => ({ range: run.range, before: run.original, after: run.node.isConnected ? run.node.data : '' }))
    ).filter((change) => change.after !== change.before);
    if (changes.length > 0) send({ type: 'WORDS_EDIT', changes });
  };

  const hostOf = (target: EventTarget | null) =>
    target instanceof Element ? (target.closest('[data-words-host]') as HTMLElement | null) : null;

  const onFocusIn = (event: FocusEvent) => {
    const host = hostOf(event.target);
    if (host && on) start(host);
  };
  const onFocusOut = (event: FocusEvent) => {
    if (editing && hostOf(event.target) === editing.host) finish();
  };
  const onKeyDown = (event: KeyboardEvent) => {
    const host = hostOf(event.target);
    if (!host || !editing) return;
    // A new line would be a new tag: Enter is done, Escape puts it back
    if (event.key === 'Enter') {
      event.preventDefault();
      host.blur();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      editing.observer.disconnect();
      editing = null;
      host.blur();
      revert();
    }
  };
  const onClick = (event: MouseEvent) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target || !root()?.contains(target)) return;
    if (event.altKey) {
      const el = target.closest('[data-ts-at]');
      if (el && !target.closest('ts-island')) {
        event.preventDefault();
        send({ type: 'GO_TO_SOURCE', at: Number(el.getAttribute('data-ts-at')) });
      }
      return;
    }
    // Links stay put while you write in them
    if (on && target.closest('a') && !target.closest('ts-island')) event.preventDefault();
  };

  doc.addEventListener('focusin', onFocusIn);
  doc.addEventListener('focusout', onFocusOut);
  doc.addEventListener('keydown', onKeyDown);
  doc.addEventListener('click', onClick, true);

  return {
    /** Words on or off */
    set(next: boolean) {
      if (next === on) return;
      on = next;
      if (on) doc.head.appendChild(style);
      else style.remove();
      apply();
    },
    /** After the page has been drawn again */
    refresh() {
      apply();
    },
    /** Someone is writing: a redraw now would take their words away */
    isEditing() {
      return editing !== null;
    },
    destroy() {
      clear();
      style.remove();
      doc.removeEventListener('focusin', onFocusIn);
      doc.removeEventListener('focusout', onFocusOut);
      doc.removeEventListener('keydown', onKeyDown);
      doc.removeEventListener('click', onClick, true);
    },
  };
}
