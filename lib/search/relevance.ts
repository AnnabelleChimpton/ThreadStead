/**
 * Relevance blending for local site search (/api/search).
 *
 * The SQL in lib/search/local.ts returns the top candidates per type with raw
 * signals; this file turns those into one comparable score:
 *
 *   exact handle/name/title match → pinned above everything else, then
 *   0.55·text + 0.15·trigram + 0.15·recency + 0.15·social
 *
 * Every signal is 0..1, so the blended score is 0..1 and a pinned result is
 * 1 + its blended score. Kept plain on purpose (SEARCH_PLAN.md §2) — tune
 * from click logs later, not by guessing more terms in.
 */

export type SearchResultType = 'threadring' | 'user' | 'post' | 'page'

export interface RelevanceSignals {
  type: SearchResultType
  id: string
  /** Raw ts_rank_cd (unnormalised), or an equivalent 0..∞ text score. */
  textRank: number
  /** pg_trgm word_similarity of the query against the name/title, 0..1. */
  trigram: number
  /** Exact handle / display name / title / slug match. */
  exact: boolean
  /** Newest activity: post date, last public post, page edit. Null = unknown. */
  activityAt: Date | null
  /** The viewer follows the author/person. */
  follows: boolean
  /** The viewer shares a ring with them, or the post is in one of the viewer's rings. */
  sharedRing: boolean
}

export const WEIGHTS = { text: 0.55, trigram: 0.15, recency: 0.15, social: 0.15 } as const

/**
 * ts_rank_cd counts a single title (weight A) hit as 1.0 and a body (C) hit as
 * 0.2. r / (r + 0.3) maps that to ≈0.77 and ≈0.4 and flattens past a few hits,
 * so one long post can't drown out a short exact one.
 */
const TEXT_HALF_POINT = 0.3
/** Recency halves every 90 days. */
const RECENCY_HALF_LIFE_DAYS = 90
const DAY_MS = 86_400_000

export function normaliseTextRank(rank: number): number {
  return rank > 0 ? rank / (rank + TEXT_HALF_POINT) : 0
}

export function recencyScore(at: Date | null, now: number): number {
  if (!at) return 0
  const ageDays = Math.max(0, (now - at.getTime()) / DAY_MS)
  return Math.pow(0.5, ageDays / RECENCY_HALF_LIFE_DAYS)
}

export function socialScore(s: Pick<RelevanceSignals, 'follows' | 'sharedRing'>): number {
  return s.follows ? 1 : s.sharedRing ? 0.5 : 0
}

/**
 * `now` is passed in (not read from the clock) so a cursor can carry it: page
 * 2 must score items exactly as page 1 did or keyset paging skips/repeats.
 */
export function blendScore(s: RelevanceSignals, now: number): number {
  const blended =
    WEIGHTS.text * normaliseTextRank(s.textRank) +
    WEIGHTS.trigram * clamp01(s.trigram) +
    WEIGHTS.recency * recencyScore(s.activityAt, now) +
    WEIGHTS.social * socialScore(s)
  return s.exact ? 1 + blended : blended
}

export interface Ranked<T> {
  item: T
  score: number
  /** Stable tiebreak and cursor key: `${type}:${id}`. */
  key: string
}

/** Score and sort descending, ties broken by key so paging is deterministic. */
export function rankBySignals<T extends RelevanceSignals>(items: T[], now: number): Ranked<T>[] {
  return items
    .map((item) => ({ item, score: blendScore(item, now), key: `${item.type}:${item.id}` }))
    .sort((a, b) => b.score - a.score || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0))
}

// ------------------------------------------------------------------ rings --
// Rings come from RingHub (or the local fallback) without a text score, so
// they're scored here with the same scale as Postgres' signals.

/** Lowercase, strip accents, split into words. */
export function words(text: string): string[] {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
}

/** Query terms that should match: drops `-excluded` words and `or`. */
export function queryTerms(query: string): string[] {
  return query
    .split(/\s+/)
    .filter((t) => t && !t.startsWith('-') && t.toLowerCase() !== 'or')
    .flatMap(words)
}

function trigrams(word: string): Set<string> {
  const padded = `  ${word} `
  const out = new Set<string>()
  for (let i = 0; i + 3 <= padded.length; i++) out.add(padded.slice(i, i + 3))
  return out
}

/**
 * Close to pg_trgm's word_similarity(query, text): the share of the query's
 * trigrams found in the best-matching word of `text`.
 */
export function wordSimilarity(query: string, text: string): number {
  const q = words(query).join(' ')
  if (!q) return 0
  const qGrams = trigrams(q)
  let best = 0
  for (const word of [...words(text), words(text).join(' ')]) {
    const grams = trigrams(word)
    let shared = 0
    qGrams.forEach((g) => {
      if (grams.has(g)) shared++
    })
    best = Math.max(best, shared / qGrams.size)
  }
  return best
}

/**
 * Text score for a ring on ts_rank_cd's scale: each query term found in the
 * name counts like a title hit (1.0), in the slug or description like a
 * body hit (0.2).
 */
export function ringTextRank(query: string, ring: { name: string; slug: string; description?: string | null }): number {
  const terms = queryTerms(query)
  if (terms.length === 0) return 0
  const name = new Set(words(ring.name))
  const rest = new Set([...words(ring.slug), ...words(ring.description ?? '')])
  const hit = (set: Set<string>, term: string) => Array.from(set).some((w) => w.startsWith(term))
  let rank = 0
  for (const term of terms) {
    if (hit(name, term)) rank += 1
    else if (hit(rest, term)) rank += 0.2
  }
  return rank / terms.length
}

export function isExactName(query: string, ...names: Array<string | null | undefined>): boolean {
  const q = words(query.replace(/^@/, '')).join(' ')
  return !!q && names.some((n) => !!n && words(n).join(' ') === q)
}

function clamp01(n: number): number {
  return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0
}
