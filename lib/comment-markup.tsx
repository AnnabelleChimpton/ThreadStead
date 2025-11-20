import React from 'react';

/**
 * Simple markup parser for comments
 * Supports: **bold**, *italic*, [links](url), > quotes, - bullet points, :emojis:
 */

// Global emoji cache
let emojiMap: Map<string, string> = new Map();
let emojiMapLoaded = false;
let emojiMapPromise: Promise<Map<string, string>> | null = null;

// Load emojis from API with singleton pattern to prevent multiple concurrent requests
export async function loadEmojiMap(): Promise<Map<string, string>> {
  if (emojiMapLoaded) {
    return emojiMap;
  }

  // If already loading, return the existing promise
  if (emojiMapPromise) {
    return emojiMapPromise;
  }

  // Create a single promise for loading emojis
  emojiMapPromise = (async () => {
    try {
      const response = await fetch('/api/emojis');
      if (response.ok) {
        const data = await response.json();
        const newEmojiMap = new Map<string, string>();
        data.emojis.forEach((emoji: any) => {
          newEmojiMap.set(emoji.name, emoji.imageUrl);
        });
        emojiMap = newEmojiMap;
        emojiMapLoaded = true;
      }
    } catch (error) {
      console.error('Failed to load emoji map:', error);
      emojiMapLoaded = true; // Mark as loaded to prevent infinite retries
    } finally {
      emojiMapPromise = null; // Reset promise for future loads if needed
    }

    return emojiMap;
  })();

  return emojiMapPromise;
}

export interface ParsedContent {
  type: 'text' | 'bold' | 'italic' | 'strikethrough' | 'link' | 'quote' | 'list-item' | 'numbered-list' | 'emoji' | 'image' | 'code' | 'code-block';
  content: string;
  url?: string;
  alt?: string;
  emojiName?: string;
  emojiUrl?: string;
  children?: ParsedContent[];
  listNumber?: number;
}

// Escape HTML to prevent XSS
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

// Simple URL validation
function isValidUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}

// Validate image URLs (for emojis and other images)
// Prevents javascript:, data:text/html and other XSS vectors
function isValidImageUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    // Allow http, https, and data:image/* URLs only
    if (urlObj.protocol === 'http:' || urlObj.protocol === 'https:') {
      return true;
    }
    // Allow data URLs only for images
    if (urlObj.protocol === 'data:') {
      return url.startsWith('data:image/');
    }
    return false;
  } catch {
    return false;
  }
}

