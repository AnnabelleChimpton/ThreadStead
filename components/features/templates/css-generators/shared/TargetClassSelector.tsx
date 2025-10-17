import React from 'react';

// Common CSS classes users might want to style
const COMMON_CLASSES = [
  { value: '.site-header', label: 'Site Header', category: 'Structure' },
  { value: '.site-main', label: 'Main Content', category: 'Structure' },
  { value: '.site-footer', label: 'Site Footer', category: 'Structure' },

  { value: '.ts-profile-header', label: 'Profile Header', category: 'Profile' },
  { value: '.ts-profile-photo-image', label: 'Profile Photo', category: 'Profile' },
  { value: '.ts-profile-display-name', label: 'Profile Name', category: 'Profile' },
  { value: '.ts-profile-bio', label: 'Profile Bio', category: 'Profile' },

  { value: '.profile-tab-button', label: 'Tab Button', category: 'Tabs' },
  { value: '.profile-tab-button[aria-selected="true"]', label: 'Active Tab', category: 'Tabs' },

  { value: '.blog-post-card', label: 'Blog Post Card', category: 'Content' },
  { value: '.blog-post-title', label: 'Blog Post Title', category: 'Content' },
  { value: '.blog-post-content', label: 'Blog Post Content', category: 'Content' },

  { value: '.thread-button', label: 'Primary Button', category: 'Design System' },
  { value: '.thread-module', label: 'Module/Card', category: 'Design System' },
  { value: '.thread-headline', label: 'Headline Text', category: 'Design System' },

  { value: '.media-grid', label: 'Media Grid', category: 'Media' },
  { value: '.badge-item', label: 'Badge', category: 'Media' },
];

interface TargetClassSelectorProps {
  label?: string;
  value: string;
  onChange: (className: string) => void;
  className?: string;
}

export default function TargetClassSelector({
  label = 'Target Element',
  value,
  onChange,
  className = ''
}: TargetClassSelectorProps) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label className="text-xs font-medium text-gray-700">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-3 py-2 text-sm border border-gray-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">Select an element...</option>
        {COMMON_CLASSES.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label} ({item.category})
          </option>
        ))}
      </select>
    </div>
  );
}
