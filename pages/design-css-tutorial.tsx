import React, { useState } from "react";
import { useRouter } from "next/router";
import Layout from "@/components/Layout";
import Head from "next/head";
import Link from "next/link";
import RetroFooter from "@/components/design-tutorial/RetroFooter";

// CSS Class Categories
const cssCategories = [
  {
    id: 'profile-structure',
    title: 'Profile Structure',
    icon: '🏗️',
    description: 'Main containers and layout elements for profile pages'
  },
  {
    id: 'thread-utilities',
    title: 'Thread Utilities',
    icon: '🧵',
    description: 'ThreadStead design system classes and components'
  },
  {
    id: 'colors-themes',
    title: 'Colors & Themes',
    icon: '🎨',
    description: 'Color palette and theming utilities'
  },
  {
    id: 'typography',
    title: 'Typography',
    icon: '📝',
    description: 'Text styling and content formatting'
  },
  {
    id: 'layout-responsive',
    title: 'Layout & Responsive',
    icon: '📱',
    description: 'Layout utilities and responsive design classes'
  }
];

const cssData = {
  'profile-structure': [
    {
      name: 'Profile Containers',
      description: 'Main structural elements of profile pages',
      classes: [
        { name: '.profile-container', description: 'Main wrapper for entire profile page' },
        { name: '.profile-content-wrapper', description: 'Inner content wrapper with responsive padding' },
        { name: '.profile-main-content', description: 'Contains main profile sections (header, tabs, etc.)' },
        { name: '.profile-header', description: 'Profile header section' },
        { name: '.profile-header-layout', description: 'Flex layout container for header elements' }
      ],
      example: `/* Create a glass morphism profile container */
.profile-container {
  background: rgba(255, 255, 255, 0.1) !important;
  backdrop-filter: blur(20px) !important;
  border: 1px solid rgba(255, 255, 255, 0.2) !important;
  border-radius: 20px !important;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1) !important;
}

.profile-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
  color: white !important;
  border-radius: 15px !important;
  padding: 2rem !important;
}`,
      preview: (
        <div className="bg-gradient-to-br from-blue-100 to-purple-100 p-4 rounded-lg border border-blue-200">
          <div className="text-blue-800 font-semibold">Profile Container</div>
          <div className="text-blue-600 text-sm mt-1">Main structural wrapper</div>
        </div>
      )
    },
    {
      name: 'Profile Photo Elements',
      description: 'Photo containers and styling elements',
      classes: [
        { name: '.profile-photo-section', description: 'Container for profile photo area' },
        { name: '.profile-photo-wrapper', description: 'Photo wrapper with positioning' },
        { name: '.profile-photo-frame', description: 'Photo frame/border styling' },
        { name: '.profile-photo-image', description: 'The actual profile image element' },
        { name: '.profile-photo-placeholder', description: 'Placeholder when no photo is set' }
      ],
      example: `/* Polaroid-style photo frame */
.profile-photo-frame {
  background: #ffffff !important;
  border: none !important;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3) !important;
  padding: 16px !important;
  transform: rotate(-2deg) !important;
  transition: transform 0.3s ease !important;
}

.profile-photo-frame:hover {
  transform: rotate(0deg) scale(1.05) !important;
}

.profile-photo-image {
  border-radius: 0 !important;
  filter: sepia(20%) contrast(120%) !important;
}`,
      preview: (
        <div className="bg-white p-3 rounded shadow-lg transform -rotate-1 inline-block">
          <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center text-xs">
            Photo
          </div>
        </div>
      )
    },
    {
      name: 'Navigation & Tabs',
      description: 'Site navigation and profile tab system',
      classes: [
        { name: '.site-header', description: 'Main site header bar' },
        { name: '.site-title', description: 'Site title/logo text' },
        { name: '.site-tagline', description: 'Site tagline/subtitle' },
        { name: '.nav-link', description: 'Navigation menu links' },
        { name: '.profile-tabs', description: 'Container for tab system' },
        { name: '.profile-tab-button', description: 'Individual tab button' },
        { name: '.profile-tab-button.active', description: 'Currently active tab' },
        { name: '.profile-tab-panel', description: 'Tab content container' }
      ],
      example: `/* Retro gaming style tabs */
.profile-tab-button {
  background: #ffff00 !important;
  border: 3px solid #000 !important;
  color: #000 !important;
  font-family: "Comic Sans MS", cursive !important;
  font-weight: bold !important;
  text-transform: uppercase !important;
  box-shadow: 4px 4px 0 #000 !important;
  margin: 0 4px !important;
}

.profile-tab-button:hover {
  background: #ff69b4 !important;
  transform: translate(2px, 2px) !important;
  box-shadow: 2px 2px 0 #000 !important;
}

.profile-tab-button.active {
  background: #00ff00 !important;
  transform: translate(2px, 2px) !important;
}`,
      preview: (
        <div className="flex gap-2">
          <div className="bg-yellow-400 border-2 border-black px-3 py-1 text-xs font-bold transform">BLOG</div>
          <div className="bg-green-400 border-2 border-black px-3 py-1 text-xs font-bold transform translate-x-0.5 translate-y-0.5">MEDIA</div>
        </div>
      )
    },
    {
      name: 'Blog Post Elements',
      description: 'Blog post cards and content styling',
      classes: [
        { name: '.blog-tab-content', description: 'Container for blog posts tab' },
        { name: '.blog-posts-list', description: 'List container for blog posts' },
        { name: '.blog-post-card', description: 'Individual blog post card' },
        { name: '.blog-post-header', description: 'Post header (date, meta)' },
        { name: '.blog-post-title', description: 'Blog post title/heading' },
        { name: '.blog-post-content', description: 'Post content area' },
        { name: '.blog-post-date', description: 'Post publication date' }
      ],
      example: `/* Newspaper style blog posts */
.blog-post-card {
  background: #f9f7f4 !important;
  border: 2px solid #333 !important;
  border-radius: 0 !important;
  font-family: "Times New Roman", serif !important;
  box-shadow: 5px 5px 0 #333 !important;
  margin-bottom: 2rem !important;
}

.blog-post-title {
  font-size: 2rem !important;
  font-weight: bold !important;
  color: #000 !important;
  text-transform: uppercase !important;
  border-bottom: 3px double #333 !important;
  padding-bottom: 0.5rem !important;
}

.blog-post-date {
  background: #333 !important;
  color: #fff !important;
  padding: 0.25rem 0.5rem !important;
  font-size: 0.8rem !important;
  font-weight: bold !important;
  display: inline-block !important;
}`,
      preview: (
        <div className="bg-yellow-50 border-2 border-gray-800 p-3 font-serif">
          <div className="bg-gray-800 text-white px-2 py-1 text-xs font-bold inline-block mb-2">OCT 15</div>
          <div className="font-bold uppercase border-b-2 border-double border-gray-800 pb-1 mb-2">Blog Post Title</div>
          <div className="text-sm">Post content preview...</div>
        </div>
      )
    }
  ],
  'thread-utilities': [
    {
      name: 'Core Thread Classes',
      description: 'Main ThreadStead design system components',
      classes: [
        { name: '.thread-surface', description: 'Warm paper texture background' },
        { name: '.thread-module', description: 'Paper-like container with cozy shadow' },
        { name: '.thread-divider', description: 'Stitched divider pattern' },
        { name: '.thread-button', description: 'Primary cozy button styling' },
        { name: '.thread-button-secondary', description: 'Secondary button variant' },
        { name: '.thread-headline', description: 'Serif headline with text shadow' },
        { name: '.thread-label', description: 'Monospace micro-labels' },
        { name: '.thread-content', description: 'Enhanced content typography' }
      ],
      example: `/* Customize thread components */
.thread-module {
  background: linear-gradient(145deg, #ffffff, #f0f0f0) !important;
  border: none !important;
  border-radius: 15px !important;
  box-shadow: 
    20px 20px 60px #d0d0d0,
    -20px -20px 60px #ffffff !important;
}

.thread-button {
  background: linear-gradient(135deg, #ff69b4, #ff1493) !important;
  color: #fff !important;
  border: 3px solid #000 !important;
  box-shadow: 4px 4px 0px #000 !important;
  text-transform: uppercase !important;
  font-weight: bold !important;
}

.thread-headline {
  background: linear-gradient(45deg, #ff6b6b, #4ecdc4) !important;
  background-clip: text !important;
  -webkit-text-fill-color: transparent !important;
  font-size: 3rem !important;
}`,
      preview: (
        <div className="space-y-3">
          <div className="bg-cream-100 border border-sage-300 rounded-lg p-3 shadow-lg">
            <div className="font-serif text-pine-700 font-bold mb-2">Thread Module</div>
            <div className="bg-cream-200 border border-sage-300 px-3 py-1 rounded text-sm inline-block">Thread Button</div>
          </div>
        </div>
      )
    },
    {
      name: 'Layout Utilities',
      description: 'Layout and spacing utilities',
      classes: [
        { name: '.line-clamp-2', description: 'Clamp text to 2 lines with ellipsis' },
        { name: '.line-clamp-3', description: 'Clamp text to 3 lines with ellipsis' },
        { name: '.site-layout', description: 'Overall page container' },
        { name: '.site-main', description: 'Main content area' },
        { name: '.site-footer', description: 'Site footer area' },
        { name: '.footer-tagline', description: 'Footer tagline text' },
        { name: '.footer-copyright', description: 'Copyright text' }
      ],
      example: `/* Matrix/terminal theme */
.site-layout {
  background: #000 !important;
  color: #00ff00 !important;
  font-family: "Courier New", monospace !important;
}

.site-header {
  background: #000 !important;
  border-bottom: 2px solid #00ff00 !important;
}

.site-title {
  color: #00ff00 !important;
  text-shadow: 0 0 10px #00ff00 !important;
  animation: glow 2s ease-in-out infinite alternate !important;
}

@keyframes glow {
  from { text-shadow: 0 0 5px #00ff00; }
  to { text-shadow: 0 0 25px #00ff00; }
}`,
      preview: (
        <div className="bg-black text-green-400 p-3 rounded font-mono text-xs">
          <div className="border-b border-green-400 mb-2 pb-1">THREADSTEAD TERMINAL</div>
          <div>&gt; Welcome to the matrix_</div>
        </div>
      )
    }
  ],
  'colors-themes': [
    {
      name: 'ThreadStead Color Palette',
      description: 'Official color classes from the ThreadStead design system',
      classes: [
        { name: 'bg-thread-cream', description: 'Warm cream background (#F5E9D4)' },
        { name: 'bg-thread-sage', description: 'Muted sage background (#A18463)' },
        { name: 'bg-thread-pine', description: 'Deep pine background (#2E4B3F)' },
        { name: 'bg-thread-sky', description: 'Soft sky blue background (#8EC5E8)' },
        { name: 'bg-thread-meadow', description: 'Fresh meadow green background (#4FAF6D)' },
        { name: 'bg-thread-sunset', description: 'Warm sunset coral background (#E27D60)' },
        { name: 'bg-thread-paper', description: 'Off-white paper background (#FCFAF7)' },
        { name: 'bg-thread-stone', description: 'Mid gray background (#B8B8B8)' },
        { name: 'bg-thread-charcoal', description: 'Dark charcoal background (#2F2F2F)' }
      ],
      example: `/* Using ThreadStead colors */
.profile-header {
  background: linear-gradient(135deg, 
    rgb(46, 75, 63), /* thread-pine */
    rgb(161, 132, 99) /* thread-sage */
  ) !important;
  color: rgb(252, 250, 247) !important; /* thread-paper */
}

.blog-post-card {
  background: rgb(245, 233, 212) !important; /* thread-cream */
  border: 2px solid rgb(46, 75, 63) !important; /* thread-pine */
  border-radius: 12px !important;
}

.thread-button {
  background: rgb(142, 197, 232) !important; /* thread-sky */
  color: rgb(47, 47, 47) !important; /* thread-charcoal */
  border: 1px solid rgb(161, 132, 99) !important; /* thread-sage */
}`,
      preview: (
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="bg-thread-cream p-2 rounded text-center border">Cream</div>
          <div className="bg-thread-sage p-2 rounded text-center text-white">Sage</div>
          <div className="bg-thread-pine p-2 rounded text-center text-white">Pine</div>
          <div className="bg-thread-sky p-2 rounded text-center">Sky</div>
          <div className="bg-thread-meadow p-2 rounded text-center text-white">Meadow</div>
          <div className="bg-thread-sunset p-2 rounded text-center text-white">Sunset</div>
        </div>
      )
    },
    {
      name: 'Text Colors',
      description: 'Text color utilities using ThreadStead palette',
      classes: [
        { name: 'text-thread-cream', description: 'Warm cream text' },
        { name: 'text-thread-sage', description: 'Muted sage text' },
        { name: 'text-thread-pine', description: 'Deep pine text' },
        { name: 'text-thread-sky', description: 'Soft sky blue text' },
        { name: 'text-thread-meadow', description: 'Fresh meadow green text' },
        { name: 'text-thread-sunset', description: 'Warm sunset coral text' },
        { name: 'text-thread-paper', description: 'Off-white paper text' },
        { name: 'text-thread-stone', description: 'Mid gray text' },
        { name: 'text-thread-charcoal', description: 'Dark charcoal text' }
      ],
      example: `/* Text color examples */
.profile-display-name {
  color: rgb(46, 75, 63) !important; /* text-thread-pine */
  font-weight: bold !important;
}

.profile-bio {
  color: rgb(161, 132, 99) !important; /* text-thread-sage */
  font-style: italic !important;
}

.blog-post-title {
  color: rgb(47, 47, 47) !important; /* text-thread-charcoal */
  font-size: 1.5rem !important;
}

.meta-text {
  color: rgb(184, 184, 184) !important; /* text-thread-stone */
  font-size: 0.875rem !important;
}`,
      preview: (
        <div className="space-y-2 text-sm">
          <div className="text-thread-pine font-bold">Pine Green Heading</div>
          <div className="text-thread-sage">Sage muted text</div>
          <div className="text-thread-charcoal">Charcoal body text</div>
          <div className="text-thread-stone">Stone meta text</div>
        </div>
      )
    },
    {
      name: 'Border Colors',
      description: 'Border color utilities',
      classes: [
        { name: 'border-thread-cream', description: 'Warm cream border' },
        { name: 'border-thread-sage', description: 'Muted sage border' },
        { name: 'border-thread-pine', description: 'Deep pine border' },
        { name: 'border-thread-sky', description: 'Soft sky blue border' },
        { name: 'border-thread-meadow', description: 'Fresh meadow green border' },
        { name: 'border-thread-sunset', description: 'Warm sunset coral border' },
        { name: 'border-thread-paper', description: 'Off-white paper border' },
        { name: 'border-thread-stone', description: 'Mid gray border' },
        { name: 'border-thread-charcoal', description: 'Dark charcoal border' }
      ],
      example: `/* Border styling examples */
.profile-container {
  border: 3px solid rgb(161, 132, 99) !important; /* border-thread-sage */
  border-radius: 12px !important;
}

.blog-post-card {
  border-left: 4px solid rgb(46, 75, 63) !important; /* border-thread-pine */
  border-radius: 8px !important;
}

.thread-module {
  border: 1px solid rgb(226, 125, 96) !important; /* border-thread-sunset */
  box-shadow: 3px 3px 0 rgb(226, 125, 96) !important;
}`,
      preview: (
        <div className="space-y-2">
          <div className="border-2 border-thread-sage p-2 rounded text-xs">Sage Border</div>
          <div className="border-l-4 border-thread-pine p-2 text-xs">Pine Left Border</div>
          <div className="border border-thread-sunset p-2 rounded text-xs">Sunset Border</div>
        </div>
      )
    }
  ],
  'typography': [
    {
      name: 'Content Typography',
      description: 'Text content and formatting classes',
      classes: [
        { name: '.thread-content h1', description: 'Large heading (1.5rem)' },
        { name: '.thread-content h2', description: 'Medium heading (1.25rem)' },
        { name: '.thread-content h3', description: 'Small heading (1.125rem)' },
        { name: '.thread-content p', description: 'Paragraph with enhanced line-height' },
        { name: '.thread-content blockquote', description: 'Styled blockquotes with border' },
        { name: '.thread-content code', description: 'Inline code styling' },
        { name: '.thread-content pre', description: 'Code block styling' }
      ],
      example: `/* Custom typography styles */
.thread-content h1 {
  font-size: 3rem !important;
  background: linear-gradient(45deg, #ff6b6b, #4ecdc4) !important;
  background-clip: text !important;
  -webkit-text-fill-color: transparent !important;
  text-align: center !important;
  margin-bottom: 2rem !important;
}

.thread-content blockquote {
  background: linear-gradient(90deg, #f8f9fa, #e9ecef) !important;
  border-left: 5px solid #007bff !important;
  font-style: italic !important;
  font-size: 1.1rem !important;
  padding: 1.5rem !important;
  border-radius: 8px !important;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1) !important;
}

.thread-content code {
  background: #282c34 !important;
  color: #61dafb !important;
  padding: 0.25rem 0.5rem !important;
  border-radius: 4px !important;
  font-family: 'Fira Code', monospace !important;
}`,
      preview: (
        <div className="space-y-3 text-sm">
          <div className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            Gradient Heading
          </div>
          <blockquote className="border-l-4 border-blue-500 pl-4 italic bg-gray-50 p-2">
            &quot;This is a styled blockquote&quot;
          </blockquote>
          <code className="bg-gray-800 text-blue-300 px-2 py-1 rounded text-xs">inline code</code>
        </div>
      )
    },
    {
      name: 'Font Families',
      description: 'Typography system font stacks',
      classes: [
        { name: 'font-headline', description: 'Georgia, serif for headlines' },
        { name: 'font-body', description: 'System UI sans-serif for body text' },
        { name: 'font-mono', description: 'Monospace for code and labels' },
        { name: 'font-retro', description: 'Legacy Georgia serif' }
      ],
      example: `/* Font family examples */
.custom-headline {
  font-family: Georgia, "Times New Roman", serif !important;
  font-size: 2.5rem !important;
  font-weight: bold !important;
  color: #2E4B3F !important;
}

.custom-body {
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
  line-height: 1.7 !important;
  color: #2F2F2F !important;
}

.custom-code {
  font-family: Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace !important;
  background: rgba(161, 132, 99, 0.1) !important;
  padding: 0.5rem !important;
  border-radius: 4px !important;
}`,
      preview: (
        <div className="space-y-2">
          <div className="font-serif text-lg font-bold">Headline Font (Georgia)</div>
          <div className="font-sans">Body Font (System UI)</div>
          <div className="font-mono text-sm bg-gray-100 p-1 rounded">Monospace Font</div>
        </div>
      )
    }
  ],
  'layout-responsive': [
    {
      name: 'Shadow Utilities',
      description: 'Custom shadow styles for ThreadStead design',
      classes: [
        { name: 'shadow-cozy', description: 'Warm sage shadow (3px 3px 0 #A18463)' },
        { name: 'shadow-cozySm', description: 'Small warm shadow (2px 2px 0 #A18463)' },
        { name: 'shadow-thread', description: 'Soft pine shadow with blur' },
        { name: 'shadow-retro', description: 'Retro box shadow (4px 4px 0 #A18463)' },
        { name: 'shadow-retroSm', description: 'Small retro shadow (2px 2px 0 #A18463)' }
      ],
      example: `/* Creative shadow combinations */
.floating-card {
  background: white !important;
  border-radius: 12px !important;
  padding: 2rem !important;
  box-shadow: 
    0 10px 25px rgba(0,0,0,0.1),
    0 20px 48px rgba(0,0,0,0.1),
    0 1px 4px rgba(0,0,0,0.1) !important;
  transform: translateY(-2px) !important;
}

.retro-button {
  background: #ffff00 !important;
  border: 3px solid #000 !important;
  box-shadow: 4px 4px 0 #000 !important;
  transition: all 0.1s ease !important;
}

.retro-button:hover {
  transform: translate(2px, 2px) !important;
  box-shadow: 2px 2px 0 #000 !important;
}`,
      preview: (
        <div className="space-y-3">
          <div className="bg-white p-3 rounded-lg shadow-lg transform -translate-y-1 text-xs">
            Floating Card Effect
          </div>
          <div className="bg-yellow-400 border-2 border-black px-3 py-1 text-xs font-bold inline-block shadow-lg">
            Retro Button
          </div>
        </div>
      )
    },
    {
      name: 'Border Radius',
      description: 'Consistent border radius utilities',
      classes: [
        { name: 'rounded-cozy', description: 'Cozy border radius (8px)' },
        { name: 'rounded-thread', description: 'Thread border radius (12px)' }
      ],
      example: `/* Border radius examples */
.cozy-container {
  background: #F5E9D4 !important;
  border: 1px solid #A18463 !important;
  border-radius: 8px !important; /* rounded-cozy */
  padding: 1rem !important;
}

.thread-container {
  background: #FCFAF7 !important;
  border: 1px solid #2E4B3F !important;
  border-radius: 12px !important; /* rounded-thread */
  padding: 1.5rem !important;
  box-shadow: 0 4px 8px rgba(46, 75, 63, 0.15) !important;
}`,
      preview: (
        <div className="space-y-2">
          <div className="bg-thread-cream border border-thread-sage rounded-cozy p-2 text-xs">
            Cozy Radius (8px)
          </div>
          <div className="bg-thread-paper border border-thread-pine rounded-thread p-2 text-xs">
            Thread Radius (12px)
          </div>
        </div>
      )
    },
    {
      name: 'Responsive Breakpoints',
      description: 'Mobile-first responsive design guidance',
      classes: [
        { name: '@media (max-width: 767px)', description: 'Mobile devices' },
        { name: '@media (min-width: 768px) and (max-width: 1023px)', description: 'Tablet devices' },
        { name: '@media (min-width: 1024px)', description: 'Desktop devices' },
        { name: '@media (hover: none) and (pointer: coarse)', description: 'Touch devices' }
      ],
      example: `/* Responsive design examples */
.responsive-container {
  padding: 1rem !important;
  margin: 0 auto !important;
}

/* Mobile */
@media (max-width: 767px) {
  .responsive-container {
    padding: 0.5rem !important;
    font-size: 0.875rem !important;
  }
  
  .thread-module {
    min-width: 280px !important;
    max-width: 100% !important;
  }
  
  .profile-display-name {
    font-size: 1.75rem !important;
  }
}

/* Tablet */
@media (min-width: 768px) and (max-width: 1023px) {
  .responsive-container {
    padding: 1.5rem 2rem !important;
  }
}

/* Desktop */
@media (min-width: 1024px) {
  .responsive-container {
    padding: 2rem !important;
    max-width: 1200px !important;
  }
}`,
      preview: (
        <div className="space-y-2 text-xs">
          <div className="bg-blue-100 p-2 rounded">📱 Mobile: padding: 0.5rem</div>
          <div className="bg-green-100 p-2 rounded">📟 Tablet: padding: 1.5rem</div>
          <div className="bg-purple-100 p-2 rounded">🖥️ Desktop: padding: 2rem</div>
        </div>
      )
    }
  ]
};

