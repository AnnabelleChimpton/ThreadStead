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
}

const TYPE_WEIGHT: Record<ScorableResult['type'], number> = {
  threadring: 12,
  user: 10,
  post: 5,
}

export function scoreSearchResult(item: ScorableResult, rawQuery: string): number {
  const query = rawQuery.trim().toLowerCase()
  if (!query) return 0

  const title = (item.title || '').toLowerCase()
  const description = (item.description || '').toLowerCase()
  let score = TYPE_WEIGHT[item.type] ?? 0

  if (title === query) {
    score += 100
  } else if (title.startsWith(query)) {
    score += 60
  } else if (new RegExp(`\\b${escapeRegExp(query)}`).test(title)) {
    score += 40
  } else if (title.includes(query)) {
    score += 30
  }

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

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
