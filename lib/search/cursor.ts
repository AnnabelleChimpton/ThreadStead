/**
 * Keyset cursor for /api/search.
 *
 * Results are ordered by (score desc, key asc). The cursor holds the last
 * item's score and key plus the `now` page 1 was scored with, so later pages
 * recompute recency identically and continue strictly after that item — no
 * offsets, no repeats when rows are added between requests.
 */
import { ApiError } from '@/lib/api/errors'
import type { Ranked } from './relevance'

export interface SearchCursor {
  /** Epoch ms the first page was scored at. */
  t: number
  /** Last returned item's score. */
  s: number
  /** Last returned item's key (`type:id`). */
  k: string
}

export function encodeCursor(cursor: SearchCursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString('base64url')
}

export function decodeCursor(raw: string | string[] | undefined): SearchCursor | null {
  if (raw === undefined || raw === '') return null
  const value = Array.isArray(raw) ? raw[0] : raw
  try {
    const parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'))
    if (
      parsed &&
      Number.isFinite(parsed.t) &&
      Number.isFinite(parsed.s) &&
      typeof parsed.k === 'string' &&
      parsed.k.length <= 200
    ) {
      return { t: parsed.t, s: parsed.s, k: parsed.k }
    }
  } catch {
    // fall through
  }
  throw new ApiError(400, '"cursor" is not a valid search cursor')
}

/** The page after `cursor` (or the first page) and the cursor for the next one. */
export function pageAfter<T>(
  ranked: Ranked<T>[],
  cursor: SearchCursor | null,
  limit: number,
  now: number
): { page: Ranked<T>[]; nextCursor: string | null } {
  const rest = cursor
    ? ranked.filter((r) => r.score < cursor.s || (r.score === cursor.s && r.key > cursor.k))
    : ranked
  const page = rest.slice(0, limit)
  const last = page[page.length - 1]
  return {
    page,
    nextCursor: rest.length > limit && last ? encodeCursor({ t: now, s: last.score, k: last.key }) : null,
  }
}
