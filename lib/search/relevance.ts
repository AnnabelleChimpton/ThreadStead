/**
 * Relevance scoring for local site search (/api/search).
 *
 * Replaces the old behavior where type=all results were randomly SHUFFLED —
 * searching your own username could bury the exact-match user under posts
 * that merely mentioned the word.
 *
 * Scores are intentionally simple and explainable: exact match beats prefix
 * beats word-boundary beats substring; a small type weight breaks ties in
 * favor of rings and people over posts; description matches add a nudge.
 */

export interface ScorableResult {
  type: 'threadring' | 'user' | 'post'
  title: string
  description?: string
  /** Other names that count as the title, e.g. a user's @handle. */
  keys?: string[]
}

const TYPE_WEIGHT: Record<ScorableResult['type'], number> = {
  threadring: 12,
  user: 10,
  post: 5,
}

export function scoreSearchResult(item: ScorableResult, rawQuery: string): number {
  const query = rawQuery.trim().toLowerCase()
  if (!query) return 0

  const description = (item.description || '').toLowerCase()
  let score = TYPE_WEIGHT[item.type] ?? 0

  const names = [item.title, ...(item.keys ?? [])].map((n) => (n || '').toLowerCase())
  score += Math.max(...names.map((name) => titleScore(name, query)))

  if (description.includes(query)) {
    score += 10
  }

  return score
}

/** Score, sort (stable, descending), and cap a merged result list. */
export function rankSearchResults<T extends ScorableResult>(
  items: T[],
  query: string,
  limit: number
): Array<T & { relevanceScore: number }> {
  return items
    .map((item) => ({ ...item, relevanceScore: scoreSearchResult(item, query) }))
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, limit)
}

function titleScore(title: string, query: string): number {
  if (title === query) return 100
  if (title.startsWith(query)) return 60
  if (new RegExp(`\\b${escapeRegExp(query)}`).test(title)) return 40
  if (title.includes(query)) return 30
  return 0
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
