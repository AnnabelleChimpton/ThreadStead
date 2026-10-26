/**
 * Domains the Indie Index never takes (SEARCH_PLAN.md §3.5): big platforms,
 * news, reference sites. A built-in baseline merged with the admin's
 * BlockedSite table, so the index is safe even where the table was never
 * seeded. scripts/seed-blocked-sites.ts writes this same list to the table.
 */
import type { PrismaClient } from '@prisma/client'

export interface BlockedSiteData {
  domain: string
  category: string
  reason?: string
}

export const DEFAULT_BLOCKED_SITES: BlockedSiteData[] = [
  // Social Media Giants
  { domain: 'facebook.com', category: 'social_media', reason: 'Large corporate social media platform antithetical to indie web values' },
  { domain: 'twitter.com', category: 'social_media', reason: 'Large corporate social media platform antithetical to indie web values' },
  { domain: 'x.com', category: 'social_media', reason: 'Large corporate social media platform antithetical to indie web values' },
  { domain: 'instagram.com', category: 'social_media', reason: 'Large corporate social media platform antithetical to indie web values' },
  { domain: 'tiktok.com', category: 'social_media', reason: 'Large corporate social media platform antithetical to indie web values' },
  { domain: 'reddit.com', category: 'social_media', reason: 'Large corporate social media platform antithetical to indie web values' },
  { domain: 'pinterest.com', category: 'social_media', reason: 'Large corporate social media platform antithetical to indie web values' },
  { domain: 'linkedin.com', category: 'social_media', reason: 'Large corporate social media platform antithetical to indie web values' },
  { domain: 'snapchat.com', category: 'social_media', reason: 'Large corporate social media platform antithetical to indie web values' },
  { domain: 'threads.net', category: 'social_media', reason: 'Large corporate social media platform antithetical to indie web values' },
  { domain: 'bsky.app', category: 'social_media', reason: 'Large corporate social media platform antithetical to indie web values' },

  // Google/Alphabet Properties
  { domain: 'google.com', category: 'big_tech', reason: 'Major tech corporation antithetical to indie web values' },
  { domain: 'youtube.com', category: 'big_tech', reason: 'Major tech corporation antithetical to indie web values' },
  { domain: 'gmail.com', category: 'big_tech', reason: 'Major tech corporation antithetical to indie web values' },
  { domain: 'googleblog.com', category: 'big_tech', reason: 'Major tech corporation antithetical to indie web values' },
  { domain: 'googleadservices.com', category: 'big_tech', reason: 'Major tech corporation antithetical to indie web values' },
  { domain: 'googlesyndication.com', category: 'big_tech', reason: 'Major tech corporation antithetical to indie web values' },
  { domain: 'doubleclick.net', category: 'big_tech', reason: 'Major tech corporation antithetical to indie web values' },
  { domain: 'googleusercontent.com', category: 'big_tech', reason: 'Major tech corporation antithetical to indie web values' },
  { domain: 'gstatic.com', category: 'big_tech', reason: 'Major tech corporation antithetical to indie web values' },
  { domain: 'googleapis.com', category: 'big_tech', reason: 'Major tech corporation antithetical to indie web values' },

  // Other Big Tech
  { domain: 'microsoft.com', category: 'big_tech', reason: 'Major tech corporation antithetical to indie web values' },
  { domain: 'apple.com', category: 'big_tech', reason: 'Major tech corporation antithetical to indie web values' },
  { domain: 'adobe.com', category: 'big_tech', reason: 'Major tech corporation antithetical to indie web values' },
  { domain: 'amazon.com', category: 'big_tech', reason: 'Major tech corporation antithetical to indie web values' },

  // E-commerce Giants
  { domain: 'ebay.com', category: 'ecommerce', reason: 'Large corporate e-commerce platform' },
  { domain: 'walmart.com', category: 'ecommerce', reason: 'Large corporate e-commerce platform' },
  { domain: 'target.com', category: 'ecommerce', reason: 'Large corporate e-commerce platform' },
  { domain: 'alibaba.com', category: 'ecommerce', reason: 'Large corporate e-commerce platform' },

  // Wikipedia/Wikimedia (institutional knowledge bases, not indie)
  { domain: 'wikipedia.org', category: 'knowledge_base', reason: 'Institutional knowledge base, not indie web content' },
  { domain: 'wikimedia.org', category: 'knowledge_base', reason: 'Institutional knowledge base, not indie web content' },
  { domain: 'wikidata.org', category: 'knowledge_base', reason: 'Institutional knowledge base, not indie web content' },
  { domain: 'wikiquote.org', category: 'knowledge_base', reason: 'Institutional knowledge base, not indie web content' },
  { domain: 'wiktionary.org', category: 'knowledge_base', reason: 'Institutional knowledge base, not indie web content' },
  { domain: 'wikinews.org', category: 'knowledge_base', reason: 'Institutional knowledge base, not indie web content' },
  { domain: 'commons.wikimedia.org', category: 'knowledge_base', reason: 'Institutional knowledge base, not indie web content' },
  { domain: 'meta.wikimedia.org', category: 'knowledge_base', reason: 'Institutional knowledge base, not indie web content' },

  // Major News/Media Corporations
  { domain: 'cnn.com', category: 'news_media', reason: 'Corporate news media outlet' },
  { domain: 'bbc.com', category: 'news_media', reason: 'Corporate news media outlet' },
  { domain: 'nytimes.com', category: 'news_media', reason: 'Corporate news media outlet' },
  { domain: 'washingtonpost.com', category: 'news_media', reason: 'Corporate news media outlet' },
  { domain: 'theguardian.com', category: 'news_media', reason: 'Corporate news media outlet' },
  { domain: 'reuters.com', category: 'news_media', reason: 'Corporate news media outlet' },
  { domain: 'ap.org', category: 'news_media', reason: 'Corporate news media outlet' },
  { domain: 'wsj.com', category: 'news_media', reason: 'Corporate news media outlet' },
  { domain: 'npr.org', category: 'news_media', reason: 'Corporate news media outlet' },
  { domain: 'cbs.com', category: 'news_media', reason: 'Corporate news media outlet' },
  { domain: 'nbc.com', category: 'news_media', reason: 'Corporate news media outlet' },
  { domain: 'abc.com', category: 'news_media', reason: 'Corporate news media outlet' },
  { domain: 'fox.com', category: 'news_media', reason: 'Corporate news media outlet' },
  { domain: 'foxnews.com', category: 'news_media', reason: 'Corporate news media outlet' },
  { domain: 'msnbc.com', category: 'news_media', reason: 'Corporate news media outlet' },
  { domain: 'bloomberg.com', category: 'news_media', reason: 'Corporate news media outlet' },

  // Stack Exchange Network (corporate Q&A platforms)
  { domain: 'stackoverflow.com', category: 'knowledge_base', reason: 'Corporate Q&A platform' },
  { domain: 'stackexchange.com', category: 'knowledge_base', reason: 'Corporate Q&A platform' },
  { domain: 'serverfault.com', category: 'knowledge_base', reason: 'Corporate Q&A platform' },
  { domain: 'superuser.com', category: 'knowledge_base', reason: 'Corporate Q&A platform' },
  { domain: 'askubuntu.com', category: 'knowledge_base', reason: 'Corporate Q&A platform' },
  { domain: 'mathoverflow.net', category: 'knowledge_base', reason: 'Corporate Q&A platform' },

  // Major Streaming/Entertainment Platforms
  { domain: 'netflix.com', category: 'entertainment', reason: 'Corporate streaming platform' },
  { domain: 'hulu.com', category: 'entertainment', reason: 'Corporate streaming platform' },
  { domain: 'disneyplus.com', category: 'entertainment', reason: 'Corporate streaming platform' },
  { domain: 'hbomax.com', category: 'entertainment', reason: 'Corporate streaming platform' },
  { domain: 'paramount.com', category: 'entertainment', reason: 'Corporate streaming platform' },
  { domain: 'peacocktv.com', category: 'entertainment', reason: 'Corporate streaming platform' },
  { domain: 'crunchyroll.com', category: 'entertainment', reason: 'Corporate streaming platform' },
  { domain: 'twitch.tv', category: 'entertainment', reason: 'Corporate streaming platform' },
  { domain: 'imdb.com', category: 'entertainment', reason: 'Corporate entertainment database' },

  // Added for the Indie Index (SEARCH_PLAN.md §3.5): platforms people link
  // their profiles on, which would otherwise be filed as one "site".
  { domain: 'github.com', category: 'platform', reason: 'Code host; profiles, not personal sites' },
  { domain: 'gitlab.com', category: 'platform', reason: 'Code host; profiles, not personal sites' },
  { domain: 'medium.com', category: 'platform', reason: 'Blogging platform; one host for everyone' },
  { domain: 'linktr.ee', category: 'platform', reason: 'Link-in-bio pages' },
  { domain: 'patreon.com', category: 'platform', reason: 'Creator platform' },
  { domain: 'ko-fi.com', category: 'platform', reason: 'Creator platform' },
  { domain: 'discord.com', category: 'social_media', reason: 'Chat platform' },
  { domain: 'discord.gg', category: 'social_media', reason: 'Chat invites' },
  { domain: 't.me', category: 'social_media', reason: 'Telegram links' },
  { domain: 'spotify.com', category: 'entertainment', reason: 'Streaming platform' },
  { domain: 'soundcloud.com', category: 'entertainment', reason: 'Streaming platform' },
  { domain: 'tumblr.com', category: 'platform', reason: 'Only the bare host: person.tumblr.com stays allowed' },
];

