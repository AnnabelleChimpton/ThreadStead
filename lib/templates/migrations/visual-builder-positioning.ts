/**
 * One-off: rewrite a page made with the old Visual Builder (deleted 2026-07,
 * 2d6983e) so it renders the same without lib/templates/positioning, the
 * island-detector extraction, IslandPage's wrapper, or the components'
 * `_positioningMode` branches. Run on prod by
 * scripts/convert-visual-builder-pages.ts; once every page is converted that
 * code, this file and the script can all go.
 *
 * Pure: source in, { source, changes, warnings } out. Self-contained (no repo
 * imports) so it keeps working after the positioning code is deleted.
 *
 * What it reproduces, per component tag carrying data-x + data-y
 * (island-detector.ts extractPositioningFromProperties → strategies →
 * positioning-utils.ts createAbsoluteWrapper):
 *  - top-level (no enclosing component): a <div style="position:absolute;…">
 *    around the tag, sized by the component's sizing category exactly as
 *    createAbsoluteWrapper does. The old code never produced breakpoints
 *    (ResponsivePositioningStrategy uses desktop values only).
 *  - every positioned tag (nested too): drops position/top/right/bottom/left/
 *    z-index/transform from its style attribute and the flat position/top/…
 *    attributes (island-detector stripPositioningFrom*), drops data-x/-y/
 *    -width/-height/-responsive/-breakpoints
 *  - the `_positioningMode === 'absolute'` differences, as inline style on the
 *    component tag where a style attribute can say the same thing
 * Tags with data-component-size and no data-x: SizeOnlyStrategy's
 * <div style="width;height"> wrapper.
 *
 * Checked 2026-10-19 against the dev page and a synthetic page covering every
 * sizing category: same server-rendered DOM and computed styles, except
 * StickyNote's text (centred before, top-aligned after; reported as a
 * warning).
 */

export interface Conversion {
  source: string;
  changes: string[];
  /** Things the rewrite can't express exactly: eyeball these */
  warnings: string[];
}

// lib/templates/positioning/breakpoints.ts (copied: the file goes away)
const CONTAINER_FILLER = ['gradientbox', 'stickynote', 'retroterminal', 'polaroidframe', 'centeredbox', 'neonborder', 'revealbox', 'floatingbadge'];
const CONTENT_DRIVEN = ['textelement', 'paragraph', 'contactcard', 'progresstracker', 'bio', 'blogposts', 'guestbook', 'tabs', 'profilehero'];
const FULL_WIDTH = ['threadsteadnavigation'];

function sizingCategory(type: string): 'full-width' | 'container-filler' | 'content-driven' | 'auto-size' {
  const t = type.toLowerCase();
  if (FULL_WIDTH.includes(t)) return 'full-width';
  if (CONTAINER_FILLER.includes(t)) return 'container-filler';
  if (CONTENT_DRIVEN.includes(t)) return 'content-driven';
  return 'auto-size'; // square + auto-size + everything unlisted: no width/height
}

/** What `_positioningMode === 'absolute'` changes, as style on the component's root */
const ROOT_STYLE_FOR_ABSOLUTE: Record<string, string> = {
  // `position: _positioningMode === 'absolute' ? 'relative' : 'static'`
  boombox: 'position: relative',
  cassettetape: 'position: relative',
  matrixrain: 'position: relative',
  retrotv: 'position: relative',
  vhstape: 'position: relative',
  // 'h-full' / 'w-full h-full' / 'h-full flex flex-col' on the root
  centeredbox: 'height: 100%',
  neonborder: 'height: 100%',
  stickynote: 'height: 100%',
  gradientbox: 'width: 100%; height: 100%',
  // old root classes 'inline-block h-full flex flex-col': in Tailwind v4 .inline-block sorts after .flex, so the root stays inline-block and flex-col/flex-1 never applied
  polaroidframe: 'height: 100%',
  retroterminal: 'height: 100%; display: flex; flex-direction: column',
};
/** Inner-element classes a style attribute can't reach */
const INNER_ONLY: Record<string, string> = {
  stickynote: "inner div loses 'h-full flex flex-col justify-center' (text no longer vertically centred in the note)",
  // polaroidframe: inner 'flex-1' was inert (root is inline-block, see above)
  retroterminal: "body loses 'flex-1' (no visible change: the root's background fills the box either way)",
};
/** Heading/Paragraph/TextElement: only with _size (data-component-size) */
const TEXT_WITH_SIZE: Record<string, string> = {
  heading: 'center',
  textelement: 'center',
  paragraph: 'flex-start',
};

const STRIPPED_STYLE = new Set(['position', 'top', 'right', 'bottom', 'left', 'z-index', 'transform']);
const STRIPPED_FLAT = new Set(['position', 'top', 'right', 'bottom', 'left', 'zindex', 'z-index']);
const VB_ATTRS = new Set(['data-x', 'data-y', 'data-width', 'data-height', 'data-responsive', 'data-breakpoints']);

interface Attr {
  name: string;
  value: string | null; // decoded
  raw: string;
}

