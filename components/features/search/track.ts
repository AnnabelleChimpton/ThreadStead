/**
 * Click tracking for off-site results. Fire-and-forget with sendBeacon, so
 * the link opens straight away: the old code awaited a fetch and then called
 * window.open, which Safari treats as a popup and blocks.
 *
 * The endpoint also queues the clicked site for the Indie Index
 * (pages/api/community-index/track-click-and-submit.ts, CSRF-exempt).
 * Only the clicked site goes in the beacon, never the search words: the FAQ
 * promises we don't keep search history.
 */
export function trackOffsiteClick(
  result: { url: string; title: string; snippet?: string },
  source: 'web' | 'indie_index'
): void {
  if (typeof navigator === 'undefined' || typeof navigator.sendBeacon !== 'function') return
  const body = JSON.stringify({
    result: { url: result.url, title: result.title, snippet: result.snippet, engine: source },
    searchTab: source === 'web' ? 'web' : 'indie',
    sessionId: String(Date.now()),
  })
  try {
    navigator.sendBeacon('/api/community-index/track-click-and-submit', new Blob([body], { type: 'application/json' }))
  } catch {
    // Tracking never gets in the way of the click.
  }
}
