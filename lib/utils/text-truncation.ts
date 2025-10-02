/**
 * Text truncation utilities for feed posts
 */

export const TRUNCATION_LENGTH = 280;

/**
 * Truncates text at a smart boundary (sentence or word)
 * @param text - The text to truncate
 * @param maxLength - Maximum character length (default: 280)
 * @returns Truncated text
 */
export function truncateText(text: string, maxLength: number = TRUNCATION_LENGTH): string {
  if (text.length <= maxLength) {
    return text;
  }

  // Try to truncate at sentence boundary first (. ! ?)
  const sentenceEnd = text.lastIndexOf('. ', maxLength);
  if (sentenceEnd > maxLength * 0.7) {
    return text.substring(0, sentenceEnd + 1).trim();
  }

  const exclamationEnd = text.lastIndexOf('! ', maxLength);
  if (exclamationEnd > maxLength * 0.7) {
    return text.substring(0, exclamationEnd + 1).trim();
  }

  const questionEnd = text.lastIndexOf('? ', maxLength);
  if (questionEnd > maxLength * 0.7) {
    return text.substring(0, questionEnd + 1).trim();
  }

  // Fall back to word boundary
  const lastSpace = text.lastIndexOf(' ', maxLength);
  if (lastSpace > maxLength * 0.7) {
    return text.substring(0, lastSpace).trim() + '...';
  }

  // Last resort: hard cut
  return text.substring(0, maxLength).trim() + '...';
}

/**
 * Truncates HTML content while preserving structure
 * @param html - The HTML string to truncate
 * @param maxLength - Maximum character length (default: 280)
 * @returns Truncated HTML
 */
export function truncateHtml(html: string, maxLength: number = TRUNCATION_LENGTH): string {
  // Strip HTML tags to count actual text
  const textContent = html.replace(/<[^>]*>/g, '');

  if (textContent.length <= maxLength) {
    return html;
  }

  // Simple approach: truncate the text and try to preserve some structure
  // This is a basic implementation - for production you might want a proper HTML parser
  let currentLength = 0;
  let result = '';
  let inTag = false;

  for (let i = 0; i < html.length; i++) {
    const char = html[i];

    if (char === '<') {
      inTag = true;
      result += char;
    } else if (char === '>') {
      inTag = false;
      result += char;
    } else if (inTag) {
      result += char;
    } else {
      if (currentLength >= maxLength) {
        // Try to find a good breaking point
        const remaining = html.substring(i);
        const nextTagOrSpace = remaining.search(/[<\s]/);
        if (nextTagOrSpace > 0 && nextTagOrSpace < 20) {
          result += remaining.substring(0, nextTagOrSpace);
        }
        result += '...';
        break;
      }
      result += char;
      currentLength++;
    }
  }

  return result;
}

/**
 * Checks if content needs truncation
 * @param content - The content to check (text or HTML)
 * @param maxLength - Maximum character length (default: 280)
 * @returns true if content exceeds maxLength
 */
export function needsTruncation(content: string | null | undefined, maxLength: number = TRUNCATION_LENGTH): boolean {
  if (!content) return false;

  // Strip HTML tags to get actual text length
  const textContent = content.replace(/<[^>]*>/g, '');
  return textContent.length > maxLength;
}

/**
 * Gets the plain text length of content (stripping HTML)
 * @param content - The content to measure
 * @returns Character count
 */
export function getTextLength(content: string | null | undefined): number {
  if (!content) return 0;
  return content.replace(/<[^>]*>/g, '').length;
}