const ATTR_RE = /([^\s"'<>\/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

function decode(v: string): string {
  return v
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}
const escapeAttr = (v: string) => v.replace(/&/g, '&amp;').replace(/"/g, '&quot;');

function parseAttrs(text: string): Attr[] {
  const attrs: Attr[] = [];
  for (const m of text.matchAll(ATTR_RE)) {
    const value = m[2] ?? m[3] ?? m[4];
    attrs.push({ name: m[1], value: value === undefined ? null : decode(value), raw: m[0] });
  }
  return attrs;
}

const get = (attrs: Attr[], name: string) => attrs.find((a) => a.name.toLowerCase() === name)?.value ?? undefined;
const isComponentName = (name: string) => /^[A-Z]/.test(name);
const px = (n: number) => `${n}px`;

/** createAbsoluteWrapper's style, as CSS text */
function wrapperStyle(type: string, x: number, y: number, width: number | undefined, height: number | undefined, contentDefaults: boolean): string {
  const cat = sizingCategory(type);
  const isNav = type.toLowerCase().includes('navigation');
  // Same declaration order as the React style object: position, top, zIndex, then sizing.
  // zIndex: extraction always says 1; ThreadsteadNavigation's 999998 is overridden to 100 for any *navigation*
  const s: string[] = ['position: absolute', `top: ${px(y)}`, `z-index: ${isNav ? 100 : 1}`];
  if (cat === 'full-width' || isNav) {
    s.push('left: 0', 'width: 100%', 'height: auto', 'min-height: 70px', 'max-height: 100px');
  } else if (cat === 'content-driven') {
    const w = width ?? (contentDefaults ? 200 : 200);
    const h = height ?? 150;
    s.push(`left: ${px(x)}`, 'width: fit-content', 'height: fit-content', `min-width: ${px(w)}`, `min-height: ${px(h)}`, `max-width: ${px(Math.min(Math.max(w * 1.5, 400), 600))}`);
  } else if (cat === 'container-filler') {
    s.push(`left: ${px(x)}`);
    if (width !== undefined) s.push(`width: ${px(width)}`);
    if (height !== undefined) s.push(`height: ${px(height)}`);
  } else {
    s.push(`left: ${px(x)}`);
  }
  return s.join('; ');
}

function splitStyle(style: string): Array<[string, string]> {
  return style
    .split(';')
    .map((d) => {
      const i = d.indexOf(':');
      return i > 0 ? ([d.slice(0, i).trim(), d.slice(i + 1).trim()] as [string, string]) : null;
    })
    .filter((d): d is [string, string] => !!d && !!d[0] && !!d[1]);
}

interface Open {
  name: string;
  wrapped: boolean;
}

const RAW_TEXT = /^(style|script|textarea|title)$/i;

export function convertVisualBuilderPositioning(source: string): Conversion {
  const changes: string[] = [];
  const warnings: string[] = [];
  const out: string[] = [];
  const stack: Open[] = []; // open component tags
  const plainStack: string[] = []; // open plain tags (for invalid-parent checks)
  const TAG = /<!--[\s\S]*?-->|<\/([A-Za-z][\w:-]*)\s*>|<([A-Za-z][\w:-]*)((?:\s+[^\s"'<>\/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?)*)\s*(\/?)>/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = TAG.exec(source))) {
    out.push(source.slice(last, m.index));
    last = TAG.lastIndex;
    const [whole, closeName, openName, attrText, selfClose] = m;
    if (!closeName && !openName) {
      out.push(whole); // comment
      continue;
    }
    if (closeName) {
      out.push(whole);
      if (isComponentName(closeName)) {
        const i = stack.map((o) => o.name).lastIndexOf(closeName);
        if (i >= 0) {
          // close inner ones the way the parser recovers
          const closed = stack.splice(i);
          if (closed[0].wrapped) out.push('</div>');
          for (const c of closed.slice(1)) if (c.wrapped) warnings.push(`<${c.name}> was never closed; its wrapper closes at </${closeName}>`);
        }
      } else {
        const j = plainStack.lastIndexOf(closeName.toLowerCase());
        if (j >= 0) plainStack.splice(j);
      }
      continue;
    }

    const name = openName!;
    if (!isComponentName(name)) {
      out.push(whole);
      if (!selfClose && !/^(area|base|br|col|embed|hr|img|input|link|meta|source|track|wbr)$/i.test(name)) {
        plainStack.push(name.toLowerCase());
        if (RAW_TEXT.test(name)) {
          const end = source.toLowerCase().indexOf(`</${name.toLowerCase()}`, last);
          if (end > 0) {
            out.push(source.slice(last, end));
            last = end;
            TAG.lastIndex = end;
          }
        }
      }
      continue;
    }

    const attrs = parseAttrs(attrText || '');
    const t = name.toLowerCase();
    const nested = stack.length > 0;
    const dataX = get(attrs, 'data-x');
    const dataY = get(attrs, 'data-y');
    const x = dataX !== undefined ? parseFloat(dataX) : NaN;
    const y = dataY !== undefined ? parseFloat(dataY) : NaN;
    const positioned = !isNaN(x) && !isNaN(y);
    const sizeAttr = get(attrs, 'data-component-size');
    let size: { width?: string | number; height?: string | number } | undefined;
    if (sizeAttr) {
      try {
        size = JSON.parse(sizeAttr);
      } catch {
        warnings.push(`<${name}> data-component-size isn't JSON; left as is`);
      }
    }
    for (const other of ['data-pure-positioning', 'data-positioning-mode', 'data-pixel-position', 'data-position']) {
      if (get(attrs, other) !== undefined) warnings.push(`<${name}> has ${other}: older positioning format, not converted — do this one by hand`);
    }

    let wrapOpen = '';
    let kept = attrs;
    if (positioned) {
      const responsive = get(attrs, 'data-responsive') === 'true';
      const w = get(attrs, 'data-width');
      const h = get(attrs, 'data-height');
      const width = w ? parseFloat(w) : responsive ? undefined : 200;
      const height = h ? parseFloat(h) : responsive ? undefined : 150;

      // drop what extraction/stripping consumed
      kept = attrs.filter((a) => {
        const n = a.name.toLowerCase();
        if (VB_ATTRS.has(n) || n === 'data-component-size') return false;
        if (STRIPPED_FLAT.has(n)) {
          warnings.push(`<${name}> attribute ${a.name}="${a.value}" was ignored while positioned (stripped prop); removed`);
          return false;
        }
        return true;
      });

      // style: strip positioning, then prepend the absolute-mode equivalents
      const styleAttr = kept.find((a) => a.name.toLowerCase() === 'style');
      const decls = splitStyle(styleAttr?.value ?? '').filter(([p]) => !STRIPPED_STYLE.has(p));
      const added: string[] = [];
      if (ROOT_STYLE_FOR_ABSOLUTE[t]) added.push(ROOT_STYLE_FOR_ABSOLUTE[t]);
      if (TEXT_WITH_SIZE[t] && size && (size.width !== undefined || size.height !== undefined)) {
        const wh = [];
        if (size.width !== undefined) wh.push(`width: ${typeof size.width === 'number' ? px(size.width) : size.width}`);
        if (size.height !== undefined) wh.push(`height: ${typeof size.height === 'number' ? px(size.height) : size.height}`);
        added.push([...wh, 'display: flex', `align-items: ${TEXT_WITH_SIZE[t]}`, 'justify-content: flex-start'].join('; '));
      }
      if (INNER_ONLY[t]) warnings.push(`<${name}>: ${INNER_ONLY[t]}`);
      if (t === 'gradientbox' && /\b[wh]-/.test(get(attrs, 'class') ?? get(attrs, 'classname') ?? '')) {
        warnings.push(`<${name}> has its own w-/h- classes; the inline width/height now removes them (removeTailwindConflicts)`);
      }
      const newStyle = [...added, ...decls.map(([p, v]) => `${p}: ${v}`)].join('; ');
      kept = kept.filter((a) => a.name.toLowerCase() !== 'style');
      if (newStyle) kept.push({ name: 'style', value: newStyle, raw: `style="${escapeAttr(newStyle)}"` });

      if (!nested) {
        const bad = plainStack.find((p) => /^(p|span|a|button|label|h[1-6]|em|strong|b|i|small|code)$/.test(p));
        if (bad) warnings.push(`<${name}> sits inside <${bad}>: a <div> wrapper there is invalid HTML; check by hand`);
        wrapOpen = `<div style="${wrapperStyle(name, x, y, width, height, !responsive)}">`;
        changes.push(`<${name}> → wrapped at (${x}, ${y}) [${sizingCategory(name)}${responsive ? ', responsive (desktop only)' : ''}]`);
      } else {
        changes.push(`<${name}> nested: positioning attrs removed, no wrapper (none was drawn)`);
      }
    }
    // SizeOnlyStrategy applies regardless of nesting
    if (!positioned && size && ((size.width && size.width !== 'auto') || (size.height && size.height !== 'auto'))) {
      const s: string[] = [];
      if (size.width && size.width !== 'auto') s.push(`width: ${typeof size.width === 'number' ? px(size.width) : size.width}`);
      if (size.height && size.height !== 'auto') s.push(`height: ${typeof size.height === 'number' ? px(size.height) : size.height}`);
      wrapOpen = `<div style="${s.join('; ')}">`;
      kept = attrs.filter((a) => a.name.toLowerCase() !== 'data-component-size');
      changes.push(`<${name}> → size wrapper (${s.join('; ')})`);
    }

    const tag = kept === attrs ? whole : `<${name}${kept.length ? ' ' + kept.map((a) => a.raw).join(' ') : ''}${selfClose ? ' /' : ''}>`;
    out.push(wrapOpen + tag);
    if (selfClose) {
      if (wrapOpen) out.push('</div>');
    } else {
      stack.push({ name, wrapped: !!wrapOpen });
    }
  }
  out.push(source.slice(last));
  for (const o of stack) {
    if (!o.wrapped) continue;
    warnings.push(`<${o.name}> never closed; wrapper closed at end of page`);
    out.push('</div>');
  }
  return { source: out.join(''), changes, warnings };
}
