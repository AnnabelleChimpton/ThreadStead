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
      'This will clear your custom CSS and restore the site\'s default profile layout. Are you sure?'
    );
    if (confirmed) {
      onChange(''); // Clear CSS to use site default
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
    } catch {
      // CSS preview failed silently
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
            🔄 Use Site Default
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
              <div className="text-thread-sage mt-1">Remove all CSS (uses site default)</div>
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
              <strong>🎯 Complete CSS Selector Reference:</strong>
              <div className="max-h-96 overflow-y-auto border border-thread-sage/20 rounded p-3 bg-thread-paper/50">
                <ul className="ml-2 mt-1 space-y-1 text-xs">
                  
                  <li className="pt-3"><strong>🌍 Global Site Layout:</strong></li>
                  <li><code>.site-layout</code> - Entire page background container</li>
                  <li><code>.site-header</code> - Top navigation header (customizable colors/fonts)</li>
                  <li><code>.site-navigation</code> - Navigation container</li>
                  <li><code>.site-branding</code> - Site title and tagline area</li>
                  <li><code>.site-title</code> - Main site title in navigation</li>
                  <li><code>.site-tagline</code> - Tagline under site title</li>
                  <li><code>.site-nav-links</code> - Navigation links container</li>
                  <li><code>.nav-link</code> - Individual navigation links</li>
                  <li><code>.site-auth</code> - Authentication area (login/logout)</li>
                  <li><code>.site-creative-header</code> - Custom creative header section (full control!)</li>
                  <li><code>.site-main</code> - Main content wrapper</li>
                  <li><code>.site-footer</code> - Global footer</li>
                  <li><code>.footer-content</code> - Footer content wrapper</li>
                  <li><code>.footer-tagline</code> - Footer tagline text</li>
                  <li><code>.footer-copyright</code> - Copyright text</li>
                  
                  <li className="pt-3"><strong>📱 Profile Page Layout:</strong></li>
                  <li><code>.profile-container</code> - Main profile page container</li>
                  <li><code>.profile-content-wrapper</code> - Profile content layout wrapper</li>
                  <li><code>.profile-main-content</code> - Main content column</li>
                  <li><code>.profile-sidebar</code> - Sidebar (hidden by default, enable via CSS)</li>
                  <li><code>.sidebar-content</code> - Sidebar content wrapper</li>
                  <li><code>.sidebar-heading</code> - Sidebar section headings</li>
                  <li><code>.sidebar-text</code> - Sidebar text content</li>
                  
                  <li className="pt-3"><strong>👤 Profile Header & Identity:</strong></li>
                  <li><code>.profile-header</code> - Profile header section</li>
                  <li><code>.profile-header-layout</code> - Header layout container</li>
                  <li><code>.profile-photo-section</code> - Profile photo container</li>
                  <li><code>.profile-photo-wrapper</code> - Photo wrapper container</li>
                  <li><code>.profile-photo-frame</code> - Photo frame/border</li>
                  <li><code>.profile-photo-image</code> - Actual profile image</li>
                  <li><code>.profile-photo-placeholder</code> - &quot;No Photo&quot; placeholder</li>
                  <li><code>.profile-info-section</code> - Info and bio section</li>
                  <li><code>.profile-identity</code> - Name and status area</li>
                  <li><code>.profile-display-name</code> - User display name/username</li>
                  <li><code>.profile-status</code> - Status text (&quot;threadstead resident&quot;)</li>
                  <li><code>.profile-bio-section</code> - Bio text section</li>
                  <li><code>.profile-bio</code> - User bio/description text</li>
                  <li><code>.profile-actions</code> - Action buttons area</li>
                  <li><code>.profile-button</code> - Profile action buttons</li>
                  <li><code>.edit-profile-button</code> - Specific edit profile button</li>
                  
                  <li className="pt-3"><strong>🗂️ Tab Navigation System:</strong></li>
                  <li><code>.profile-tabs</code> - Tab navigation container</li>
                  <li><code>.profile-tabs-wrapper</code> - Tabs wrapper</li>
                  <li><code>.profile-tab-list</code> - Tab buttons container</li>
                  <li><code>.profile-tab-button</code> - Individual tab buttons</li>
                  <li><code>.profile-tab-button.active</code> - Active tab button</li>
                  <li><code>.profile-tab-panel</code> - Tab content panel</li>
                  <li><code>.profile-tab-content</code> - General tab content areas</li>
                  <li><code>.blog-tab-content</code> - Blog tab specific content</li>
                  <li><code>.media-tab-content</code> - Media tab specific content</li>
                  <li><code>.friends-tab-content</code> - Friends tab specific content</li>
                  <li><code>.guestbook-tab-content</code> - Guestbook tab specific content</li>
                  
                  <li className="pt-3"><strong>📝 Blog Posts & Content:</strong></li>
                  <li><code>.blog-posts-list</code> - Blog posts list container</li>
                  <li><code>.blog-post-card</code> - Individual blog post cards</li>
                  <li><code>.blog-post-header</code> - Post header with date/actions</li>
                  <li><code>.blog-post-date</code> - Post creation date</li>
                  <li><code>.blog-post-actions</code> - Post action buttons area</li>
                  <li><code>.blog-post-edit-button</code> - Edit post button</li>
                  <li><code>.blog-post-delete-button</code> - Delete post button</li>
                  <li><code>.blog-post-content</code> - Post main content</li>
                  <li><code>.blog-post-title</code> - Post title</li>
                  <li><code>.blog-post-editor</code> - Post editing textarea</li>
                  <li><code>.blog-post-preview</code> - Post preview area</li>
                  <li><code>#post-[id]</code> - Individual posts by ID (e.g., #post-abc123)</li>
                  
                  <li className="pt-3"><strong>💬 Comments System:</strong></li>
                  <li><code>.comment-container</code> - Individual comment containers</li>
                  <li><code>.comment-thread</code> - Threaded comment containers</li>
                  <li><code>.comment-header</code> - Comment header area</li>
                  <li><code>.comment-header-top</code> - Comment header top row (mobile)</li>
                  <li><code>.comment-header-bottom</code> - Comment header bottom row (mobile)</li>
                  <li><code>.comment-author-info</code> - Author info container</li>
                  <li><code>.comment-avatar</code> - Comment author avatar</li>
                  <li><code>.comment-author-name</code> - Comment author name</li>
                  <li><code>.comment-timestamp</code> - Comment timestamp</li>
                  <li><code>.comment-content</code> - Comment text content</li>
                  <li><code>.comment-actions</code> - Comment action buttons</li>
                  <li><code>.comment-button</code> - Comment action buttons</li>
                  <li><code>.comment-button-delete</code> - Comment delete button</li>
                  <li><code>.comment-form</code> - Comment forms</li>
                  <li><code>.comment-form-textarea</code> - Comment form textarea</li>
                  <li><code>.comment-form-actions</code> - Comment form action buttons area</li>
                  <li><code>.comment-submit-button</code> - Comment submit button</li>
                  <li><code>.comment-error</code> - Comment error messages</li>
                  <li><code>.comment-highlighted</code> - Highlighted comments</li>
                  <li><code>#comment-[id]</code> - Individual comments by ID</li>
                  
                  <li className="pt-3"><strong>👥 Friends & Social:</strong></li>
                  <li><code>.featured-friends</code> - Friends section container</li>
                  <li><code>.friends-websites-grid</code> - Friends and websites grid</li>
                  <li><code>.friend-card</code> - Individual friend cards</li>
                  <li><code>.websites-section</code> - Websites section container</li>
                  <li><code>.websites-list</code> - Website recommendations list</li>
                  <li><code>.website-item</code> - Individual website items</li>
                  <li><code>.website-content</code> - Website item content</li>
                  <li><code>.website-info</code> - Website information area</li>
                  <li><code>.website-title</code> - Website title</li>
                  <li><code>.website-link</code> - Website/blogroll links</li>
                  <li><code>.website-blurb</code> - Website description text</li>
                  <li><code>.website-url</code> - Website URL display</li>
                  <li><code>.section-heading</code> - Section headings</li>
                  
                  <li className="pt-3"><strong>📖 Guestbook:</strong></li>
                  <li><code>.guestbook-section</code> - Guestbook main container</li>
                  <li><code>.guestbook-entry</code> - Individual guestbook entries</li>
                  
                  <li className="pt-3"><strong>🖼️ Media Gallery:</strong></li>
                  <li><code>.media-gallery</code> - Media gallery grid</li>
                  <li><code>.media-item</code> - Individual media items</li>
                  
                  <li className="pt-3"><strong>🎨 ThreadStead Design System:</strong></li>
                  <li><code>.thread-surface</code> - Background surface</li>
                  <li><code>.thread-module</code> - Card/module containers</li>
                  <li><code>.thread-headline</code> - Headline text styling</li>
                  <li><code>.thread-label</code> - Small label text</li>
                  <li><code>.thread-button</code> - Retro button styling</li>
                  <li><code>.thread-button-secondary</code> - Secondary button styling</li>
                  <li><code>.thread-divider</code> - Decorative dividers</li>
                  <li><code>.thread-content</code> - Rich text content areas</li>
                  
                  <li className="pt-3"><strong>🎯 Special Selectors:</strong></li>
                  <li><code>body</code> - Document body (full page control)</li>
                  <li><code>h1, h2, h3, h4, h5, h6</code> - All headings</li>
                  <li><code>a</code> - All links</li>
                  <li><code>p</code> - All paragraphs</li>
                  <li><code>input, textarea, select</code> - Form elements</li>
                  <li><code>button</code> - All buttons</li>
                  <li><code>::selection</code> - Text selection highlighting</li>
                  <li><code>:focus-visible</code> - Keyboard focus styling</li>
                  
                  <li className="pt-3"><strong>📱 Responsive Helpers:</strong></li>
                  <li><code>@media (max-width: 767px)</code> - Mobile styles</li>
                  <li><code>@media (min-width: 768px)</code> - Tablet and up</li>
                  <li><code>@media (min-width: 1024px)</code> - Desktop styles</li>
                  <li><code>@media (hover: none)</code> - Touch devices</li>
                  
                </ul>
              </div>
            </div>
            <div>
              <strong>🚫 Security:</strong> For safety, we block <code>javascript:</code> URLs and <code>expression()</code>. Google Fonts <code>@import</code> is allowed.
            </div>
            <div>
              <strong>💡 Pro Tips & Examples:</strong>
              <ul className="ml-4 mt-1 space-y-1">
                <li><strong>🌟 Full Site Control:</strong> Use <code>.site-layout</code> to control entire page background, <code>.site-creative-header</code> for custom headers!</li>
                <li><strong>🎨 Design Themes:</strong> Use templates as starting points, then customize with selectors above</li>
                <li><strong>📱 Mobile-Friendly:</strong> All selectors work responsively - test on mobile!</li>
                <li><strong>🔍 Targeting:</strong> Use browser dev tools (F12) to inspect any element and find its classes</li>
                <li><strong>🎯 Specific Posts:</strong> Target individual posts with <code>#post-abc123</code> (use short ID from URL)</li>
                <li><strong>💬 Comment Styling:</strong> Fully customizable comment threads with mobile-optimized classes</li>
                <li><strong>🎪 Advanced Layouts:</strong> Show sidebar with <code>.profile-sidebar {`{ display: block !important; }`}</code></li>
                <li><strong>🌈 Animations:</strong> Add <code>@keyframes</code> for custom animations and transitions</li>
                <li><strong>📝 Typography:</strong> Import Google Fonts: <code>@import url(&apos;https://fonts.googleapis.com/css2?family=...&apos;)</code></li>
                <li><strong>🎨 Color Schemes:</strong> Use CSS variables for consistent theming across all elements</li>
                <li><strong>⚡ Performance:</strong> Avoid complex selectors for better mobile performance</li>
                <li><strong>🔗 States:</strong> Style <code>:hover</code>, <code>:active</code>, <code>:focus</code> states for better UX</li>
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
      <div className="text-xs text-thread-sage bg-thread-cream border border-thread-sage rounded p-3 space-y-2">
        <div className="flex items-start gap-2">
          <span>💡</span>
          <div>
            <strong>Preview your changes:</strong> Save your profile settings and visit your public profile page to see your CSS in action.
            Changes apply immediately after saving.
          </div>
        </div>
        <div className="flex items-start gap-2">
          <span>🎨</span>
          <div>
            <strong>Site Default vs Templates:</strong> If you have no custom CSS, your profile uses the site&apos;s default theme (set by admin). 
            Templates are starting points for your own customization.
          </div>
        </div>
      </div>
    </div>
  );
}