/**
 * ComponentThumbnailGenerator - Generate visual previews for components in the palette
 * Creates mini-preview thumbnails to enhance component discovery
 */

import React, { useMemo } from 'react';
import { componentRegistry } from '@/lib/templates/core/template-registry';

interface ThumbnailProps {
  componentType: string;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

interface ComponentPreview {
  componentType: string;
  previewElement: React.ReactNode;
  backgroundColor?: string;
  padding?: string;
}

/**
 * Pre-defined thumbnail previews for visual component discovery
 * Each component gets a mini-preview that shows its essence
 */
const COMPONENT_PREVIEWS: Record<string, ComponentPreview> = {
  // Text & Content Components
  'TextElement': {
    componentType: 'TextElement',
    previewElement: (
      <div className="text-xs text-gray-700 font-medium">
        Sample Text
      </div>
    ),
    backgroundColor: '#f8fafc',
    padding: '8px'
  },

  'Heading': {
    componentType: 'Heading',
    previewElement: (
      <div className="text-sm font-bold text-gray-800">
        Heading
      </div>
    ),
    backgroundColor: '#f8fafc',
    padding: '8px'
  },

  'Paragraph': {
    componentType: 'Paragraph',
    previewElement: (
      <div className="space-y-1">
        <div className="h-1 bg-gray-400 rounded w-full"></div>
        <div className="h-1 bg-gray-400 rounded w-4/5"></div>
        <div className="h-1 bg-gray-400 rounded w-3/4"></div>
      </div>
    ),
    backgroundColor: '#f8fafc',
    padding: '8px'
  },

  // Layout Components
  'CenteredBox': {
    componentType: 'CenteredBox',
    previewElement: (
      <div className="border-2 border-dashed border-blue-300 bg-blue-50 rounded flex items-center justify-center">
        <div className="w-4 h-4 bg-blue-400 rounded"></div>
      </div>
    ),
    backgroundColor: '#ffffff',
    padding: '4px'
  },

  'FlexContainer': {
    componentType: 'FlexContainer',
    previewElement: (
      <div className="flex space-x-1">
        <div className="w-2 h-6 bg-purple-400 rounded"></div>
        <div className="w-2 h-6 bg-purple-400 rounded"></div>
        <div className="w-2 h-6 bg-purple-400 rounded"></div>
      </div>
    ),
    backgroundColor: '#faf5ff',
    padding: '6px'
  },

  // Profile Components
  'ProfilePhoto': {
    componentType: 'ProfilePhoto',
    previewElement: (
      <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
        <span className="text-white text-xs font-bold">👤</span>
      </div>
    ),
    backgroundColor: '#f0f9ff',
    padding: '8px'
  },

  'DisplayName': {
    componentType: 'DisplayName',
    previewElement: (
      <div className="text-sm font-bold text-blue-600">
        @username
      </div>
    ),
    backgroundColor: '#f0f9ff',
    padding: '8px'
  },

  // Interactive Components
  'FollowButton': {
    componentType: 'FollowButton',
    previewElement: (
      <div className="bg-blue-500 text-white px-3 py-1 rounded text-xs font-medium">
        Follow
      </div>
    ),
    backgroundColor: '#f8fafc',
    padding: '8px'
  },

  // Media Components
  'UserImage': {
    componentType: 'UserImage',
    previewElement: (
      <div className="w-10 h-6 bg-gradient-to-r from-pink-300 to-purple-300 rounded flex items-center justify-center">
        <span className="text-xs">🖼️</span>
      </div>
    ),
    backgroundColor: '#fdf2f8',
    padding: '6px'
  },

  // Effects & Styling
  'GradientBox': {
    componentType: 'GradientBox',
    previewElement: (
      <div className="w-full h-8 bg-gradient-to-r from-pink-400 via-purple-500 to-blue-500 rounded"></div>
    ),
    backgroundColor: '#ffffff',
    padding: '4px'
  },

  'NeonBorder': {
    componentType: 'NeonBorder',
    previewElement: (
      <div className="border-2 border-cyan-400 bg-gray-900 rounded relative">
        <div className="absolute inset-0 border-2 border-cyan-400 rounded animate-pulse opacity-50"></div>
        <div className="p-2 text-cyan-300 text-xs text-center">✨</div>
      </div>
    ),
    backgroundColor: '#000000',
    padding: '4px'
  },

  // Retro Components - Phase 1
  'CRTMonitor': {
    componentType: 'CRTMonitor',
    previewElement: (
      <div className="bg-gray-800 rounded-lg p-1">
        <div className="bg-green-900 border-2 border-green-400 rounded relative overflow-hidden">
          <div className="h-6 bg-gradient-to-b from-green-400 to-green-600 opacity-20"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-green-300 text-xs font-mono">📺</span>
          </div>
          {/* Scanlines effect */}
          <div className="absolute inset-0 opacity-30">
            <div className="h-px bg-green-300 mt-1"></div>
            <div className="h-px bg-green-300 mt-1"></div>
            <div className="h-px bg-green-300 mt-1"></div>
          </div>
        </div>
      </div>
    ),
    backgroundColor: '#1f2937',
    padding: '4px'
  },

  'NeonSign': {
    componentType: 'NeonSign',
    previewElement: (
      <div className="bg-gray-900 rounded p-2 relative">
        <div className="text-pink-400 text-xs font-bold text-center filter drop-shadow-sm">
          NEON
        </div>
        <div className="absolute inset-0 bg-pink-400 opacity-10 rounded animate-pulse"></div>
      </div>
    ),
    backgroundColor: '#111827',
    padding: '2px'
  },

  'ArcadeButton': {
    componentType: 'ArcadeButton',
    previewElement: (
      <div className="flex justify-center">
        <div
          className="w-6 h-6 rounded-full bg-gradient-to-b from-red-400 to-red-600 border-2 border-red-800 relative shadow-lg"
          style={{
            boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.3), 0 2px 8px rgba(0,0,0,0.3)'
          }}
        >
          <div className="absolute top-0.5 left-0.5 w-1 h-1 bg-red-200 rounded-full opacity-70"></div>
        </div>
      </div>
    ),
    backgroundColor: '#fee2e2',
    padding: '8px'
  },

