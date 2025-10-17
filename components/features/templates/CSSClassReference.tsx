import React, { useState } from 'react';

// CSS snippets for common properties based on element type
const generateCSSSnippet = (className: string): string => {
  // Container/Layout elements
  if (className.includes('container') || className.includes('wrapper') || className.includes('section')) {
    return `${className} {
  background-color: #ffffff;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
}`;
  }

  // Header elements
  if (className.includes('header') || className.includes('nav')) {
    return `${className} {
  background-color: #f8f9fa;
  padding: 16px;
  border-bottom: 2px solid #e0e0e0;
}`;
  }

  // Profile photo/image elements
  if (className.includes('photo') || className.includes('image') || className.includes('avatar')) {
    return `${className} {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  border: 3px solid #e0e0e0;
  object-fit: cover;
}`;
  }

  // Title/heading elements
  if (className.includes('title') || className.includes('name') || className.includes('headline')) {
    return `${className} {
  font-size: 24px;
  font-weight: bold;
  color: #333333;
  margin-bottom: 8px;
}`;
  }

  // Bio/description/content text
  if (className.includes('bio') || className.includes('description') || className.includes('content')) {
    return `${className} {
  font-size: 16px;
  line-height: 1.6;
  color: #555555;
  margin-bottom: 16px;
}`;
  }

  // Button elements
  if (className.includes('button') || className.includes('btn')) {
    return `${className} {
  background-color: #007bff;
  color: white;
  padding: 10px 20px;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  transition: background-color 0.2s;
}

${className}:hover {
  background-color: #0056b3;
}`;
  }

  // Tab elements
  if (className.includes('tab')) {
    return `${className} {
  padding: 12px 24px;
  border-bottom: 2px solid transparent;
  color: #666666;
  transition: all 0.2s;
}

${className}:hover {
  color: #333333;
  background-color: #f5f5f5;
}`;
  }

  // Card/post elements
  if (className.includes('card') || className.includes('post')) {
    return `${className} {
  background-color: white;
  padding: 20px;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  margin-bottom: 16px;
}`;
  }

  // Grid/media grid elements
  if (className.includes('grid')) {
    return `${className} {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
  padding: 20px;
}`;
  }

  // Badge elements
  if (className.includes('badge')) {
    return `${className} {
  width: 88px;
  height: 31px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
}`;
  }

  // Date/meta elements
  if (className.includes('date') || className.includes('meta') || className.includes('label')) {
    return `${className} {
  font-size: 14px;
  color: #888888;
  font-weight: 500;
}`;
  }

  // Divider elements
  if (className.includes('divider')) {
    return `${className} {
  border-top: 1px solid #e0e0e0;
  margin: 20px 0;
}`;
  }

  // Default fallback - general element
  return `${className} {
  /* Add your custom styles here */
  color: ;
  background-color: ;
  padding: ;
  margin: ;
}`;
};

// CSS Class data organized by category
const cssClassData = {
  'Site Structure': [
    { name: '.site-layout', description: 'Overall page container' },
    { name: '.site-main', description: 'Main content area' },
    { name: '.site-header', description: 'Site header with consistent background' },
    { name: '.site-footer', description: 'Site footer with consistent background' },
    { name: '.site-title', description: 'Site title/logo text' },
    { name: '.site-tagline', description: 'Site tagline/subtitle' },
    { name: '.nav-link', description: 'Navigation menu links' },
  ],
  'Profile Header': [
    { name: '.ts-profile-header', description: 'Main profile header container' },
    { name: '.ts-profile-header-layout', description: 'Flex layout for header elements' },
    { name: '.ts-profile-photo-section', description: 'Profile photo container' },
    { name: '.ts-profile-photo-image', description: 'The actual profile image element' },
    { name: '.ts-profile-info-section', description: 'Name and bio container' },
    { name: '.ts-profile-display-name', description: 'Profile display name' },
    { name: '.ts-profile-bio', description: 'Profile bio text' },
    { name: '.ts-profile-actions', description: 'Action buttons container' },
    { name: '.ts-profile-button', description: 'Profile-specific button styling' },
  ],
  'Profile Tabs': [
    { name: '.profile-tabs-wrapper', description: 'Main tabs container' },
    { name: '.profile-tabs', description: 'Tab navigation container' },
    { name: '.profile-tab-button', description: 'Individual tab button' },
    { name: '.profile-tab-button[aria-selected="true"]', description: 'Active/selected tab' },
    { name: '.profile-tab-content', description: 'Tab content container' },
    { name: '.profile-tab-panel', description: 'Individual tab panel' },
  ],
  'Blog Posts': [
    { name: '.ts-blog-tab-content', description: 'Blog posts tab container' },
    { name: '.ts-blog-posts-list', description: 'List container for posts' },
    { name: '.blog-post-card', description: 'Individual blog post card' },
    { name: '.blog-post-header', description: 'Post header with date/meta' },
    { name: '.blog-post-title', description: 'Blog post title/heading' },
    { name: '.blog-post-content', description: 'Post content area' },
    { name: '.blog-post-date', description: 'Post publication date' },
  ],
  'Media & Badges': [
    { name: '.media-tab-content', description: 'Media tab container' },
    { name: '.media-grid', description: 'Grid layout for media items' },
    { name: '.media-item', description: 'Individual media item' },
    { name: '.media-image', description: 'Media image element' },
    { name: '.profile-badges', description: 'Main badges container' },
    { name: '.badge-item', description: 'Individual badge container' },
    { name: '.threadring-badge', description: '88x31 badge styling' },
  ],
  'ThreadRing Pages': [
    { name: '.tr-page-container', description: 'Main grid container for ThreadRing pages' },
    { name: '.tr-main-content', description: 'Main content area (left column)' },
    { name: '.tr-sidebar', description: 'Sidebar area (right column)' },
    { name: '.tr-header-card', description: 'ThreadRing header information card' },
    { name: '.tr-title', description: 'ThreadRing title/name' },
    { name: '.tr-description', description: 'ThreadRing description text' },
    { name: '.tr-posts-container', description: 'Container for posts list' },
  ],
  'Thread Design System': [
    { name: '.thread-surface', description: 'Background surface with paper texture' },
    { name: '.thread-module', description: 'Paper-like container with cozy shadow' },
    { name: '.thread-divider', description: 'Stitched divider pattern' },
    { name: '.thread-button', description: 'Primary cozy button styling' },
    { name: '.thread-button-secondary', description: 'Secondary button variant' },
    { name: '.thread-headline', description: 'Serif headline with text shadow' },
    { name: '.thread-label', description: 'Monospace micro-labels' },
    { name: '.thread-content', description: 'Enhanced content typography' },
  ],
  'Typography': [
    { name: '.thread-content h1', description: 'Large heading (1.5rem)' },
    { name: '.thread-content h2', description: 'Medium heading (1.25rem)' },
    { name: '.thread-content h3', description: 'Small heading (1.125rem)' },
    { name: '.thread-content p', description: 'Paragraph with enhanced line-height' },
    { name: '.thread-content blockquote', description: 'Styled blockquotes with border' },
    { name: '.thread-content code', description: 'Inline code styling' },
  ],
};