/**
 * Bare hosts that only block themselves, not their subdomains: on these,
 * every person gets a subdomain of their own (person.tumblr.com).
 */
export const EXACT_ONLY = new Set(['tumblr.com'])

/**
 * The host a block is matched on (isBlockedHost compares hosts): lowercase,
 * no www., no scheme, path or port. A pasted address used to be stored
 * whole ("https://www.example.com/page"), and so it never matched anything.
 */
export function blockedDomainOf(text: string): string | null {
  let url: URL;
  try {
    url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(text) ? text : `https://${text}`);
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase().replace(/\.$/, '').replace(/^www\./, '');
  return host.includes('.') ? host : null;
}

/** The baseline plus the BlockedSite table, as bare lowercase domains. */
export async function loadBlockedSet(db: Pick<PrismaClient, 'blockedSite'>): Promise<Set<string>> {
  const rows = await db.blockedSite.findMany({ select: { domain: true } })
  return new Set([...DEFAULT_BLOCKED_SITES.map((b) => b.domain), ...rows.map((b) => b.domain)].map((d) => d.toLowerCase()))
}

/**
 * A profile on a platform rather than a site: the first path segment is an
 * @handle (Mastodon and friends, Medium, YouTube, TikTok, Threads).
 */
export function isPlatformProfile(url: string): boolean {
  try {
    return /^@[^/]+$/.test(new URL(url).pathname.split('/')[1] ?? '')
  } catch {
    return false
  }
}
