import React, { useState, useEffect } from 'react';

interface SmartUrlShortenerProps {
  content: string;
  onContentChange: (newContent: string) => void;
  className?: string;
}

interface UrlSuggestion {
  originalUrl: string;
  shortenedUrl?: string;
  position: { start: number; end: number };
  isLoading?: boolean;
  wasAutoShortened?: boolean;
}

async function shortenUrl(longUrl: string): Promise<string> {
  try {
    const response = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(longUrl)}`);
    const shortUrl = await response.text();
    return shortUrl.startsWith('http') ? shortUrl : longUrl;
  } catch (error) {
    console.error('URL shortening failed:', error);
    return longUrl;
  }
}

function detectLongUrls(content: string): UrlSuggestion[] {
  const urlRegex = /https?:\/\/[^\s]+/g;
  const suggestions: UrlSuggestion[] = [];
  let match;

  while ((match = urlRegex.exec(content)) !== null) {
    const url = match[0];
    // Suggest shortening for URLs longer than 100 characters
    if (url.length > 100) {
      suggestions.push({
        originalUrl: url,
        position: { start: match.index, end: match.index + url.length }
      });
    }
  }

  return suggestions;
}

export default function SmartUrlShortener({ content, onContentChange, className = '' }: SmartUrlShortenerProps) {
  const [suggestions, setSuggestions] = useState<UrlSuggestion[]>([]);
  const [dismissedUrls, setDismissedUrls] = useState<Set<string>>(new Set());
  const [autoShortenedUrls, setAutoShortenedUrls] = useState<Set<string>>(new Set());

  useEffect(() => {
    const longUrls = detectLongUrls(content);
    const newSuggestions = longUrls.filter(
      suggestion => !dismissedUrls.has(suggestion.originalUrl)
    );
    setSuggestions(newSuggestions);

    // Auto-shorten URLs over 500 characters
    const autoShortenUrls = longUrls.filter(url =>
      url.originalUrl.length > 500 && !dismissedUrls.has(url.originalUrl)
    );

    if (autoShortenUrls.length > 0) {
      autoShortenUrls.forEach(url => {
        handleShortenUrl({ ...url, wasAutoShortened: true });
      });
    }
  }, [content, dismissedUrls]);

  const handleShortenUrl = async (suggestion: UrlSuggestion) => {
    // Mark as loading
    setSuggestions(prev => prev.map(s =>
      s.originalUrl === suggestion.originalUrl
        ? { ...s, isLoading: true }
        : s
    ));

    try {
      const shortened = await shortenUrl(suggestion.originalUrl);

      if (shortened !== suggestion.originalUrl) {
        // Replace in content
        const newContent = content.replace(suggestion.originalUrl, shortened);
        onContentChange(newContent);

        // Track auto-shortened URLs for success message
        if (suggestion.wasAutoShortened) {
          setAutoShortenedUrls(prev => new Set([...prev, suggestion.originalUrl]));
        }

        // Remove suggestion
        setSuggestions(prev => prev.filter(s => s.originalUrl !== suggestion.originalUrl));
      } else {
        // Shortening failed, remove loading state
        setSuggestions(prev => prev.map(s =>
          s.originalUrl === suggestion.originalUrl
            ? { ...s, isLoading: false }
            : s
        ));
      }
    } catch (error) {
      // Remove loading state on error
      setSuggestions(prev => prev.map(s =>
        s.originalUrl === suggestion.originalUrl
          ? { ...s, isLoading: false }
          : s
      ));
    }
  };

  const handleDismiss = (suggestion: UrlSuggestion) => {
    setDismissedUrls(prev => new Set([...prev, suggestion.originalUrl]));
  };

  const formatUrlForDisplay = (url: string, maxLength: number = 50): string => {
    if (url.length <= maxLength) return url;

    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname;
      const remaining = maxLength - domain.length - 6; // Reserve for "..." and domain

      if (remaining > 10) {
        const pathStart = urlObj.pathname + urlObj.search + urlObj.hash;
        const truncated = pathStart.substring(0, remaining);
        return `${domain}...${truncated.slice(-10)}`;
      }

      return `${domain}...`;
    } catch {
      return url.substring(0, maxLength - 3) + '...';
    }
  };

  if (suggestions.length === 0 && autoShortenedUrls.size === 0) {
    return null;
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Success message for auto-shortened URLs */}
      {autoShortenedUrls.size > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="text-green-600 mt-0.5">
              ✅
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-green-900 mb-1">
                URLs automatically shortened
              </div>
              <div className="text-xs text-green-700">
                {autoShortenedUrls.size === 1
                  ? 'A very long URL was automatically shortened to prevent submission issues.'
                  : `${autoShortenedUrls.size} very long URLs were automatically shortened to prevent submission issues.`
                }
              </div>
            </div>
            <button
              onClick={() => setAutoShortenedUrls(new Set())}
              className="text-green-400 hover:text-green-600 text-lg leading-none"
              title="Dismiss"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {suggestions.map((suggestion, index) => (
        <div
          key={`${suggestion.originalUrl}-${index}`}
          className="bg-blue-50 border border-blue-200 rounded-lg p-3 shadow-sm"
        >
          <div className="flex items-start gap-3">
            <div className="text-blue-600 mt-0.5">
              🔗
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-blue-900 mb-1">
                {suggestion.originalUrl.length > 500 ? 'Very long URL auto-shortening...' : 'Long URL detected'}
              </div>
              <div className="text-xs text-blue-700 mb-2 font-mono bg-blue-100 p-1 rounded break-all">
                {formatUrlForDisplay(suggestion.originalUrl, 80)}
              </div>
              <div className="flex gap-2">
                {suggestion.originalUrl.length <= 500 ? (
                  <>
                    <button
                      onClick={() => handleShortenUrl(suggestion)}
                      disabled={suggestion.isLoading}
                      className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {suggestion.isLoading ? 'Shortening...' : 'Shorten URL'}
                    </button>
                    <button
                      onClick={() => handleDismiss(suggestion)}
                      disabled={suggestion.isLoading}
                      className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 transition-colors"
                    >
                      Keep Original
                    </button>
                  </>
                ) : (
                  <div className="text-xs text-gray-600 italic">
                    Automatically shortening to prevent submission issues...
                  </div>
                )}
              </div>
            </div>
            {suggestion.originalUrl.length <= 500 && (
              <button
                onClick={() => handleDismiss(suggestion)}
                className="text-blue-400 hover:text-blue-600 text-lg leading-none"
                title="Dismiss"
              >
                ×
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}