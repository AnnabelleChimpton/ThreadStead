// What happens to a paste into the HTML pane: <style> blocks and Google
// Fonts links move to the CSS tab (fonts as @import lines), so the CSS tab
// shows everything the page's look depends on. Only on paste, as one edit:
// run on every change it re-added CSS on undo and ate a <style> typed by hand
// (template audit 07 #3).
import { StateEffect } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { invertedEffects } from '@codemirror/commands';
import { extractDocument } from '@/lib/templates/compilation/document-head';

/** A whole HTML document pasted in, not a piece of one */
export const WHOLE_PAGE = /<!doctype\s+html|<html[\s>]/i;

export interface MovedStyles {
  /** The pasted HTML without them */
  html: string;
  /** The CSS tab's new contents */
  css: string;
  movedStyles: boolean;
  movedFonts: boolean;
}

/** null when the paste has nothing to move */
export function movePastedStyles(pasted: string, existingCSS: string): MovedStyles | null {
  const styleTags = pasted.match(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi) || [];
  // Google Fonts stylesheet links become @import lines, and the preconnect
  // hints Google's snippet pastes with them go too (other <link>s stay, the
  // report covers them)
  const linkTags = pasted.match(/<link\b[^>]*>/gi) || [];
  const fontLinks = linkTags
    .map((tag) => ({ tag, imports: extractDocument(tag).head.fontImports }))
    .filter((link) => link.imports.length > 0);
  if (styleTags.length === 0 && fontLinks.length === 0) return null;
  const fontHints = fontLinks.length > 0
    ? linkTags.filter((tag) =>
        /\brel\s*=\s*["']?(?:preconnect|dns-prefetch)\b/i.test(tag) &&
        /\bhref\s*=\s*["']?https:\/\/fonts\.(?:googleapis|gstatic)\.com\/?["'\s>]/i.test(tag))
    : [];

  // A <style media="print"> keeps its media (template audit 03 F14b)
  let extracted = styleTags
    .map((tag) => {
      const [, attrs, css] = tag.match(/<style\b([^>]*)>([\s\S]*?)<\/style\s*>/i)!;
      const media = attrs.match(/\bmedia\s*=\s*["']?([^"'>]+)/i)?.[1].trim();
      return media && !/^(?:all|screen)$/i.test(media) ? `@media ${media} {\n${css.trim()}\n}` : css.trim();
    })
    .filter(Boolean)
    .join('\n\n');
  // A whole page pasted with its own <style> brings its own stylesheet: it
  // replaces the old one (under it, the starter's rules restyled the pasted
  // page; the saved CSS stays in History). Anything else is added, once.
  const replaces = styleTags.length > 0 && WHOLE_PAGE.test(pasted);
  // Imports the old CSS has are skipped only when it stays
  const fontImports = Array.from(new Set(fontLinks.flatMap((link) => link.imports)))
    .filter((line) => replaces || !existingCSS.includes(line));
  if (fontImports.length > 0) extracted = [fontImports.join('\n'), extracted].filter(Boolean).join('\n\n');

  // Take the tags out, with their line when they had one to themselves
  let html = pasted;
  for (const tag of [...styleTags, ...fontLinks.map((link) => link.tag), ...fontHints]) {
    const at = html.indexOf(tag);
    if (at === -1) continue;
    let start = at;
    let end = at + tag.length;
    const lineStart = html.lastIndexOf('\n', at - 1) + 1;
    const lineEnd = html.indexOf('\n', end);
    if (!html.slice(lineStart, at).trim() && !html.slice(end, lineEnd === -1 ? undefined : lineEnd).trim()) {
      start = lineStart;
      end = lineEnd === -1 ? html.length : lineEnd + 1;
    }
    html = html.slice(0, start) + html.slice(end);
  }

  const css = !extracted
    ? existingCSS
    : replaces || !existingCSS.trim()
      ? extracted
      : existingCSS.includes(extracted)
        ? existingCSS
        : `${existingCSS}\n\n/* Extracted from HTML */\n${extracted}`;
  return { html: html.trim(), css, movedStyles: styleTags.length > 0, movedFonts: fontLinks.length > 0 };
}

/** The CSS tab's side of a paste, carried on the HTML pane's paste edit */
export const pastedCSS = StateEffect.define<{ from: string; to: string }>();

/**
 * For the HTML pane: the CSS a paste moved goes with the paste through undo
 * and redo, so one undo takes back both (it left the pasted page's CSS, with
 * the old CSS gone). CSS edited since the paste is left as it is.
 */
export function pastedCSSHistory(setCSS: (update: (css: string) => string) => void) {
  return [
    invertedEffects.of((tr) =>
      tr.effects.filter((e) => e.is(pastedCSS)).map((e) => pastedCSS.of({ from: e.value.to, to: e.value.from }))
    ),
    EditorView.updateListener.of((update) => {
      for (const tr of update.transactions) {
        for (const e of tr.effects) {
          if (e.is(pastedCSS)) setCSS((css) => (css === e.value.from ? e.value.to : css));
        }
      }
    }),
  ];
}
