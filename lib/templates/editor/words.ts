/**
 * Words on the preview, the editor's side (design/words-on-preview/DESIGN.md):
 * a run of text changed on the preview becomes the smallest edit to the
 * code. What you didn't touch at its start and end keeps its source form,
 * entities and all; only the part you changed is written, escaped.
 *
 * The preview's ranges are in the source it was compiled from; the code may
 * have moved on since (an earlier words edit not yet recompiled), so the
 * run is found again, nearest where it was, by its exact source text.
 */

export interface WordsChange {
  /** Where the run was in the source the preview was compiled from */
  range: [number, number];
  /** The run as the preview showed it, and as it is now */
  before: string;
  after: string;
}

export interface SourceEdit {
  from: number;
  to: number;
  insert: string;
}

let probe: HTMLTextAreaElement | null = null;
/** One entity as the browser reads it (the parser read the page the same way) */
function decodeEntity(entity: string): string {
  probe ??= document.createElement('textarea');
  probe.innerHTML = entity;
  return probe.value;
}

/** Raw source → the text it reads as, and the raw span each character came from */
export function decodeWithSpans(raw: string): { text: string; spans: Array<[number, number]> } {
  const chars: string[] = [];
  const spans: Array<[number, number]> = [];
  for (let i = 0; i < raw.length;) {
    const entity = raw[i] === '&' ? raw.slice(i).match(/^&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]*);?/i) : null;
    if (entity) {
      const decoded = decodeEntity(entity[0]);
      if (decoded !== entity[0]) {
        for (const ch of decoded) {
          chars.push(ch);
          spans.push([i, i + entity[0].length]);
        }
        i += entity[0].length;
        continue;
      }
    }
    // The parser reads \r\n as \n
    if (raw[i] === '\r') {
      if (raw[i + 1] !== '\n') {
        chars.push('\n');
        spans.push([i, i + 1]);
      }
      i++;
      continue;
    }
    chars.push(raw[i]);
    spans.push([i, i + 1]);
    i++;
  }
  return { text: chars.join(''), spans };
}

const escapeText = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/ /g, '&nbsp;');

/** Where `raw` is in `source` now: where it was, or the nearest place it is */
function findAgain(source: string, raw: string, near: number): number | null {
  if (source.slice(near, near + raw.length) === raw) return near;
  if (!raw) return null;
  let best: number | null = null;
  for (let at = source.indexOf(raw); at !== -1; at = source.indexOf(raw, at + 1)) {
    if (best === null || Math.abs(at - near) < Math.abs(best - near)) best = at;
  }
  return best;
}

/**
 * The edit to `source` that makes the run read `after` (empty when it
 * already does), or null when the run can't be found as the preview had it
 * (the code changed there).
 * `compiled`: the source the preview's ranges are in.
 */
export function wordsSourceEdit(source: string, compiled: string, change: WordsChange): SourceEdit | null {
  const [start, end] = change.range;
  const raw = compiled.slice(start, end);
  const { text, spans } = decodeWithSpans(raw);
  if (text !== change.before) return null;
  const at = findAgain(source, raw, start);
  if (at === null) return null;

  const { before } = change;
  // A space typed at the end of a run comes in as a no-break space: it's a
  // space, unless that place was a no-break space before
  const after = change.after.replace(/ /g, (nbsp, i: number) => (before[i] === ' ' ? nbsp : ' '));
  if (after === before) return { from: at, to: at, insert: '' };
  let p = 0;
  while (p < before.length && p < after.length && before[p] === after[p]) p++;
  let q = 0;
  while (q < before.length - p && q < after.length - p && before[before.length - 1 - q] === after[after.length - 1 - q]) q++;
  const rawFrom = p < spans.length ? spans[p][0] : raw.length;
  const rawTo = before.length - q > p ? spans[before.length - q - 1][1] : rawFrom;
  return { from: at + rawFrom, to: at + rawTo, insert: escapeText(after.slice(p, after.length - q)) };
}

/** Where a start tag the preview pointed at is in `source` now */
export function tagAgain(source: string, compiled: string, at: number): number | null {
  const tag = compiled.slice(at, at + Math.min(80, compiled.length - at)).match(/^<[^>]*>?/)?.[0];
  return tag ? findAgain(source, tag, at) : null;
}