// Parse inline markup (bold, italic, links, emojis)
function parseInline(text: string): (string | ParsedContent)[] {
  const parts: (string | ParsedContent)[] = [];
  let current = '';
  let i = 0;

  while (i < text.length) {
    const char = text[i];
    const nextChar = text[i + 1];
    const rest = text.slice(i);

    // Bold: **text**
    if (char === '*' && nextChar === '*') {
      if (current) {
        parts.push(current);
        current = '';
      }

      const endMatch = rest.slice(2).match(/^(.*?)\*\*/);
      if (endMatch && endMatch[1]) {
        parts.push({
          type: 'bold',
          content: endMatch[1],
        });
        i += endMatch[1].length + 4; // Skip past **text**
        continue;
      }
    }

    // Italic: *text* (but not if it's part of **)
    else if (char === '*' && nextChar !== '*' && text[i - 1] !== '*') {
      if (current) {
        parts.push(current);
        current = '';
      }

      const endMatch = rest.slice(1).match(/^(.*?)\*/);
      if (endMatch && endMatch[1]) {
        parts.push({
          type: 'italic',
          content: endMatch[1],
        });
        i += endMatch[1].length + 2; // Skip past *text*
        continue;
      }
    }

    // Strikethrough: ~~text~~
    else if (char === '~' && nextChar === '~') {
      const strikeMatch = rest.slice(2).match(/^(.*?)~~/);
      if (strikeMatch && strikeMatch[1]) {
        if (current) {
          parts.push(current);
          current = '';
        }

        parts.push({
          type: 'strikethrough',
          content: strikeMatch[1],
        });
        i += strikeMatch[1].length + 4; // Skip past ~~text~~
        continue;
      }
    }

    // Images: ![alt](url)
    else if (char === '!' && nextChar === '[') {
      const imageMatch = rest.match(/^!\[([^\]]*)\]\(([^\)]+)\)/);
      if (imageMatch) {
        if (current) {
          parts.push(current);
          current = '';
        }

        const [fullMatch, altText, imageUrl] = imageMatch;
        if (isValidImageUrl(imageUrl)) {
          parts.push({
            type: 'image',
            content: fullMatch,
            alt: altText || 'Image',
            url: imageUrl,
          });
        } else {
          // Invalid URL, treat as regular text
          parts.push(fullMatch);
        }
        i += fullMatch.length;
        continue;
      }
    }

    // Links: [text](url)
    else if (char === '[') {
      const linkMatch = rest.match(/^\[([^\]]+)\]\(([^\)]+)\)/);
      if (linkMatch) {
        if (current) {
          parts.push(current);
          current = '';
        }

        const [fullMatch, linkText, linkUrl] = linkMatch;
        if (isValidUrl(linkUrl)) {
          parts.push({
            type: 'link',
            content: linkText,
            url: linkUrl,
          });
        } else {
          // Invalid URL, treat as regular text
          parts.push(fullMatch);
        }
        i += fullMatch.length;
        continue;
      }
    }

    // Inline code: `code`
    else if (char === '`') {
      const codeMatch = rest.match(/^`([^`]+)`/);
      if (codeMatch) {
        if (current) {
          parts.push(current);
          current = '';
        }

        const [fullMatch, codeContent] = codeMatch;
        parts.push({
          type: 'code',
          content: codeContent,
        });
        i += fullMatch.length;
        continue;
      }
    }

    // Emojis: :emojiName:
    else if (char === ':') {
      const emojiMatch = rest.match(/^:([a-zA-Z0-9_-]+):/);
      if (emojiMatch) {
        const [fullMatch, emojiName] = emojiMatch;
        const emojiUrl = emojiMap.get(emojiName);

        if (emojiUrl && isValidImageUrl(emojiUrl)) {
          if (current) {
            parts.push(current);
            current = '';
          }

          parts.push({
            type: 'emoji',
            content: fullMatch,
            emojiName,
            emojiUrl,
          });
          i += fullMatch.length;
          continue;
        }
        // If emoji not found or invalid URL, continue as regular text
      }
    }

    current += char;
    i++;
  }

  if (current) {
    parts.push(current);
  }

  return parts;
}

// React component for markdown rendering with emoji support
export function MarkdownWithEmojis({ markdown }: { markdown: string }): React.ReactNode {
  const [processedHtml, setProcessedHtml] = React.useState<string>("");
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;

    async function processMarkdown() {
      try {
        const html = await markdownToSafeHtmlWithEmojis(markdown);
        if (!cancelled) {
          setProcessedHtml(html);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Failed to process markdown with emojis:', error);
        if (!cancelled) {
          // Fall back to regular markdown processing
          const { markdownToSafeHtml } = await import('@/lib/utils/sanitization/html');
          const fallbackHtml = markdownToSafeHtml(markdown);
          setProcessedHtml(fallbackHtml);
          setIsLoading(false);
        }
      }
    }

    processMarkdown();

    return () => {
      cancelled = true;
    };
  }, [markdown]);

  if (isLoading) {
    return <div className="text-gray-500">Loading...</div>;
  }

  return <div dangerouslySetInnerHTML={{ __html: processedHtml }} />;
}

// Process HTML content for emoji replacements
export function processHtmlWithEmojis(html: string): string {
  // First load emojis if needed
  if (!emojiMapLoaded) {
    return html; // Return original if emojis not loaded
  }

  return html.replace(/:([a-zA-Z0-9_-]+):/g, (match, emojiName) => {
    const emojiUrl = emojiMap.get(emojiName);
    if (emojiUrl && isValidImageUrl(emojiUrl)) {
      // Escape the URL to prevent attribute injection attacks
      const escapedUrl = escapeHtml(emojiUrl);
      return `<img src="${escapedUrl}" alt="${escapeHtml(match)}" title="${escapeHtml(match)}" class="inline-block mx-1 align-text-bottom" style="display: inline-block; width: 20px; height: 20px; margin: 0 0.25rem; vertical-align: text-bottom; object-fit: contain; image-rendering: -webkit-optimize-contrast; -webkit-backface-visibility: hidden; transform: translateZ(0); filter: contrast(1.05);" />`;
    }
    return match;
  });
}

// Enhanced markdown processor with emoji support
export async function markdownToSafeHtmlWithEmojis(markdown: string): Promise<string> {
  // First convert markdown to HTML
  const { markdownToSafeHtml } = await import('@/lib/utils/sanitization/html');
  const html = markdownToSafeHtml(markdown);

  // Then process emojis
  await loadEmojiMap();
  return processHtmlWithEmojis(html);
}

// Parse a single line and determine its type
function parseLine(line: string): ParsedContent | string {
  const trimmed = line.trim();

  // Quote: > text
  if (trimmed.startsWith('> ')) {
    return {
      type: 'quote',
      content: trimmed.slice(2),
      children: parseInline(trimmed.slice(2)) as ParsedContent[],
    };
  }

  // Bullet points: - text or * text
  if (trimmed.match(/^[\-\*] /)) {
    return {
      type: 'list-item',
      content: trimmed.slice(2),
      children: parseInline(trimmed.slice(2)) as ParsedContent[],
    };
  }

  // Numbered lists: 1. text, 2. text, etc.
  const numberedMatch = trimmed.match(/^(\d+)\. (.*)$/);
  if (numberedMatch) {
    return {
      type: 'numbered-list',
      content: numberedMatch[2],
      listNumber: parseInt(numberedMatch[1], 10),
      children: parseInline(numberedMatch[2]) as ParsedContent[],
    };
  }

  // Regular text with inline markup
  const inlineParts = parseInline(line);
  if (inlineParts.length === 1 && typeof inlineParts[0] === 'string') {
    return inlineParts[0];
  }

  return {
    type: 'text',
    content: line,
    children: inlineParts as ParsedContent[],
  };
}

// Parse the full comment text
export function parseCommentMarkup(text: string): (ParsedContent | string)[] {
  const lines = text.split('\n');
  const result: (ParsedContent | string)[] = [];
  let inCodeBlock = false;
  let codeBlockContent: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Check for code block delimiter
    if (trimmed.startsWith('```')) {
      if (!inCodeBlock) {
        // Start of code block
        inCodeBlock = true;
        codeBlockContent = [];
      } else {
        // End of code block
        inCodeBlock = false;
        result.push({
          type: 'code-block',
          content: codeBlockContent.join('\n'),
        });
        codeBlockContent = [];
      }
      continue;
    }

    if (inCodeBlock) {
      // Inside code block, collect raw content
      codeBlockContent.push(line);
    } else {
      // Normal line processing
      result.push(parseLine(line));
    }
  }

  // Handle unclosed code block
  if (inCodeBlock && codeBlockContent.length > 0) {
    result.push({
      type: 'code-block',
      content: codeBlockContent.join('\n'),
    });
  }

  return result;
}

