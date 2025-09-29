import React, { useState, useEffect, useCallback, useRef } from 'react';
import { unified } from 'unified';
import rehypeParse from 'rehype-parse';
import rehypeStringify from 'rehype-stringify';
import rehypeSanitize from 'rehype-sanitize';

interface SimpleHTMLPopupProps {
  isOpen: boolean;
  initialHTML: string;
  initialCSSRenderMode?: 'auto' | 'inherit' | 'custom';
  onSave: (html: string, cssRenderMode?: string) => void;
  onCancel: () => void;
}

/**
 * SimpleHTMLPopup - Compact popup for quick HTML editing
 *
 * A lightweight popup that appears centered on screen for quick HTML editing.
 * Features real-time validation and preview in a compact interface.
 * Always renders above all other content with highest z-index.
 */
export default function SimpleHTMLPopup({
  isOpen,
  initialHTML,
  initialCSSRenderMode = 'auto',
  onSave,
  onCancel
}: SimpleHTMLPopupProps) {
  const [htmlContent, setHtmlContent] = useState(initialHTML);
  const [cssRenderMode, setCSSRenderMode] = useState(initialCSSRenderMode);

  const [sanitizedPreview, setSanitizedPreview] = useState('');
  const [isValid, setIsValid] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  // HTML sanitization function
  const sanitizeHTML = useCallback(async (html: string): Promise<{ sanitized: string; isValid: boolean; error?: string }> => {
    try {
      if (!html.trim()) {
        return { sanitized: '', isValid: false, error: 'HTML content cannot be empty' };
      }

      const processor = unified()
        .use(rehypeParse, {
          fragment: true,
          emitParseErrors: false
        })
        .use(rehypeSanitize, {
          tagNames: [
            'div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'a', 'img', 'ul', 'ol', 'li', 'strong', 'em', 'br', 'hr',
            'section', 'article', 'header', 'footer', 'main', 'aside', 'nav',
            'table', 'thead', 'tbody', 'tr', 'td', 'th',
            'blockquote', 'code', 'pre', 'small', 'sub', 'sup'
          ],
          attributes: {
            '*': [
              'className', 'class', 'id', 'style',
              'data*', 'aria*', 'title', 'alt',
              'width', 'height', 'src', 'href', 'target', 'rel'
            ]
          },
          protocols: {
            href: ['http', 'https', 'mailto', 'tel', '#'],
            src: ['http', 'https', 'data', '#']
          }
        })
        .use(rehypeStringify);

      const result = await processor.process(html);
      const sanitized = String(result).trim();

      return { sanitized, isValid: true };
    } catch (error) {
      return {
        sanitized: '',
        isValid: false,
        error: error instanceof Error ? error.message : 'Invalid HTML syntax'
      };
    }
  }, []);

  // Validate and sanitize HTML when content changes
  useEffect(() => {
    if (htmlContent) {
      sanitizeHTML(htmlContent).then(result => {
        setSanitizedPreview(result.sanitized);
        setIsValid(result.isValid);
        setErrorMessage(result.error || '');
      });
    } else {
      setSanitizedPreview('');
      setIsValid(false);
      setErrorMessage('HTML content cannot be empty');
    }
  }, [htmlContent, sanitizeHTML]);

  // Reset content when popup opens
  useEffect(() => {
    if (isOpen) {
      setHtmlContent(initialHTML);
      setCSSRenderMode(initialCSSRenderMode);
      // Focus textarea after a brief delay to ensure it's rendered
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.select();
        }
      }, 100);
    }
  }, [isOpen, initialHTML, initialCSSRenderMode]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        onCancel();
      } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleSave();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  // Handle save
  const handleSave = () => {
    if (isValid && sanitizedPreview.trim()) {
      onSave(sanitizedPreview, cssRenderMode);
    }
  };

  // Center popup on screen, unaffected by scrolling
  const getPopupStyle = (): React.CSSProperties => {
    return {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      zIndex: 999999, // Highest z-index to ensure it's above everything
    };
  };

  if (!isOpen) return null;

  return (
    <>
      {/* CSS styles for preview based on render mode */}
      <style dangerouslySetInnerHTML={{
        __html: `
          /* Auto mode - Force block display for preview */
          .custom-html-auto-reset h1,
          .custom-html-auto-reset h2,
          .custom-html-auto-reset h3,
          .custom-html-auto-reset h4,
          .custom-html-auto-reset h5,
          .custom-html-auto-reset h6 {
            display: block !important;
            margin: 0.67em 0 !important;
            font-weight: bold !important;
            line-height: 1.2 !important;
            clear: both !important;
          }

          /* Force line breaks between block elements */
          .custom-html-auto-reset h1:not(:first-child),
          .custom-html-auto-reset h2:not(:first-child),
          .custom-html-auto-reset h3:not(:first-child),
          .custom-html-auto-reset h4:not(:first-child),
          .custom-html-auto-reset h5:not(:first-child),
          .custom-html-auto-reset h6:not(:first-child) {
            margin-top: 1em !important;
          }
          .custom-html-auto-reset h1 { font-size: 2em !important; }
          .custom-html-auto-reset h2 { font-size: 1.5em !important; }
          .custom-html-auto-reset h3 { font-size: 1.17em !important; }
          .custom-html-auto-reset h4 { font-size: 1em !important; }
          .custom-html-auto-reset h5 { font-size: 0.83em !important; }
          .custom-html-auto-reset h6 { font-size: 0.67em !important; }

          .custom-html-auto-reset p {
            display: block !important;
            margin: 1em 0 !important;
            line-height: 1.5 !important;
            clear: both !important;
          }

          /* Ensure paragraphs after headings have proper spacing */
          .custom-html-auto-reset h1 + p,
          .custom-html-auto-reset h2 + p,
          .custom-html-auto-reset h3 + p,
          .custom-html-auto-reset h4 + p,
          .custom-html-auto-reset h5 + p,
          .custom-html-auto-reset h6 + p,
          .custom-html-auto-reset p:not(:first-child) {
            margin-top: 1em !important;
          }
          .custom-html-auto-reset div {
            display: block !important;
          }
          .custom-html-auto-reset ul,
          .custom-html-auto-reset ol {
            display: block !important;
            margin: 1em 0 !important;
            padding-left: 2em !important;
          }
          .custom-html-auto-reset li {
            display: list-item !important;
            margin: 0.25em 0 !important;
          }
          .custom-html-auto-reset br {
            display: block !important;
            content: "" !important;
            margin: 0.5em 0 !important;
          }

          /* Ensure the container allows the styles to apply */
          .custom-html-auto-reset {
            line-height: 1.5 !important;
          }

          /* Inherit mode - minimal overrides */
          .custom-html-inherit {
            line-height: inherit !important;
          }

          /* Custom mode - minimal base styles for preview */
          .custom-html-custom {
            line-height: 1.4 !important;
          }

          .custom-html-custom * {
            box-sizing: border-box;
          }

          .custom-html-custom ul,
          .custom-html-custom ol {
            list-style-position: inside;
          }

          .custom-html-custom li {
            display: list-item;
          }
        `
      }} />

      {/* Backdrop - blocks all interactions with canvas behind */}
      <div
        className="fixed inset-0 bg-black bg-opacity-25"
        style={{
          zIndex: 999998, // Just below the modal
          pointerEvents: 'all' // Explicitly capture all pointer events
        }}
        onClick={onCancel}
        onMouseDown={(e) => e.stopPropagation()}
        onMouseUp={(e) => e.stopPropagation()}
      />

      {/* Popup */}
      <div
        ref={popupRef}
        style={getPopupStyle()}
        className="bg-white rounded-lg shadow-xl border border-gray-300 w-[500px] max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onMouseUp={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 rounded-t-lg">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-gray-900">Edit HTML Content</h3>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600 text-lg font-bold"
            >
              ×
            </button>
          </div>
          <p className="text-xs text-gray-600 mt-1">
            Ctrl/Cmd + Enter to save, Esc to cancel
          </p>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          {/* HTML Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              HTML Code
            </label>
            <textarea
              ref={textareaRef}
              value={htmlContent}
              onChange={(e) => setHtmlContent(e.target.value)}
              className="w-full h-32 p-2 border border-gray-300 rounded text-sm font-mono resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter your HTML here..."
              spellCheck={false}
            />
            {!isValid && (
              <p className="text-red-600 text-xs mt-1">
                ⚠️ {errorMessage}
              </p>
            )}
          </div>

          {/* CSS Render Mode */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              CSS Rendering Mode
            </label>
            <select
              value={cssRenderMode}
              onChange={(e) => setCSSRenderMode(e.target.value as 'auto' | 'inherit' | 'custom')}
              className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="auto">Auto (Recommended)</option>
              <option value="inherit">Inherit Site Styles</option>
              <option value="custom">Custom CSS</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {cssRenderMode === 'auto'
                ? '✅ Block elements (h1, p, div) will display on separate lines'
                : cssRenderMode === 'custom'
                ? '🎨 Essential block styling with customization flexibility'
                : '⚠️ HTML elements may render inline depending on your site CSS'
              }
            </p>
          </div>

          {/* Preview */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Preview ({cssRenderMode === 'auto' ? 'Auto Mode' : cssRenderMode === 'custom' ? 'Custom CSS Mode' : 'Inherit Site Styles'})
            </label>
            <div className="w-full h-32 p-2 border border-gray-300 rounded bg-gray-50 overflow-auto text-sm">
              {sanitizedPreview ? (
                <div
                  className={
                    cssRenderMode === 'auto' ? 'custom-html-auto-reset' :
                    cssRenderMode === 'inherit' ? 'custom-html-inherit' :
                    cssRenderMode === 'custom' ? 'custom-html-custom' :
                    ''
                  }
                  dangerouslySetInnerHTML={{ __html: sanitizedPreview }}
                />
              ) : (
                <span className="text-gray-500 italic">
                  {htmlContent ? 'Invalid HTML...' : 'Enter HTML to see preview...'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 rounded-b-lg flex justify-end space-x-2">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!isValid || !sanitizedPreview.trim()}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </>
  );
}