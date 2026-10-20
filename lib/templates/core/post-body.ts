import { cleanAndNormalizeHtml, markdownToSafeHtml } from '@/lib/utils/sanitization/html';

/** A post's body as the posts API sends it: one of the three is set */
export interface PostBody {
  bodyMarkdown?: string | null;
  bodyHtml?: string | null;
  bodyText?: string | null;
}

function escapeHtml(text: string) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * A post's body as safe HTML for an HTML page's <BlogPosts />: markdown
 * rendered, HTML cleaned, plain text escaped. The profile page and the
 * editor's preview both use this, so a post reads the same in each.
 */
export function postBodyHtml(post: PostBody): string {
  if (post.bodyMarkdown?.trim()) return markdownToSafeHtml(post.bodyMarkdown);
  if (post.bodyHtml?.trim()) return cleanAndNormalizeHtml(post.bodyHtml);
  if (post.bodyText?.trim()) return `<p>${escapeHtml(post.bodyText).replace(/\n/g, '<br/>')}</p>`;
  return "<p class='opacity-60'>(Nothing to preview)</p>";
}