// Parse the full comment text with emoji support (async)
export async function parseCommentMarkupWithEmojis(text: string): Promise<(ParsedContent | string)[]> {
  await loadEmojiMap();
  return parseCommentMarkup(text);
}

// Render parsed content to React elements
export function renderParsedContent(content: (ParsedContent | string)[], keyPrefix = 0): React.ReactNode {
  return content.map((item, index) => {
    const itemKey = `${keyPrefix}-${index}`;

    if (typeof item === 'string') {
      return <span key={itemKey}>{item}</span>;
    }

    switch (item.type) {
      case 'bold':
        return <strong key={itemKey} className="font-bold">{item.content}</strong>;

      case 'italic':
        return <em key={itemKey} className="italic">{item.content}</em>;

      case 'strikethrough':
        return <del key={itemKey} className="line-through text-gray-500">{item.content}</del>;

      case 'link':
        return (
          <a
            key={itemKey}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 underline"
          >
            {item.content}
          </a>
        );

      case 'quote':
        return (
          <blockquote key={itemKey} className="border-l-4 border-gray-300 pl-4 py-2 my-2 bg-gray-50 italic">
            {item.children ? renderParsedContent(item.children, index + 100) : item.content}
          </blockquote>
        );

      case 'list-item':
        return (
          <div key={itemKey} className="flex items-start gap-2 my-1">
            <span className="text-gray-600 mt-0.5">•</span>
            <span>{item.children ? renderParsedContent(item.children, index + 200) : item.content}</span>
          </div>
        );

      case 'numbered-list':
        return (
          <div key={itemKey} className="flex items-start gap-2 my-1">
            <span className="text-gray-600 mt-0.5 min-w-[1.5em] text-right">{item.listNumber}.</span>
            <span>{item.children ? renderParsedContent(item.children, index + 250) : item.content}</span>
          </div>
        );

      case 'code':
        return (
          <code
            key={itemKey}
            className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono text-red-600"
          >
            {item.content}
          </code>
        );

      case 'code-block':
        return (
          <pre
            key={itemKey}
            className="bg-gray-100 border border-gray-300 rounded p-3 my-2 overflow-x-auto"
          >
            <code className="text-sm font-mono whitespace-pre">{item.content}</code>
          </pre>
        );

      case 'text':
        return (
          <span key={itemKey}>
            {item.children ? renderParsedContent(item.children, index + 300) : item.content}
          </span>
        );

      case 'emoji':
        return (
          <img
            key={itemKey}
            src={item.emojiUrl}
            alt={item.content}
            title={item.content}
            className="inline-block mx-1 align-text-bottom"
            style={{
              width: '20px',
              height: '20px',
              display: 'inline-block',
              objectFit: 'contain',
              imageRendering: '-webkit-optimize-contrast',
              WebkitBackfaceVisibility: 'hidden',
              transform: 'translateZ(0)',
              filter: 'contrast(1.05)'
            }}
            onError={(e) => {
              // If emoji fails to load, replace with text
              const span = document.createElement('span');
              span.textContent = item.content;
              e.currentTarget.parentNode?.replaceChild(span, e.currentTarget);
            }}
          />
        );

      case 'image':
        return (
          <img
            key={itemKey}
            src={item.url}
            alt={item.alt || 'Image'}
            className="max-w-full h-auto rounded my-2 block"
            style={{
              maxHeight: '400px',
              objectFit: 'contain'
            }}
            onError={(e) => {
              // If image fails to load, show alt text
              const span = document.createElement('span');
              span.textContent = `[Image: ${item.alt || 'Failed to load'}]`;
              span.className = 'text-gray-500 italic';
              e.currentTarget.parentNode?.replaceChild(span, e.currentTarget);
            }}
          />
        );

      default:
        return <span key={itemKey}>{item.content}</span>;
    }
  });
}

