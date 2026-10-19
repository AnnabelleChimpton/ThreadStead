/**
 * A tiny evaluator for the subset of Prisma `where` filters that the search
 * and directory routes build, so route tests can check which rows actually
 * come back rather than the shape of the query.
 *
 * String filters with `mode: 'insensitive'` follow Postgres ILIKE, which is
 * what Prisma sends for both `contains` (as `%value%`) and `equals` — so an
 * unescaped `%` or `_` behaves as a wildcard here exactly as it did in prod.
 */

/** Postgres LIKE pattern → RegExp, honouring backslash escapes. */
export function likeToRegExp(pattern: string, insensitive: boolean): RegExp {
  let out = ''
  for (let i = 0; i < pattern.length; i++) {
    const ch = pattern[i]
    if (ch === '\\' && i + 1 < pattern.length) {
      out += pattern[++i].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    } else if (ch === '%') {
      out += '[\\s\\S]*'
    } else if (ch === '_') {
      out += '[\\s\\S]'
    } else {
      out += ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    }
  }
  return new RegExp(`^${out}$`, insensitive ? 'i' : '')
}

function matchString(value: unknown, cond: any): boolean {
  if (value === null || value === undefined) return false
  const s = String(value)
  const insensitive = cond.mode === 'insensitive'
  if ('contains' in cond) return likeToRegExp(`%${cond.contains}%`, insensitive).test(s)
  if ('equals' in cond) {
    return insensitive ? likeToRegExp(cond.equals, true).test(s) : s === cond.equals
  }
  return true
}

function matchScalar(value: any, cond: any): boolean {
  if (cond === undefined) return true
  if (cond === null || typeof cond !== 'object') return value === cond
  if ('contains' in cond || 'equals' in cond) return matchString(value, cond)
  if ('in' in cond && !cond.in.includes(value)) return false
  if ('notIn' in cond && cond.notIn.includes(value)) return false
  if ('hasSome' in cond) return Array.isArray(value) && value.some((v: any) => cond.hasSome.includes(v))
  // Comparisons (dates or numbers); null never compares, as in SQL
  const cmp = (bound: any, ok: (a: number, b: number) => boolean) =>
    bound === undefined || (value !== null && value !== undefined && ok(+value, +bound))
  return (
    cmp(cond.lt, (a, b) => a < b) && cmp(cond.lte, (a, b) => a <= b) &&
    cmp(cond.gt, (a, b) => a > b) && cmp(cond.gte, (a, b) => a >= b)
  )
}

const SCALAR_OPS = new Set(['contains', 'equals', 'mode', 'in', 'notIn', 'hasSome', 'lt', 'lte', 'gt', 'gte'])

/** Relations use `is` (to-one, or a bare nested filter) and `some` / `none` (to-many). */
export function matchesWhere(row: any, where: any): boolean {
  if (!where) return true
  return Object.entries(where).every(([key, cond]: [string, any]) => {
    if (key === 'AND') return (cond as any[]).every((w) => matchesWhere(row, w))
    if (key === 'OR') return (cond as any[]).some((w) => matchesWhere(row, w))
    if (key === 'NOT') return !matchesWhere(row, cond)

    const value = row[key]
    if (cond && typeof cond === 'object' && !Array.isArray(cond)) {
      if ('is' in cond) {
        if (cond.is === null) return value === null || value === undefined
        return value !== null && value !== undefined && matchesWhere(value, cond.is)
      }
      if ('some' in cond) return Array.isArray(value) && value.some((v) => matchesWhere(v, cond.some))
      if ('none' in cond) return !Array.isArray(value) || !value.some((v) => matchesWhere(v, cond.none))
      // to-one relation given without `is`
      if (!Object.keys(cond).some((k) => SCALAR_OPS.has(k))) {
        return value !== null && value !== undefined && matchesWhere(value, cond)
      }
    }
    return matchScalar(value, cond)
  })
}
