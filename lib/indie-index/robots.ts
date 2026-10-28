/**
 * robots.txt for the Indie Index bot (RFC 9309). Pure, no I/O.
 *
 * The group naming one of our product tokens (BOT_TOKENS) wins over `*`; rules
 * from every group with that name are merged. The longest matching rule wins
 * and Allow wins a tie. `*` matches anything and `$` anchors the end.
 */

import { BOT_TOKENS } from './public'

interface Rule {
  allow: boolean
  pattern: RegExp
  length: number
}

export interface Robots {
  /** May the bot fetch this path (with its query string)? */
  allows(pathAndQuery: string): boolean
}

export const ALLOW_ALL: Robots = { allows: () => true }
export const DISALLOW_ALL: Robots = { allows: () => false }

function toPattern(path: string): RegExp {
  const anchored = path.endsWith('$')
  const body = (anchored ? path.slice(0, -1) : path)
    .split('*')
    .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
    .join('.*')
  return new RegExp(`^${body}${anchored ? '$' : ''}`)
}

/** Percent-encoding differences shouldn't change a match: compare decoded. */
function normalisePath(path: string): string {
  try {
    return decodeURI(path)
  } catch {
    return path
  }
}

export function parseRobots(text: string, tokens: readonly string[] = BOT_TOKENS): Robots {
  const groups: Array<{ agents: string[]; rules: Rule[] }> = []
  let current: { agents: string[]; rules: Rule[] } | null = null
  let lastWasAgent = false

  for (const rawLine of text.split(/\r?\n|\r/)) {
    const line = rawLine.replace(/#.*$/, '').trim()
    const m = line.match(/^([a-z-]+)\s*:\s*(.*)$/i)
    if (!m) continue
    const field = m[1].toLowerCase()
    const value = m[2].trim()

    if (field === 'user-agent') {
      if (!current || !lastWasAgent) {
        current = { agents: [], rules: [] }
        groups.push(current)
      }
      current.agents.push(value.toLowerCase())
      lastWasAgent = true
      continue
    }
    lastWasAgent = false
    if (!current || (field !== 'allow' && field !== 'disallow')) continue
    // An empty Disallow allows everything: it adds no rule.
    if (!value) continue
    const path = normalisePath(value)
    current.rules.push({ allow: field === 'allow', pattern: toPattern(path), length: path.length })
  }

  const named = groups.filter((g) => g.agents.some((a) => tokens.includes(a.replace(/\/.*$/, '').trim())))
  const chosen = named.length > 0 ? named : groups.filter((g) => g.agents.includes('*'))
  const rules = chosen.flatMap((g) => g.rules)
  if (rules.length === 0) return ALLOW_ALL

  return {
    allows(pathAndQuery: string) {
      const path = normalisePath(pathAndQuery || '/')
      if (path === '/robots.txt') return true
      let best: Rule | null = null
      for (const rule of rules) {
        if (!rule.pattern.test(path)) continue
        if (!best || rule.length > best.length || (rule.length === best.length && rule.allow && !best.allow)) {
          best = rule
        }
      }
      return best ? best.allow : true
    },
  }
}

/** The path and query of a URL, as robots rules see it. */
export function robotsPath(url: string): string {
  const u = new URL(url)
  return `${u.pathname || '/'}${u.search}`
}