// Main function to render comment markup
export function renderCommentMarkup(text: string): React.ReactNode {
  const parsed = parseCommentMarkup(text);
  return (
    <div className="comment-markup">
      {parsed.map((item, index) => (
        <React.Fragment key={index}>
          {renderParsedContent([item], index * 1000)}
          {index < parsed.length - 1 && <br />}
        </React.Fragment>
      ))}
    </div>
  );
}

// React component for emoji-aware comment rendering
export function CommentMarkupWithEmojis({ text }: { text: string }): React.ReactNode {
  const [parsedContent, setParsedContent] = React.useState<(ParsedContent | string)[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;

    async function parseWithEmojis() {
      try {
        // If emojis are already loaded, parse immediately without async call
        if (emojiMapLoaded) {
          if (!cancelled) {
            const parsed = parseCommentMarkup(text);
            setParsedContent(parsed);
            setIsLoading(false);
          }
          return;
        }

        const parsed = await parseCommentMarkupWithEmojis(text);
        if (!cancelled) {
          setParsedContent(parsed);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Failed to parse comment with emojis:', error);
        if (!cancelled) {
          // Fall back to regular parsing without emojis
          const parsed = parseCommentMarkup(text);
          setParsedContent(parsed);
          setIsLoading(false);
        }
      }
    }

    parseWithEmojis();

    return () => {
      cancelled = true;
    };
  }, [text]);

  if (isLoading) {
    return (
      <div className="comment-markup">
        <span className="text-gray-500">Loading...</span>
      </div>
    );
  }

  return (
    <div className="comment-markup">
      {parsedContent.map((item, index) => (
        <React.Fragment key={index}>
          {renderParsedContent([item], index * 1000)}
          {index < parsedContent.length - 1 && <br />}
        </React.Fragment>
      ))}
    </div>
  );
}

