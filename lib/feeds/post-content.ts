import type { Prisma } from '@prisma/client'
import { cleanAndNormalizeHtml, markdownToSafeHtml } from '@/lib/utils/sanitization/html'
import { escapeHtml } from '@/lib/utils/sanitization/escape'
import type { FeedItem } from '@/lib/feeds/rss'

export const FEED_POST_SELECT = {
  id: true,
  title: true,
  createdAt: true,
  bodyHtml: true,
  bodyMarkdown: true,
  bodyText: true,
  excerpt: true,
  textPreview: true,
  tags: true,
  contentWarning: true,
  isSpoiler: true,
} satisfies Prisma.PostSelect

export type FeedPost = Prisma.PostGetPayload<{ select: typeof FEED_POST_SELECT }>

const SUMMARY_CHARS = 280

function summaryOf(post: FeedPost): string | undefined {
  const text = (post.excerpt || post.textPreview || post.bodyText || '').replace(/\s+/g, ' ').trim()
  if (!text) return undefined
  return text.length > SUMMARY_CHARS ? `${text.slice(0, SUMMARY_CHARS - 1).trimEnd()}…` : text
}

/** The post's body as sanitized HTML, the way its page renders it (markdown first). */
function bodyHtmlOf(post: FeedPost): string | undefined {
  if (post.bodyMarkdown) return markdownToSafeHtml(post.bodyMarkdown)
  if (post.bodyHtml) return cleanAndNormalizeHtml(post.bodyHtml)
  if (post.bodyText) {
    return post.bodyText
      .split(/\n{2,}/)
      .map((para) => `<p>${escapeHtml(para).replace(/\n/g, '<br>')}</p>`)
      .join('')
  }
  return undefined
}

/**
 * A public post as a feed item. A post behind a content warning keeps its
 * warning: the feed carries the warning and a link, never the body, so a
 * reader doesn't show what the author chose to fold away.
 */
export function postFeedItem(post: FeedPost, url: string, author?: string): FeedItem {
  const warned = post.isSpoiler || !!post.contentWarning
  if (warned) {
    const warning = post.contentWarning?.trim() || 'Spoilers'
    return {
      title: post.title,
      url,
      publishedAt: post.createdAt,
      author,
      summary: `Content warning: ${warning}`,
      html: `<p>Content warning: ${escapeHtml(warning)}. <a href="${escapeHtml(url)}">Read it on HomePageAgain</a>.</p>`,
      tags: post.tags,
    }
  }
  return {
    title: post.title,
    url,
    publishedAt: post.createdAt,
    author,
    summary: summaryOf(post),
    html: bodyHtmlOf(post),
    tags: post.tags,
  }
}
