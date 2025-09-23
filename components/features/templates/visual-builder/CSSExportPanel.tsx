/**
 * CSS Export Panel
 * Allows users to copy and export clean CSS from their designs
 */

import React, { useState, useCallback, useMemo } from 'react';
import type { GlobalSettings } from './GlobalSettingsPanel';
import { generateCSSFromGlobalSettings } from '@/lib/templates/visual-builder/css-class-generator';

interface CSSExportPanelProps {
  globalSettings: GlobalSettings | null;
  className?: string;
}

/**
 * CSS Export Panel Component
 */
const CSSExportPanel = React.memo(function CSSExportPanel({
  globalSettings,
  className = ''
}: CSSExportPanelProps) {
  const [copied, setCopied] = useState(false);

  // Generate CSS from current global settings
  const generatedCSS = useMemo(() => {
    if (!globalSettings) {
      return {
        css: '/* No global settings to export */',
        classNames: []
      };
    }

    try {
      return generateCSSFromGlobalSettings(globalSettings);
    } catch (error) {
      console.warn('Failed to generate CSS:', error);
      return {
        css: '/* Error generating CSS */',
        classNames: []
      };
    }
  }, [globalSettings]);

  // Copy CSS to clipboard
  const handleCopyCSS = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(generatedCSS.css);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.warn('Failed to copy to clipboard:', error);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = generatedCSS.css;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [generatedCSS.css]);

  // Download CSS as file
  const handleDownloadCSS = useCallback(() => {
    const blob = new Blob([generatedCSS.css], { type: 'text/css' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'visual-builder-styles.css';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [generatedCSS.css]);

  return (
    <div className={`css-export-panel ${className}`}>
      {/* Header */}
      <div style={{
        marginBottom: '16px',
        paddingBottom: '12px',
        borderBottom: '2px solid #e5e7eb'
      }}>
        <h3 style={{
          margin: 0,
          fontSize: '16px',
          fontWeight: '600',
          color: '#374151',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          📄 Export CSS
        </h3>
        <p style={{
          margin: '4px 0 0 0',
          fontSize: '13px',
          color: '#6b7280'
        }}>
          Copy or download your design as clean CSS
        </p>
      </div>

      {/* Class Names Preview */}
      {generatedCSS.classNames.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <label style={{
            display: 'block',
            fontSize: '12px',
            fontWeight: '500',
            color: '#6b7280',
            marginBottom: '6px'
          }}>
            CSS Classes Applied:
          </label>
          <div style={{
            padding: '8px 12px',
            background: '#f3f4f6',
            borderRadius: '6px',
            fontSize: '12px',
            fontFamily: 'monospace',
            color: '#374151',
            wordBreak: 'break-all'
          }}>
            {generatedCSS.classNames.join(' ')}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '16px'
      }}>
        <button
          onClick={handleCopyCSS}
          style={{
            flex: 1,
            padding: '8px 12px',
            border: '2px solid #3b82f6',
            borderRadius: '6px',
            background: copied ? '#10b981' : '#3b82f6',
            color: 'white',
            fontSize: '13px',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}
        >
          {copied ? '✅ Copied!' : '📋 Copy CSS'}
        </button>
        <button
          onClick={handleDownloadCSS}
          style={{
            flex: 1,
            padding: '8px 12px',
            border: '2px solid #6b7280',
            borderRadius: '6px',
            background: 'white',
            color: '#6b7280',
            fontSize: '13px',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = '#f9fafb';
            e.currentTarget.style.borderColor = '#374151';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'white';
            e.currentTarget.style.borderColor = '#6b7280';
          }}
        >
          💾 Download
        </button>
      </div>

      {/* CSS Preview */}
      <div>
        <label style={{
          display: 'block',
          fontSize: '12px',
          fontWeight: '500',
          color: '#6b7280',
          marginBottom: '6px'
        }}>
          Generated CSS:
        </label>
        <textarea
          value={generatedCSS.css}
          readOnly
          style={{
            width: '100%',
            height: '300px',
            padding: '12px',
            border: '2px solid #e5e7eb',
            borderRadius: '6px',
            fontSize: '12px',
            fontFamily: 'Menlo, Monaco, "Courier New", monospace',
            background: '#f9fafb',
            color: '#374151',
            resize: 'vertical',
            lineHeight: '1.4'
          }}
          onFocus={e => {
            e.target.select();
          }}
        />
      </div>

      {/* Usage Instructions */}
      <div style={{
        marginTop: '16px',
        padding: '12px',
        background: '#eff6ff',
        borderRadius: '6px',
        border: '1px solid #dbeafe'
      }}>
        <h4 style={{
          margin: '0 0 8px 0',
          fontSize: '13px',
          fontWeight: '600',
          color: '#1e40af'
        }}>
          💡 How to Use:
        </h4>
        <ul style={{
          margin: 0,
          paddingLeft: '16px',
          fontSize: '12px',
          color: '#1e40af',
          lineHeight: '1.4'
        }}>
          <li>Copy the CSS and paste it into your external stylesheet</li>
          <li>Apply the class names to your HTML elements</li>
          <li>The CSS includes theme styles, patterns, and effects</li>
          <li>Component styles remain inline for easy customization</li>
        </ul>
      </div>
    </div>
  );
});

export default CSSExportPanel;