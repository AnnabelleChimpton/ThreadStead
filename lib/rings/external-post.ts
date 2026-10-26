/**
 * An outside post's stand-in body: a link to it, when its address is a web
 * address. The hub's uri went into the HTML and Markdown as it came (the
 * Markdown is sanitized where it's shown, but neither should depend on that).
 */
export function externalPostBody(uri: unknown) {
  let url: URL | null = null;
  try {
    url = typeof uri === 'string' ? new URL(uri) : null;
  } catch {
    url = null;
  }
  if (!url || (url.protocol !== 'http:' && url.protocol !== 'https:')) {
    return { externalUrl: null, bodyHtml: '<p>This post is from an external source.</p>', bodyMarkdown: 'This post is from an external source.' };
  }
  // URL encodes quotes and angle brackets; & and the parentheses Markdown ends a link on are left
  const href = url.href;
  return {
    externalUrl: href,
    bodyHtml: `<p>This post is from an external source. <a href="${href.replace(/&/g, '&amp;')}" target="_blank" rel="noopener noreferrer">View original post</a></p>`,
    bodyMarkdown: `This post is from an external source. [View original post](${href.replace(/\(/g, '%28').replace(/\)/g, '%29')})`,
  };
}
