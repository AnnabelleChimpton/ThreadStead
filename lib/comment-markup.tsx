import React from 'react';

/**
 * Simple markup parser for comments
 * Supports: **bold**, *italic*, [links](url), > quotes, - bullet points
 */

export interface ParsedContent {
  type: 'text' | 'bold' | 'italic' | 'link' | 'quote' | 'list-item';
  content: string;
  url?: string;
  children?: ParsedContent[];
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

// Parse inline markup (bold, italic, links)
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

    current += char;
    i++;
  }

  if (current) {
    parts.push(current);
  }

  return parts;
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
  return lines.map(parseLine);
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
        
      case 'text':
        return (
          <span key={itemKey}>
            {item.children ? renderParsedContent(item.children, index + 300) : item.content}
          </span>
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
      {renderParsedContent(parsed)}
    </div>
  );
}