interface CSSClassReferenceProps {
  onClassSelect?: (className: string) => void;
}

export default function CSSClassReference({ onClassSelect }: CSSClassReferenceProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['Site Structure']);
  const [copiedClass, setCopiedClass] = useState<string | null>(null);

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const copyToClipboard = (className: string) => {
    const cssSnippet = generateCSSSnippet(className);
    navigator.clipboard.writeText(cssSnippet);
    setCopiedClass(className);
    setTimeout(() => setCopiedClass(null), 2000);

    // Also insert into editor if callback provided
    if (onClassSelect) {
      onClassSelect(cssSnippet);
    }
  };

  // Filter classes based on search query
  const filteredData = Object.entries(cssClassData).reduce((acc, [category, classes]) => {
    const filtered = classes.filter(
      cls =>
        cls.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cls.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
    if (filtered.length > 0) {
      acc[category] = filtered;
    }
    return acc;
  }, {} as Record<string, typeof cssClassData[keyof typeof cssClassData]>);

  return (
    <div className="h-full flex flex-col bg-white overflow-x-hidden">
      {/* Header */}
      <div className="pb-3 border-b border-gray-200">
        <h3 className="font-bold text-base mb-1">CSS Class Reference</h3>
        <p className="text-xs text-gray-600 mb-2">
          Click any class to copy a CSS snippet with common properties.
        </p>

        {/* Search */}
        <input
          type="text"
          placeholder="Search classes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Categories */}
      <div className="flex-1 overflow-y-auto">
        {Object.entries(filteredData).map(([category, classes]) => (
          <div key={category} className="border-b border-gray-200">
            {/* Category Header */}
            <button
              onClick={() => toggleCategory(category)}
              className="w-full py-3 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
            >
              <span className="font-semibold text-sm">{category}</span>
              <span className="text-gray-400">
                {expandedCategories.includes(category) ? '▼' : '▶'}
              </span>
            </button>

            {/* Category Classes */}
            {expandedCategories.includes(category) && (
              <div className="bg-gray-50">
                {classes.map((cls) => (
                  <div
                    key={cls.name}
                    className="py-2 border-t border-gray-200 hover:bg-white transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <code className="text-xs font-mono text-blue-600 flex-1 break-all">
                        {cls.name}
                      </code>
                      <button
                        onClick={() => copyToClipboard(cls.name)}
                        className="px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded transition-colors flex-shrink-0"
                      >
                        {copiedClass === cls.name ? '✓ Copied!' : 'Copy'}
                      </button>
                    </div>
                    <p className="text-xs text-gray-600 break-words">{cls.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {Object.keys(filteredData).length === 0 && (
          <div className="p-4 text-center text-sm text-gray-500">
            No classes found matching &quot;{searchQuery}&quot;
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="pt-3 border-t border-gray-200 bg-gray-50">
        <div className="text-xs text-gray-600">
          <p className="mb-2">
            <strong>Need more help?</strong>
          </p>
          <a
            href="/design-css-tutorial"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            View Full CSS Tutorial →
          </a>
        </div>
      </div>
    </div>
  );
}
