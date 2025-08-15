import React, { useState } from 'react';
import { getDefaultTemplate } from '@/lib/default-css-template';

interface CSSEditorProps {
  value: string;
  onChange: (css: string) => void;
}

export default function CSSEditor({ value, onChange }: CSSEditorProps) {
  const [showHelp, setShowHelp] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [previewInfo, setPreviewInfo] = useState<{
    isValid: boolean;
    wasSanitized: boolean;
    cleanedLength: number;
  } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const handleTemplateSelect = (type: 'full' | 'minimal' | 'dark' | 'advanced' | 'gaming' | 'newspaper' | 'fantasy' | 'clear') => {
    if (type === 'clear') {
      onChange('');
    } else {
      onChange(getDefaultTemplate(type));
    }
    setShowTemplates(false);
  };

  const handleRestoreDefault = () => {
    const confirmed = window.confirm(
      'This will replace your current CSS with the default template. Are you sure?'
    );
    if (confirmed) {
      onChange(getDefaultTemplate('full'));
    }
  };

  const handlePreviewCSS = async () => {
    if (!value.trim()) return;
    
    setPreviewLoading(true);
    try {
      const response = await fetch('/api/css-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ css: value })
      });
      
      if (response.ok) {
        const data = await response.json();
        setPreviewInfo(data);
      }
    } catch (error) {
      console.error('Failed to preview CSS:', error);
    } finally {
      setPreviewLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header with controls */}
      <div className="flex items-center justify-between">
        <label className="block thread-label text-base">
          🎨 Custom CSS Editor
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowTemplates(!showTemplates)}
            className="px-3 py-1 text-xs border border-thread-sage bg-thread-paper hover:bg-thread-cream rounded shadow-cozySm transition-all"
          >
            📚 Templates
          </button>
          <button
            type="button"
            onClick={() => setShowHelp(!showHelp)}
            className="px-3 py-1 text-xs border border-thread-sage bg-thread-paper hover:bg-thread-cream rounded shadow-cozySm transition-all"
          >
            {showHelp ? 'Hide' : 'Show'} Help
          </button>
          <button
            type="button"
            onClick={handlePreviewCSS}
            disabled={previewLoading || !value.trim()}
            className="px-3 py-1 text-xs border border-thread-pine text-thread-pine hover:bg-thread-pine hover:text-white rounded shadow-cozySm transition-all disabled:opacity-50"
          >
            {previewLoading ? '⏳' : '👁️'} {previewLoading ? 'Checking...' : 'Validate'}
          </button>
          <button
            type="button"
            onClick={handleRestoreDefault}
            className="px-3 py-1 text-xs border border-thread-sunset text-thread-sunset hover:bg-thread-sunset hover:text-white rounded shadow-cozySm transition-all"
          >
            🔄 Restore Default
          </button>
        </div>
      </div>

      {/* Templates dropdown */}
      {showTemplates && (
        <div className="bg-thread-cream border border-thread-sage rounded-lg p-4 space-y-3">
          <h3 className="thread-label text-sm">Choose a starting template:</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => handleTemplateSelect('full')}
              className="p-3 text-xs border border-thread-sage bg-thread-paper hover:bg-white rounded transition-all text-left"
            >
              <div className="font-semibold text-thread-pine">📋 Full Template</div>
              <div className="text-thread-sage mt-1">Complete scaffolding with examples</div>
            </button>
            <button
              type="button"
              onClick={() => handleTemplateSelect('minimal')}
              className="p-3 text-xs border border-thread-sage bg-thread-paper hover:bg-white rounded transition-all text-left"
            >
              <div className="font-semibold text-thread-pine">✨ Minimal</div>
              <div className="text-thread-sage mt-1">Simple color customization</div>
            </button>
            <button
              type="button"
              onClick={() => handleTemplateSelect('dark')}
              className="p-3 text-xs border border-thread-sage bg-thread-paper hover:bg-white rounded transition-all text-left"
            >
              <div className="font-semibold text-thread-pine">🌙 Dark Theme</div>
              <div className="text-thread-sage mt-1">Dark color scheme</div>
            </button>
            <button
              type="button"
              onClick={() => handleTemplateSelect('advanced')}
              className="p-3 text-xs border border-thread-sage bg-thread-paper hover:bg-white rounded transition-all text-left"
            >
              <div className="font-semibold text-thread-pine">🚀 Advanced Layout</div>
              <div className="text-thread-sage mt-1">Modern design with animations</div>
            </button>
            <button
              type="button"
              onClick={() => handleTemplateSelect('gaming')}
              className="p-3 text-xs border border-thread-sage bg-thread-paper hover:bg-white rounded transition-all text-left"
            >
              <div className="font-semibold text-thread-pine">🎮 Retro Gaming</div>
              <div className="text-thread-sage mt-1">8-bit terminal style</div>
            </button>
            <button
              type="button"
              onClick={() => handleTemplateSelect('newspaper')}
              className="p-3 text-xs border border-thread-sage bg-thread-paper hover:bg-white rounded transition-all text-left"
            >
              <div className="font-semibold text-thread-pine">📰 Newspaper</div>
              <div className="text-thread-sage mt-1">Classic print layout</div>
            </button>
            <button
              type="button"
              onClick={() => handleTemplateSelect('fantasy')}
              className="p-3 text-xs border border-thread-sage bg-thread-paper hover:bg-white rounded transition-all text-left"
            >
              <div className="font-semibold text-thread-pine">🏰 Medieval Fantasy</div>
              <div className="text-thread-sage mt-1">Tavern & scroll theme</div>
            </button>
            <button
              type="button"
              onClick={() => handleTemplateSelect('clear')}
              className="p-3 text-xs border border-thread-sage bg-thread-paper hover:bg-white rounded transition-all text-left"
            >
              <div className="font-semibold text-thread-pine">🗑️ Clear All</div>
              <div className="text-thread-sage mt-1">Start from scratch</div>
            </button>
          </div>
        </div>
      )}

      {/* Help section */}
      {showHelp && (
        <div className="bg-thread-cream border border-thread-sage rounded-lg p-4 space-y-3">
          <h3 className="thread-label text-sm">CSS Editor Help</h3>
          <div className="text-xs text-thread-sage space-y-2">
            <div>
              <strong>🎯 Target Elements:</strong>
              <div className="max-h-32 overflow-y-auto">
                <ul className="ml-4 mt-1 space-y-1 text-xs">
                  <li><strong>🌍 Global Site Control:</strong></li>
                  <li><code>.site-layout</code> - Entire page background</li>
                  <li><code>.site-header</code> - Global navigation header</li>
                  <li><code>.site-title</code> - Site title in nav</li>
                  <li><code>.nav-link</code> - Navigation links</li>
                  <li><code>.site-footer</code> - Global footer</li>
                  <li><code>.site-main</code> - Main content wrapper</li>
                  
                  <li className="pt-2"><strong>📱 Profile Layout:</strong></li>
                  <li><code>.profile-container</code> - Profile area background</li>
                  <li><code>.profile-content-wrapper</code> - Layout wrapper</li>
                  <li><code>.profile-main-content</code> - Main content column</li>
                  <li><code>.profile-sidebar</code> - Sidebar (hidden by default)</li>
                  
                  <li className="pt-2"><strong>👤 Header & Identity:</strong></li>
                  <li><code>.profile-header</code> - Profile header section</li>
                  <li><code>.profile-display-name</code> - Your display name</li>
                  <li><code>.profile-bio</code> - Bio text</li>
                  <li><code>.profile-photo-section</code> - Photo container</li>
                  <li><code>.profile-actions</code> - Action buttons area</li>
                  
                  <li className="pt-2"><strong>🗂️ Tab Navigation:</strong></li>
                  <li><code>.profile-tabs</code> - Tab navigation container</li>
                  <li><code>.profile-tab-button</code> - Individual tab buttons</li>
                  <li><code>.profile-tab-content</code> - Tab content areas</li>
                  
                  <li className="pt-2"><strong>📝 Blog Posts:</strong></li>
                  <li><code>.blog-post-card</code> - Blog post cards</li>
                  <li><code>.blog-post-header</code> - Post header</li>
                  <li><code>.blog-post-content</code> - Post content</li>
                  <li><code>.blog-post-actions</code> - Post action buttons</li>
                  
                  <li className="pt-2"><strong>👥 Social Elements:</strong></li>
                  <li><code>.featured-friends</code> - Friends container</li>
                  <li><code>.friend-card</code> - Individual friend cards</li>
                  <li><code>.website-link</code> - Website/blogroll links</li>
                  <li><code>.guestbook-section</code> - Guestbook container</li>
                  <li><code>.guestbook-entry</code> - Individual entries</li>
                  
                  <li className="pt-2"><strong>🎛️ Interactive:</strong></li>
                  <li><code>.profile-button</code> - All profile buttons</li>
                  <li><code>.section-heading</code> - All section headings</li>
                </ul>
              </div>
            </div>
            <div>
              <strong>🚫 Security:</strong> For safety, we block <code>javascript:</code> URLs and <code>expression()</code>. Google Fonts <code>@import</code> is allowed.
            </div>
            <div>
              <strong>💡 Tips:</strong>
              <ul className="ml-4 mt-1 space-y-1">
                <li><strong>🌟 NEW:</strong> Control the entire page with <code>.site-layout</code> and <code>.site-header</code>!</li>
                <li>Use the templates as starting points - mix and match!</li>
                <li>Test your changes by viewing your profile</li>
                <li>Use browser dev tools to inspect elements</li>
                <li><strong>Global Control:</strong> Style navigation, footer, and page backgrounds</li>
                <li>Try the Advanced template for complete layout control</li>
                <li>Gaming template transforms entire site into terminal</li>
                <li>Newspaper template includes masthead navigation styling</li>
                <li>Use <code>:hover</code> effects for interactive elements</li>
                <li>Add <code>@keyframes</code> for custom animations</li>
                <li>Google Fonts imports work: <code>@import url(&apos;https://fonts.googleapis.com/...&apos;)</code></li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* CSS Editor */}
      <div className="relative">
        <textarea
          className="w-full h-96 p-4 font-mono text-sm border border-thread-sage rounded-lg bg-thread-paper focus:outline-none focus:ring-2 focus:ring-thread-sage/50 resize-y"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="/* Start typing your CSS here, or use a template above! */"
          spellCheck={false}
        />
        
        {/* Character count */}
        <div className="absolute bottom-2 right-2 text-xs text-thread-sage bg-thread-cream px-2 py-1 rounded">
          {value.length} characters
        </div>
      </div>

      {/* CSS validation results */}
      {previewInfo && (
        <div className={`text-xs border rounded p-3 ${
          previewInfo.isValid 
            ? 'bg-green-50 border-green-200 text-green-800' 
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <div className="flex items-start gap-2">
            <span>{previewInfo.isValid ? '✅' : '❌'}</span>
            <div>
              <strong>CSS Validation Results:</strong>
              <ul className="mt-1 space-y-1">
                <li>Status: {previewInfo.isValid ? 'Valid and ready to use' : 'Contains blocked content'}</li>
                <li>Final size: {previewInfo.cleanedLength} characters</li>
                {previewInfo.wasSanitized && (
                  <li className="text-orange-600">⚠️ Some content was removed for security</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* CSS validation/preview info */}
      <div className="text-xs text-thread-sage bg-thread-cream border border-thread-sage rounded p-3">
        <div className="flex items-start gap-2">
          <span>💡</span>
          <div>
            <strong>Preview your changes:</strong> Save your profile settings and visit your public profile page to see your CSS in action.
            Changes apply immediately after saving.
          </div>
        </div>
      </div>
    </div>
  );
}