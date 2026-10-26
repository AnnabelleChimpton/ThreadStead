/**
 * Where the parsed page's text and tags are in the source the editor holds,
 * for "Words on the preview" (design/words-on-preview/DESIGN.md): the
 * preview knows which code each piece of text came from, so words typed on
 * it go back into the code, and Alt-click finds an element's tag.
 *
 * The parser reads a changed copy of the source: the site navigation tags
 * taken out, a pasted page's <head> left aside, components' names prefixed.
 * Those changes are all in tags or whole pieces left out: text is copied
 * through as written. So the copy's text lines up with the source's text,
 * piece by piece, and its start tags with the source's by order and name.
 *
 * A range is used only when the source there reads as exactly the parsed
 * text (entities decoded), so a misplaced one is never edited.
 *
 * Only for the editor's own compile (compileForEditor's `positions`); a
 * save and a page view never ask, so stored pages carry none of it.
 */
import { decodeHTML } from 'entities'
import { COMPONENT_TAG_PREFIX, tokenizeSource } from './source-scan'

export interface SourcePositions {
  /** The source range of the parsed text at [start, end) of the copy, or null */
  text(start: number, end: number, value: string): [number, number] | null
  /** Where the start tag at `start` of the copy is in the source, or null */
  tag(start: number): number | null
}

export function sourcePositions(source: string, parsed: string): SourcePositions {
  const ofSource = tokenizeSource(source)
  const ofParsed = tokenizeSource(parsed)

  const texts: Array<{ from: number; to: number; at: number }> = []
  const sourceTexts = ofSource.filter((t) => t.type === 'text')
  let j = 0
  for (const token of ofParsed) {
    if (token.type !== 'text') continue
    const text = parsed.slice(token.start, token.end)
    while (j < sourceTexts.length && source.slice(sourceTexts[j].start, sourceTexts[j].end) !== text) j++
    if (j >= sourceTexts.length) break
    texts.push({ from: token.start, to: token.end, at: sourceTexts[j].start })
    j++
  }

  const tags = new Map<number, number>()
  const sourceTags = ofSource.filter((t): t is Extract<typeof t, { type: 'open' }> => t.type === 'open')
  j = 0
  for (const token of ofParsed) {
    if (token.type !== 'open') continue
    const name = token.name.toLowerCase().replace(COMPONENT_TAG_PREFIX, '')
    while (j < sourceTags.length && sourceTags[j].name.toLowerCase() !== name) j++
    if (j >= sourceTags.length) break
    tags.set(token.start, sourceTags[j].start)
    j++
  }

  return {
    text(start, end, value) {
      // The last piece starting at or before `start` (they're in order)
      let lo = 0, hi = texts.length - 1, found = -1
      while (lo <= hi) {
        const mid = (lo + hi) >> 1
        if (texts[mid].from <= start) { found = mid; lo = mid + 1 } else hi = mid - 1
      }
      const piece = found >= 0 ? texts[found] : null
      if (!piece || end > piece.to) return null
      const from = piece.at + (start - piece.from)
      const to = from + (end - start)
      return decodeHTML(source.slice(from, to).replace(/\r\n?/g, '\n')) === value ? [from, to] : null
    },
    tag(start) {
      return tags.get(start) ?? null
    },
  }
}