  'PixelArtFrame': {
    componentType: 'PixelArtFrame',
    previewElement: (
      <div className="relative">
        {/* 8-bit style border */}
        <div className="border-4 border-yellow-600 bg-yellow-400 relative" style={{
          borderImage: 'none',
          borderStyle: 'solid',
        }}>
          <div className="w-8 h-6 bg-yellow-100 flex items-center justify-center">
            <span className="text-xs">🖼️</span>
          </div>
          {/* Corner pixels */}
          <div className="absolute -top-1 -left-1 w-2 h-2 bg-yellow-800"></div>
          <div className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-800"></div>
          <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-yellow-800"></div>
          <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-yellow-800"></div>
        </div>
      </div>
    ),
    backgroundColor: '#fef3c7',
    padding: '6px'
  },

  'RetroGrid': {
    componentType: 'RetroGrid',
    previewElement: (
      <div className="bg-gradient-to-b from-purple-900 to-pink-900 relative overflow-hidden rounded">
        {/* Grid lines */}
        <svg width="40" height="24" className="absolute inset-0">
          <defs>
            <pattern id="grid" width="4" height="4" patternUnits="userSpaceOnUse">
              <path d="M 4 0 L 0 0 0 4" fill="none" stroke="#ff00ff" strokeWidth="0.5" opacity="0.6"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
        {/* Horizon line */}
        <div className="absolute bottom-2 left-0 right-0 h-px bg-pink-400 opacity-80"></div>
      </div>
    ),
    backgroundColor: '#581c87',
    padding: '2px'
  },

  // Default fallback for unknown components
  'default': {
    componentType: 'default',
    previewElement: (
      <div className="w-8 h-6 bg-gray-200 border border-gray-300 rounded flex items-center justify-center">
        <span className="text-xs text-gray-500">?</span>
      </div>
    ),
    backgroundColor: '#f9fafb',
    padding: '6px'
  }
};

/**
 * Component thumbnail generator that creates visual previews
 */
export function ComponentThumbnailGenerator({
  componentType,
  size = 'medium',
  className = ''
}: ThumbnailProps) {
  const preview = COMPONENT_PREVIEWS[componentType] || COMPONENT_PREVIEWS['default'];

  const sizeClasses = {
    small: 'w-10 h-8',
    medium: 'w-12 h-10',
    large: 'w-16 h-12'
  };

  const thumbnailElement = useMemo(() => (
    <div
      className={`${sizeClasses[size]} rounded border border-gray-200 shadow-sm overflow-hidden flex items-center justify-center ${className}`}
      style={{
        backgroundColor: preview.backgroundColor,
        padding: preview.padding
      }}
    >
      {preview.previewElement}
    </div>
  ), [componentType, size, className, preview]);

  return thumbnailElement;
}

/**
 * Batch thumbnail generator for multiple components
 */
export function generateBatchThumbnails(componentTypes: string[], size: 'small' | 'medium' | 'large' = 'medium') {
  const thumbnails = new Map<string, React.ReactNode>();

  componentTypes.forEach(type => {
    thumbnails.set(type, (
      <ComponentThumbnailGenerator
        key={type}
        componentType={type}
        size={size}
      />
    ));
  });

  return thumbnails;
}

/**
 * Check if a component has a custom thumbnail preview
 */
export function hasCustomThumbnail(componentType: string): boolean {
  return componentType in COMPONENT_PREVIEWS && componentType !== 'default';
}

/**
 * Get all available component previews
 */
export function getAvailablePreviews(): string[] {
  return Object.keys(COMPONENT_PREVIEWS).filter(key => key !== 'default');
}

export default ComponentThumbnailGenerator;