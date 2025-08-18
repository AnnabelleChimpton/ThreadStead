import React from 'react';

export const componentCategories = [
  {
    id: 'content',
    title: 'Content',
    icon: '📝',
    description: 'Display your personal information, posts, and media with style'
  },
  {
    id: 'layout',
    title: 'Layout',
    icon: '🏗️',
    description: 'Structure and organize your content with flexible containers'
  },
  {
    id: 'visual',
    title: 'Visual',
    icon: '🎨',
    description: 'Eye-catching design elements and visual effects'
  },
  {
    id: 'interactive',
    title: 'Interactive',
    icon: '⚡',
    description: 'Dynamic components that respond and engage'
  }
];

export const componentData = {
  content: [
    {
      name: 'DisplayName',
      description: 'Shows your display name with customizable styling and element type',
      props: [
        { name: 'as', type: 'string', options: ['h1', 'h2', 'h3', 'h4', 'div', 'span', 'p'], default: 'h2', description: 'HTML element to render as' },
        { name: 'showLabel', type: 'boolean', options: ['true', 'false'], default: 'false', description: 'Show "Name:" label before display name' },
        { name: 'className', type: 'string', options: ['any CSS classes'], default: 'none', description: 'Custom CSS classes to apply' }
      ],
      example: `<DisplayName as="h1" />
<DisplayName as="span" showLabel="true" />
<DisplayName as="h3" class="text-4xl font-bold" />
<DisplayName as="div" class="custom-style" showLabel="true" />`,
      preview: <div className="font-bold text-xl text-purple-600">Your Name</div>,
      stylingGuide: {
        classes: [
          {
            name: '.ts-profile-display-name',
            description: 'Main display name element'
          }
        ],
        examples: [
          {
            title: 'Rainbow Gradient Text',
            css: `.ts-profile-display-name {
  background: linear-gradient(45deg, #ff6b6b, #4ecdc4, #45b7d1) !important;
  background-clip: text !important;
  -webkit-text-fill-color: transparent !important;
  font-size: 4rem !important;
}`
          },
          {
            title: 'Glowing Neon Effect',
            css: `.ts-profile-display-name {
  color: #00ffff !important;
  text-shadow: 0 0 10px #00ffff, 0 0 20px #00ffff !important;
  font-family: monospace !important;
  animation: glow 2s ease-in-out infinite alternate !important;
}

@keyframes glow {
  from { text-shadow: 0 0 5px #00ffff; }
  to { text-shadow: 0 0 25px #00ffff; }
}`
          }
        ]
      }
    },
    {
      name: 'Bio',
      description: 'Display your bio/about section with optional heading customization',
      props: [
        { name: 'className', type: 'string', options: ['any CSS classes'], default: 'none', description: 'Custom CSS classes to apply to bio section' },
        { name: 'hideHeading', type: 'boolean', options: ['true', 'false'], default: 'false', description: 'Hide the "About Me" heading' },
        { name: 'headingText', type: 'string', options: ['any text'], default: 'About Me', description: 'Custom heading text' }
      ],
      example: `<Bio />
<Bio class="custom-bio" />
<Bio hideHeading="true" />
<Bio headingText="My Story" class="italic" />`,
      preview: (
        <div className="text-sm">
          <div className="font-semibold mb-1">About Me</div>
          <div className="text-gray-600">Welcome to my profile!</div>
        </div>
      ),
      stylingGuide: {
        classes: [
          {
            name: '.ts-profile-bio-section',
            description: 'Container for the entire bio section'
          },
          {
            name: '.ts-bio-heading',
            description: 'The "About Me" heading'
          },
          {
            name: '.ts-bio-text',
            description: 'The actual bio content text'
          }
        ],
        examples: [
          {
            title: 'Hide Heading, Style Text',
            css: `.ts-bio-heading {
  display: none !important;
}

.ts-bio-text {
  font-size: 1.5rem !important;
  color: #6b46c1 !important;
  font-style: italic !important;
  text-align: center !important;
}`
          },
          {
            title: 'Glass Card Effect',
            css: `.ts-profile-bio-section {
  background: rgba(255, 255, 255, 0.1) !important;
  backdrop-filter: blur(20px) !important;
  border: 1px solid rgba(255, 255, 255, 0.2) !important;
  border-radius: 1rem !important;
  padding: 2rem !important;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1) !important;
}

.ts-bio-text {
  color: #ffffff !important;
}`
          }
        ]
      }
    },
    {
      name: 'BlogPosts',
      description: 'Display your recent blog posts in a styled list',
      props: [
        { name: 'limit', type: 'number', options: ['1', '2', '3', '5', '10'], default: '5', description: 'Maximum number of posts to show' },
        { name: 'className', type: 'string', options: ['any CSS classes'], default: 'none', description: 'Custom CSS classes for the posts container' },
        { name: 'showDates', type: 'boolean', options: ['true', 'false'], default: 'true', description: 'Show post publication dates' },
        { name: 'sortOrder', type: 'string', options: ['newest', 'oldest'], default: 'newest', description: 'Sort posts by date' }
      ],
      example: `<BlogPosts limit="3" />
<BlogPosts limit="5" class="custom-posts" />
<BlogPosts limit="2" showDates="false" />
<BlogPosts sortOrder="oldest" class="retro-posts" />`,
      preview: (
        <div className="text-xs space-y-2">
          <div className="font-semibold">Recent Posts</div>
          <div className="bg-gray-50 p-2 rounded">
            <div className="text-gray-500 text-xs">Oct 15</div>
            <div className="font-medium">My Latest Post</div>
          </div>
        </div>
      ),
      stylingGuide: {
        classes: [
          {
            name: '.ts-blog-posts',
            description: 'Main container for blog posts'
          },
          {
            name: '.ts-blog-posts-title',
            description: 'The "Recent Posts" heading'
          },
          {
            name: '.ts-blog-posts-list',
            description: 'List wrapper for posts'
          },
          {
            name: '.ts-blog-post',
            description: 'Individual blog post card'
          },
          {
            name: '.ts-blog-post-meta',
            description: 'Post date/metadata'
          },
          {
            name: '.ts-blog-post-content',
            description: 'Post content area'
          }
        ],
        examples: [
          {
            title: 'Card Stack Effect',
            css: `.ts-blog-post {
  background: #fff3cd !important;
  border: 3px solid #000 !important;
  box-shadow: 4px 4px 0 #000 !important;
  transform: rotate(-1deg) !important;
  margin-bottom: 1rem !important;
}

.ts-blog-post:nth-child(even) {
  transform: rotate(1deg) !important;
  background: #d1ecf1 !important;
}

.ts-blog-posts-title {
  font-family: "Courier New", monospace !important;
  color: #dc3545 !important;
}`
          },
          {
            title: 'Neon Terminal Style',
            css: `.ts-blog-posts {
  background: #000 !important;
  border: 2px solid #00ff00 !important;
  padding: 1rem !important;
  font-family: monospace !important;
}

.ts-blog-posts-title {
  color: #00ff00 !important;
  text-shadow: 0 0 10px #00ff00 !important;
}

.ts-blog-post {
  background: rgba(0, 255, 0, 0.1) !important;
  border: 1px solid #00ff00 !important;
  color: #00ff00 !important;
}

.ts-blog-post-meta {
  color: #ffff00 !important;
}`
          }
        ]
      }
    },
    {
      name: 'ProfilePhoto',
      description: 'Display your profile photo with size and shape options',
      props: [
        { name: 'size', type: 'string', options: ['sm', 'md', 'lg', 'xl'], default: 'md', description: 'Photo size (sm=64px, md=96px, lg=128px, xl=192px)' },
        { name: 'shape', type: 'string', options: ['circle', 'square', 'rounded'], default: 'circle', description: 'Photo shape style' },
        { name: 'className', type: 'string', options: ['any CSS classes'], default: 'none', description: 'Custom CSS classes for photo wrapper' },
        { name: 'border', type: 'boolean', options: ['true', 'false'], default: 'true', description: 'Show decorative border' },
        { name: 'shadow', type: 'string', options: ['none', 'sm', 'md', 'lg'], default: 'sm', description: 'Drop shadow effect' }
      ],
      example: `<ProfilePhoto size="lg" shape="circle" />
<ProfilePhoto size="md" shape="square" />
<ProfilePhoto size="xl" shape="rounded" border="false" />
<ProfilePhoto class="custom-frame" shadow="lg" />`,
      preview: (
        <div className="w-16 h-16 bg-purple-200 rounded-full border-2 border-black flex items-center justify-center">
          <span className="text-xs">Photo</span>
        </div>
      ),
      stylingGuide: {
        classes: [
          {
            name: '.ts-profile-photo-wrapper',
            description: 'Container wrapper for the photo'
          },
          {
            name: '.ts-profile-photo-frame',
            description: 'Photo frame/border element'
          },
          {
            name: '.ts-profile-photo-image',
            description: 'The actual image element'
          },
          {
            name: '.ts-profile-photo-placeholder',
            description: 'Shown when no photo is set'
          }
        ],
        examples: [
          {
            title: 'Retro Polaroid Frame',
            css: `.ts-profile-photo-frame {
  background: #ffffff !important;
  border: none !important;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3) !important;
  padding: 16px !important;
  transform: rotate(-2deg) !important;
}

.ts-profile-photo-image {
  border-radius: 0 !important;
  filter: sepia(20%) contrast(120%) !important;
}`
          },
          {
            title: 'Neon Glow Border',
            css: `.ts-profile-photo-frame {
  background: transparent !important;
  border: 4px solid #ff00ff !important;
  border-radius: 50% !important;
  box-shadow: 
    0 0 20px #ff00ff,
    inset 0 0 20px #ff00ff !important;
  animation: pulse-glow 2s infinite !important;
}

@keyframes pulse-glow {
  0%, 100% { 
    box-shadow: 0 0 20px #ff00ff, inset 0 0 20px #ff00ff;
  }
  50% { 
    box-shadow: 0 0 40px #ff00ff, inset 0 0 40px #ff00ff;
  }
}`
          }
        ]
      }
    }
  ],
  layout: [
    {
      name: 'FlexContainer',
      description: 'Flexible box layouts with customizable direction, alignment, and spacing',
      props: [
        { name: 'direction', type: 'string', options: ['row', 'row-reverse', 'column', 'column-reverse'], default: 'row', description: 'Flex direction' },
        { name: 'align', type: 'string', options: ['start', 'center', 'end', 'stretch', 'baseline'], default: 'start', description: 'Cross-axis alignment' },
        { name: 'justify', type: 'string', options: ['start', 'center', 'end', 'between', 'around', 'evenly'], default: 'start', description: 'Main axis alignment' },
        { name: 'wrap', type: 'boolean', options: ['true', 'false'], default: 'false', description: 'Allow items to wrap to new lines' },
        { name: 'gap', type: 'string', options: ['none', 'sm', 'md', 'lg', 'xl'], default: 'md', description: 'Space between items' }
      ],
      example: `<FlexContainer direction="row" justify="between" gap="lg">
  <div>Left content</div>
  <div>Right content</div>
</FlexContainer>
<FlexContainer direction="column" align="center" wrap="true">
  <div>Item 1</div>
  <div>Item 2</div>
</FlexContainer>`,
      preview: (
        <div className="flex justify-between items-center gap-2 text-xs bg-blue-50 p-2 rounded">
          <div className="bg-blue-200 p-1">Left</div>
          <div className="bg-blue-200 p-1">Right</div>
        </div>
      )
    },
    {
      name: 'GridLayout',
      description: 'Responsive CSS grids with configurable columns',
      props: [
        { name: 'columns', type: 'string', options: ['1', '2', '3', '4', '5', '6', 'auto'], default: '3', description: 'Number of grid columns' },
        { name: 'gap', type: 'string', options: ['none', 'sm', 'md', 'lg', 'xl'], default: 'md', description: 'Space between grid items' },
        { name: 'responsive', type: 'boolean', options: ['true', 'false'], default: 'true', description: 'Automatically adjust columns on mobile' },
        { name: 'minItemWidth', type: 'string', options: ['200px', '250px', '300px', '350px'], default: '250px', description: 'Minimum width for grid items' }
      ],
      example: `<GridLayout columns="3" gap="md" responsive="true">
  <div>Item 1</div>
  <div>Item 2</div>
  <div>Item 3</div>
</GridLayout>
<GridLayout columns="auto" minItemWidth="300px" gap="lg">
  <div>Auto-sized item</div>
</GridLayout>`,
      preview: (
        <div className="grid grid-cols-3 gap-1 text-xs">
          <div className="bg-green-200 p-1 text-center">1</div>
          <div className="bg-green-200 p-1 text-center">2</div>
          <div className="bg-green-200 p-1 text-center">3</div>
        </div>
      )
    },
    {
      name: 'SplitLayout',
      description: 'Two-column layout with customizable proportions',
      props: [
        { name: 'split', type: 'string', options: ['50-50', '60-40', '70-30', '75-25', '80-20'], default: '50-50', description: 'Column width proportions' },
        { name: 'gap', type: 'string', options: ['none', 'sm', 'md', 'lg', 'xl'], default: 'md', description: 'Space between columns' },
        { name: 'direction', type: 'string', options: ['horizontal', 'vertical'], default: 'horizontal', description: 'Split direction' },
        { name: 'responsive', type: 'boolean', options: ['true', 'false'], default: 'true', description: 'Stack vertically on mobile' }
      ],
      example: `<SplitLayout split="60-40" gap="lg">
  <div>Main content area</div>
  <div>Sidebar content</div>
</SplitLayout>
<SplitLayout split="75-25" direction="vertical" responsive="false">
  <div>Top section</div>
  <div>Bottom section</div>
</SplitLayout>`,
      preview: (
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-yellow-200 p-2">Main</div>
          <div className="bg-yellow-100 p-2">Side</div>
        </div>
      )
    }
  ],
  visual: [
    {
      name: 'GradientBox',
      description: 'Colorful gradient containers with customizable colors',
      props: [
        { name: 'colors', type: 'string', options: ['pink-purple', 'blue-green', 'sunset', 'ocean', 'rainbow', 'neon'], default: 'blue-green', description: 'Predefined color scheme' },
        { name: 'direction', type: 'string', options: ['horizontal', 'vertical', 'diagonal', 'radial'], default: 'diagonal', description: 'Gradient direction' },
        { name: 'intensity', type: 'string', options: ['light', 'medium', 'strong'], default: 'medium', description: 'Color intensity' },
        { name: 'animated', type: 'boolean', options: ['true', 'false'], default: 'false', description: 'Animate gradient movement' }
      ],
      example: `<GradientBox colors="pink-purple" direction="diagonal">
  <p>Content with gradient background</p>
</GradientBox>
<GradientBox colors="neon" animated="true" intensity="strong">
  <p>Animated neon gradient!</p>
</GradientBox>`,
      preview: (
        <div className="bg-gradient-to-br from-pink-400 to-purple-600 p-3 text-white text-xs rounded">
          Gradient Box
        </div>
      )
    },
    {
      name: 'RetroTerminal',
      description: 'Old-school computer terminal styling',
      props: [
        { name: 'color', type: 'string', options: ['green', 'amber', 'cyan', 'white', 'red'], default: 'green', description: 'Terminal text color' },
        { name: 'title', type: 'string', options: ['any text'], default: 'Terminal', description: 'Terminal window title' },
        { name: 'prompt', type: 'string', options: ['>', '$', '#', 'C:\\>', '~$'], default: '>', description: 'Command prompt symbol' },
        { name: 'blinking', type: 'boolean', options: ['true', 'false'], default: 'true', description: 'Show blinking cursor' },
        { name: 'scanlines', type: 'boolean', options: ['true', 'false'], default: 'false', description: 'Add CRT scanline effect' }
      ],
      example: `<RetroTerminal color="green" title="My Terminal">
  <p>Welcome to my retro computer!</p>
  <p>> Type commands here_</p>
</RetroTerminal>
<RetroTerminal color="amber" prompt="C:\\>" scanlines="true">
  <p>DOS-style terminal with effects</p>
</RetroTerminal>`,
      preview: (
        <div className="bg-black text-green-400 p-2 text-xs font-mono rounded">
          <div className="border-b border-green-400 mb-1">Terminal</div>
          <div>&gt; Hello World_</div>
        </div>
      )
    }
  ],
  interactive: [
    {
      name: 'RevealBox',
      description: 'Content that shows/hides with hover or click',
      props: [
        { name: 'trigger', type: 'string', options: ['hover', 'click', 'focus'], default: 'hover', description: 'What triggers the reveal' },
        { name: 'effect', type: 'string', options: ['slide', 'fade', 'scale', 'flip'], default: 'slide', description: 'Animation effect' },
        { name: 'direction', type: 'string', options: ['up', 'down', 'left', 'right'], default: 'up', description: 'Slide direction (for slide effect)' },
        { name: 'duration', type: 'string', options: ['fast', 'normal', 'slow'], default: 'normal', description: 'Animation speed' }
      ],
      example: `<RevealBox trigger="hover" effect="slide">
  <div>Hover to reveal content!</div>
  <div>Hidden content appears here</div>
</RevealBox>
<RevealBox trigger="click" effect="flip" duration="slow">
  <div>Click me!</div>
  <div>Surprise content!</div>
</RevealBox>`,
      preview: (
        <div className="bg-orange-200 p-2 text-xs rounded cursor-pointer hover:bg-orange-300">
          Hover me!
        </div>
      )
    },
    {
      name: 'WaveText',
      description: 'Animated text with wave effects',
      props: [
        { name: 'speed', type: 'string', options: ['slow', 'normal', 'fast'], default: 'normal', description: 'Animation speed' },
        { name: 'amplitude', type: 'string', options: ['low', 'medium', 'high'], default: 'medium', description: 'Wave height/intensity' },
        { name: 'direction', type: 'string', options: ['horizontal', 'vertical', 'both'], default: 'horizontal', description: 'Wave movement direction' },
        { name: 'color', type: 'string', options: ['rainbow', 'gradient', 'solid'], default: 'solid', description: 'Text color style' },
        { name: 'trigger', type: 'string', options: ['always', 'hover', 'visible'], default: 'always', description: 'When to animate' }
      ],
      example: `<WaveText speed="slow" amplitude="high">
  This text waves around!
</WaveText>
<WaveText color="rainbow" direction="both" trigger="hover">
  Hover for rainbow waves!
</WaveText>`,
      preview: (
        <div className="text-xs text-blue-600 animate-pulse">
          ~ Wave Text ~
        </div>
      )
    }
  ]
};