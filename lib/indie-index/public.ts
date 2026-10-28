/**
 * Indie Index facts that pages show as well as the server uses: the bot's
 * name and the refresher's limits. No imports, so client code can use it.
 */

const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR

export const BOT_NAME = 'HomePageAgainBot/2.0'

/**
 * The names robots.txt, robots meta tags and X-Robots-Tag may address the bot
 * by, lowercase. It was ThreadsteadBot until 2026-10: rules written for that
 * name still count.
 */
export const BOT_TOKENS: readonly string[] = ['homepageagainbot', 'threadsteadbot']

/** `HomePageAgainBot/2.0 (+https://homepageagain.com/indie/about)` */
export function botUserAgent(baseUrl: string): string {
  return `${BOT_NAME} (+${baseUrl.replace(/\/+$/, '')}/indie/about)`
}

export const KAGI_SMALLWEB_HOME = 'https://github.com/kagisearch/smallweb'

export const LIMITS = {
  community: { items: 50, excerpt: 1000 },
  pool: { items: 10, excerpt: 280 },
  feedBytes: 2 * 1024 * 1024,
  homepageBytes: 256 * 1024,
  robotsBytes: 512 * 1024,
  /** Outbound links kept per homepage (SiteLink). */
  linksPerSite: 200,
  homepageEvery: 7 * DAY,
  poolEvery: 30 * DAY,
  /** Pool sites with nothing new for this long are dropped. */
  poolSilence: 365 * DAY,
  poolMaxFailures: 3,
}