export default function DesignCSSTutorialPage() {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState('profile-structure');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  // Get active category data
  const activeData = cssCategories.find(cat => cat.id === activeCategory);
  const sections = cssData[activeCategory as keyof typeof cssData] || [];

  // Toggle section expansion
  const toggleSection = (sectionIndex: number) => {
    const sectionKey = `${activeCategory}-${sectionIndex}`;
    const newExpanded = new Set(expandedSections);
    
    if (newExpanded.has(sectionKey)) {
      newExpanded.delete(sectionKey);
    } else {
      newExpanded.add(sectionKey);
    }
    
    setExpandedSections(newExpanded);
  };

  // Reset expanded sections when category changes
  const handleCategoryChange = (categoryId: string) => {
    setActiveCategory(categoryId);
    setExpandedSections(new Set()); // Collapse all sections when switching categories
  };

  return (
    <Layout>
      <Head>
        <title>CSS Classes Guide - ThreadStead Design Tutorial</title>
        <meta name="description" content="Complete guide to ThreadStead CSS classes for customizing profile pages" />
      </Head>
      
      <div className="min-h-screen bg-yellow-50 bg-pattern">
        {/* Add retro background pattern */}
        <style jsx global>{`
          .bg-pattern {
            background-image: 
              radial-gradient(circle at 25px 25px, rgba(255,255,255,.2) 2px, transparent 0),
              radial-gradient(circle at 75px 75px, rgba(255,255,255,.2) 2px, transparent 0);
            background-size: 100px 100px;
          }
        `}</style>
        
        <div className="w-full px-6 py-12">
          {/* Header */}
          <div className="text-center mb-12">
            {/* Main Title */}
            <div className="relative mb-8">
              <div className="inline-block bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 p-2 border-4 border-black shadow-[12px_12px_0_#000] transform -rotate-1">
                <h1 className="text-5xl font-black text-black px-6 py-4 bg-white border-4 border-black">
                  🎯 CSS CLASSES
                  <br />
                  <span className="text-3xl">GUIDE</span>
                </h1>
              </div>
              
              {/* Decorative elements */}
              <div className="absolute -top-4 -right-4 w-8 h-8 bg-green-400 border-4 border-black rotate-45"></div>
              <div className="absolute -bottom-2 -left-6 w-6 h-6 bg-pink-400 border-4 border-black rounded-full"></div>
            </div>

            {/* Subtitle */}
            <div className="max-w-4xl mx-auto">
              <div className="bg-yellow-100 border-4 border-black shadow-[6px_6px_0_#000] p-6 transform rotate-1">
                <p className="text-xl text-gray-800 font-medium leading-relaxed">
                  🎨 Master ThreadStead styling with our comprehensive CSS class reference! 
                  Target these classes to completely customize your profile page design.
                </p>
              </div>
            </div>

            {/* Quick tips */}
            <div className="mt-8 grid md:grid-cols-3 gap-4 max-w-4xl mx-auto">
              <div className="bg-green-200 border-4 border-black shadow-[4px_4px_0_#000] p-4">
                <div className="text-2xl mb-2">🎯</div>
                <div className="font-bold text-black">Target Classes</div>
                <div className="text-sm text-gray-700">Use specific CSS selectors</div>
              </div>
              <div className="bg-pink-200 border-4 border-black shadow-[4px_4px_0_#000] p-4">
                <div className="text-2xl mb-2">🎨</div>
                <div className="font-bold text-black">Override Styles</div>
                <div className="text-sm text-gray-700">Use !important for control</div>
              </div>
              <div className="bg-cyan-200 border-4 border-black shadow-[4px_4px_0_#000] p-4">
                <div className="text-2xl mb-2">📱</div>
                <div className="font-bold text-black">Mobile Ready</div>
                <div className="text-sm text-gray-700">Responsive design tips</div>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="bg-blue-300 border-4 border-black shadow-[8px_8px_0_#000] p-6 mb-8">
            <h2 className="font-bold text-black text-lg mb-4 text-center">
              🎮 Choose Your CSS Category
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {cssCategories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => handleCategoryChange(category.id)}
                  className={`p-4 border-4 border-black font-bold transition-all transform hover:scale-105 text-center ${
                    activeCategory === category.id
                      ? 'bg-yellow-300 text-black shadow-[4px_4px_0_#000] scale-105'
                      : 'bg-white text-gray-700 hover:bg-gray-100 shadow-[2px_2px_0_#000]'
                  }`}
                >
                  <div className="text-3xl mb-2">{category.icon}</div>
                  <h3 className="font-semibold text-sm mb-1">{category.title}</h3>
                  <p className="text-xs opacity-80">{category.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Active Category Content */}
          {activeData && (
            <div className="space-y-8">
              {/* Category Header */}
              <div className="text-center mb-12">
                <div className="inline-block bg-red-400 border-4 border-black shadow-[8px_8px_0_#000] p-6 transform rotate-1">
                  <div className="text-6xl mb-4">{activeData.icon}</div>
                  <h2 className="text-4xl font-black text-black mb-2">
                    {activeData.title}
                  </h2>
                  <p className="text-lg text-gray-800 font-medium">{activeData.description}</p>
                </div>
              </div>

              {/* Sections */}
              <div className="space-y-8">
                {sections.map((section, index) => {
                  const sectionKey = `${activeCategory}-${index}`;
                  const isExpanded = expandedSections.has(sectionKey);
                  
                  return (
                    <div key={index} className="bg-white border-4 border-black shadow-[6px_6px_0_#000] transform hover:scale-[1.02] transition-transform">
                      {/* Collapsible Header */}
                      <button
                        onClick={() => toggleSection(index)}
                        className="w-full text-left p-6 hover:bg-gray-50 transition-colors border-b-4 border-black"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-2xl font-black text-black mb-2">
                              {section.name}
                            </h3>
                            <p className="text-gray-700">{section.description}</p>
                          </div>
                          <div className="text-3xl font-bold text-black transform transition-transform duration-200" 
                               style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>
                            ▶
                          </div>
                        </div>
                      </button>

                      {/* Collapsible Content */}
                      {isExpanded && (
                        <div className="p-8 grid lg:grid-cols-2 gap-8 animate-in slide-in-from-top-5 duration-300">
                          {/* Left: Info and Classes */}
                          <div>
                            {/* CSS Classes List */}
                            {section.classes && (
                              <div className="space-y-3">
                                <h4 className="font-bold text-black text-lg">🎯 Available Classes</h4>
                                <div className="space-y-2">
                                  {section.classes.map((cls, clsIndex) => (
                                    <div key={clsIndex} className="bg-yellow-100 border-2 border-black p-3 shadow-[2px_2px_0_#000]">
                                      <code className="font-mono text-black font-bold">{cls.name}</code>
                                      <p className="text-sm text-gray-700 mt-1">{cls.description}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Right: Example and Preview */}
                          <div className="space-y-6">
                            {/* Preview */}
                            {section.preview && (
                              <div>
                                <h4 className="font-bold text-black text-lg mb-3">👁️ Preview</h4>
                                <div className="bg-gray-50 border-2 border-black p-4 shadow-[2px_2px_0_#000]">
                                  {section.preview}
                                </div>
                              </div>
                            )}

                            {/* Code Example */}
                            <div>
                              <h4 className="font-bold text-black text-lg mb-3">💻 Example CSS</h4>
                              <div className="bg-black text-green-400 border-2 border-black p-4 overflow-x-auto shadow-[2px_2px_0_#000]">
                                <pre className="text-sm font-mono">
                                  <code>{section.example}</code>
                                </pre>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        <RetroFooter isCSSPage />
        </div>
      </div>
    </Layout>
  );
}