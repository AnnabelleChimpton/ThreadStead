/**
 * Shared helpers for building Ring Hub post metadata and URIs.
 *
 * These are extracted from pages/api/posts/create.ts so that create, update,
 * and delete all produce byte-for-byte identical values:
 *   - buildPostUri: the canonical resident post URL (must match the actual
 *     page route pages/resident/[username]/post/[postId].tsx, whose {username}
 *     segment is the local handle, i.e. primaryHandle.split('@')[0]). The hub
 *     PostRef is keyed on this exact URI, so create (submit) and delete
 *     (URI-fallback match) MUST build it the same way or deletion silently
 *     fails.
 *   - generateTextPreview / generateExcerpt: the discovery metadata pushed to
 *     the hub. update.ts reuses these so edited posts propagate the same
 *     preview/excerpt the hub would have gotten on original submission.
 */

import { getSiteBaseUrl } from "@/lib/config/site-url";

/**
 * Build the canonical Ring Hub post URI for a post.
 *
 * @param primaryHandle the author's primaryHandle (e.g. "alice@site"); the local
 *   part (before "@") is used as the {username} route segment, matching
 *   pages/resident/[username]/post/[postId].tsx.
 * @param postId the local post id.
 */
export function buildPostUri(primaryHandle: string | null | undefined, postId: string): string {
  const username = primaryHandle?.split('@')[0];
  return `${getSiteBaseUrl()}/resident/${username}/post/${postId}`;
}

/**
 * Generate a text preview from post content (max 300 chars for Ring Hub)
 */
export function generateTextPreview(bodyText?: string | null, bodyHtml?: string | null, bodyMarkdown?: string | null): string {
  // Get plain text content
  let content = '';

  if (bodyText) {
    content = bodyText;
  } else if (bodyHtml) {
    // Strip HTML tags to get plain text
    content = bodyHtml.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ');
  } else if (bodyMarkdown) {
    // Strip markdown formatting to get plain text
    content = bodyMarkdown
      .replace(/[#*`_~]/g, '') // Remove markdown symbols
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Convert links to just text
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1'); // Convert images to alt text
  }

  // Clean up whitespace and remove URLs for Ring Hub compatibility
  content = content.replace(/\s+/g, ' ').trim();

  // Remove URLs from metadata (they don't add value for discovery and cause validation issues)
  content = content.replace(/https?:\/\/[^\s]+/g, '[link]');

  if (content.length <= 300) {
    return content;
  }

  // Truncate at a word boundary. Reserve 3 chars for the ellipsis so the result
  // is never longer than 300 (the hub rejects metadata.textPreview over 300).
  const truncated = content.substring(0, 297);
  const lastSpace = truncated.lastIndexOf(' ');
  return (lastSpace > 250 ? truncated.substring(0, lastSpace) : truncated) + '...';
}

/**
 * Generate an excerpt from post content (max 500 chars for Ring Hub)
 */
export function generateExcerpt(bodyText?: string | null, bodyHtml?: string | null, bodyMarkdown?: string | null): string {
  // Get plain text content (same logic as preview but longer)
  let content = '';

  if (bodyText) {
    content = bodyText;
  } else if (bodyHtml) {
    content = bodyHtml.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ');
  } else if (bodyMarkdown) {
    content = bodyMarkdown
      .replace(/[#*`_~]/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1');
  }

  content = content.replace(/\s+/g, ' ').trim();

  // Remove URLs from metadata (they don't add value for discovery and cause validation issues)
  content = content.replace(/https?:\/\/[^\s]+/g, '[link]');

  if (content.length <= 500) {
    return content;
  }

  // Truncate at a word boundary. Reserve 3 chars for the ellipsis so the result
  // is never longer than 500 (the hub rejects metadata.excerpt over 500).
  const truncated = content.substring(0, 497);
  const lastSpace = truncated.lastIndexOf(' ');
  return (lastSpace > 450 ? truncated.substring(0, lastSpace) : truncated) + '...';
}
