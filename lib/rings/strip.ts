/**
 * The webring strip residents paste onto their own sites (SCOPE.md §3):
 * prev, the ring's 88×31, random, next. Plain links and an <img>, no
 * script, inline styles only, so it works on any host, Neocities' free
 * accounts included. Client-safe.
 */

export type StripPreset = 'plain' | 'light' | 'dark'

export const STRIP_PRESETS: Array<{ id: StripPreset; label: string }> = [
  { id: 'plain', label: 'Plain (takes your site\'s look)' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
]

const LOOKS: Record<StripPreset, { box: string; link: string }> = {
  plain: { box: 'text-align:center', link: '' },
  light: {
    box: 'text-align:center;background:#fbf6e9;color:#3e4b4d;border:2px solid #3e4b4d;padding:6px 8px;font-family:Georgia,serif;line-height:1.6',
    link: 'color:#3e4b4d',
  },
  dark: {
    box: 'text-align:center;background:#2b2522;color:#f3ead6;border:2px solid #e9dfc8;padding:6px 8px;font-family:Georgia,serif;line-height:1.6',
    link: 'color:#f3ead6',
  },
}

function escapeHtml(s: string): string {
  return s.replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' })[c]!)
}

/** The ring caption (owner decision 2026-10-22). */
export function stripCaption(ringName: string): string {
  return `This site is part of the ${ringName} ring on HomePageAgain`
}

export function stripHtml({
  baseUrl,
  slug,
  ringName,
  siteId,
  preset = 'plain',
}: {
  baseUrl: string
  slug: string
  ringName: string
  siteId?: string | null
  preset?: StripPreset
}): string {
  const base = baseUrl.replace(/\/+$/, '')
  const ring = encodeURIComponent(slug)
  const from = siteId ? `?from=${encodeURIComponent(siteId)}` : ''
  const look = LOOKS[preset]
  const a = (href: string, text: string) => `<a href="${href}"${look.link ? ` style="${look.link}"` : ''}>${text}</a>`
  const name = escapeHtml(ringName)
  return [
    `<!-- HomePageAgain ring: ${slug} -->`,
    `<div style="${look.box}">`,
    `  <small>${escapeHtml(stripCaption(ringName))}</small><br>`,
    `  ${a(`${base}/ring/${ring}/prev${from}`, '&larr; prev')}`,
    `  <a href="${base}/tr/${ring}${from}"><img src="${base}/ring/${ring}/badge.png" width="88" height="31" alt="${name}, a ThreadRing" style="vertical-align:middle;border:0"></a>`,
    `  ${a(`${base}/ring/${ring}/random${from}`, 'random')}`,
    `  ${a(`${base}/ring/${ring}/next${from}`, 'next &rarr;')}`,
    `</div>`,
    `<!-- /HomePageAgain ring -->`,
  ].join('\n')
}