// HTML renderer with emoji support (for posts with HTML content)
export function HtmlWithEmojis({ html }: { html: string }): React.ReactNode {
  const [processedHtml, setProcessedHtml] = React.useState<string>(html);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;

    async function processEmojis() {
      try {
        // If emojis are already loaded, process immediately without async call
        if (emojiMapLoaded) {
          if (!cancelled) {
            const processed = processHtmlWithEmojis(html);
            setProcessedHtml(processed);
            setIsLoading(false);
          }
          return;
        }

        await loadEmojiMap();
        if (!cancelled) {
          const processed = processHtmlWithEmojis(html);
          setProcessedHtml(processed);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Failed to process HTML emojis:', error);
        if (!cancelled) {
          setProcessedHtml(html);
          setIsLoading(false);
        }
      }
    }

    processEmojis();

    return () => {
      cancelled = true;
    };
  }, [html]);

  if (isLoading) {
    return <div className="text-gray-500">Loading...</div>;
  }

  return <div dangerouslySetInnerHTML={{ __html: processedHtml }} />;
}

// Simple text renderer with emoji support only (for posts)
export function TextWithEmojis({ text }: { text: string }): React.ReactNode {
  const [renderedText, setRenderedText] = React.useState<React.ReactNode>(text);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;

    async function processEmojis() {
      try {
        // If emojis are already loaded, process immediately without async call
        if (emojiMapLoaded) {
          if (!cancelled) {
            const processedText = parseEmojiText(text);
            setRenderedText(processedText);
            setIsLoading(false);
          }
          return;
        }

        await loadEmojiMap();
        if (!cancelled) {
          const processedText = parseEmojiText(text);
          setRenderedText(processedText);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Failed to process emojis:', error);
        if (!cancelled) {
          setRenderedText(text);
          setIsLoading(false);
        }
      }
    }

    processEmojis();

    return () => {
      cancelled = true;
    };
  }, [text]);

  if (isLoading) {
    return <span className="text-gray-500">Loading...</span>;
  }

  return <span>{renderedText}</span>;
}

// Parse text for emoji replacements only
function parseEmojiText(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let current = '';
  let i = 0;
  let key = 0;

  while (i < text.length) {
    const char = text[i];
    const rest = text.slice(i);

    // Emojis: :emojiName:
    if (char === ':') {
      const emojiMatch = rest.match(/^:([a-zA-Z0-9_-]+):/);
      if (emojiMatch) {
        const [fullMatch, emojiName] = emojiMatch;
        const emojiUrl = emojiMap.get(emojiName);

        if (emojiUrl && isValidImageUrl(emojiUrl)) {
          if (current) {
            parts.push(current);
            current = '';
          }

          parts.push(
            <img
              key={key++}
              src={emojiUrl}
              alt={fullMatch}
              title={fullMatch}
              className="inline-block mx-1 align-text-bottom"
              style={{
                width: '20px',
                height: '20px',
                display: 'inline-block',
                objectFit: 'contain',
                imageRendering: '-webkit-optimize-contrast',
                WebkitBackfaceVisibility: 'hidden',
                transform: 'translateZ(0)',
                filter: 'contrast(1.05)'
              }}
              onError={(e) => {
                // If emoji fails to load, replace with text
                const span = document.createElement('span');
                span.textContent = fullMatch;
                e.currentTarget.parentNode?.replaceChild(span, e.currentTarget);
              }}
            />
          );
          i += fullMatch.length;
          continue;
        }
        // If emoji not found or invalid URL, continue as regular text
      }
    }

    current += char;
    i++;
  }

  if (current) {
    parts.push(current);
  }

  return parts;
}