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
  },
  {
    id: 'utility',
    title: 'Utility',
    icon: '🔧',
    description: 'Helper components for data display, navigation, and conditional rendering'
  },
  {
    id: 'css-classes',
    title: 'CSS Classes',
    icon: '🎯',
    description: 'Target these CSS classes to style the default profile layout'
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
      name: 'ProfileHero',
      description: 'Hero section with profile photo, name, and social links in one container',
      props: [
        { name: 'layout', type: 'string', options: ['horizontal', 'vertical'], default: 'horizontal', description: 'Layout direction' },
        { name: 'showBio', type: 'boolean', options: ['true', 'false'], default: 'true', description: 'Include bio in hero section' },
        { name: 'className', type: 'string', options: ['any CSS classes'], default: 'none', description: 'Custom CSS classes' }
      ],
      example: `<ProfileHero layout="horizontal" showBio="true" />
<ProfileHero layout="vertical" class="hero-style" />
<ProfileHero showBio="false" />`,
      preview: (
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 rounded-lg text-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-blue-500 text-xs font-bold">
              Photo
            </div>
            <div>
              <div className="font-bold">Profile Hero</div>
              <div className="text-blue-100 text-xs">Bio and social links</div>
            </div>
          </div>
        </div>
      )
    },
    {
      name: 'UserImage', 
      description: 'Display user profile image with fallback and customization options',
      props: [
        { name: 'size', type: 'string', options: ['xs', 'sm', 'md', 'lg', 'xl'], default: 'md', description: 'Image size' },
        { name: 'shape', type: 'string', options: ['circle', 'square', 'rounded'], default: 'circle', description: 'Image shape' },
        { name: 'showStatus', type: 'boolean', options: ['true', 'false'], default: 'false', description: 'Show online status indicator' }
      ],
      example: `<UserImage size="lg" shape="circle" />
<UserImage size="sm" shape="square" showStatus="true" />
<UserImage size="xl" shape="rounded" />`,
      preview: (
        <div className="w-10 h-10 bg-indigo-200 rounded-full border-2 border-gray-300 flex items-center justify-center">
          <span className="text-xs">UI</span>
        </div>
      )
    },
    {
      name: 'UserAccount',
      description: 'User account information display with handle, join date, and status',
      props: [
        { name: 'showJoinDate', type: 'boolean', options: ['true', 'false'], default: 'true', description: 'Display account creation date' },
        { name: 'showHandle', type: 'boolean', options: ['true', 'false'], default: 'true', description: 'Show user handle' },
        { name: 'format', type: 'string', options: ['compact', 'detailed'], default: 'compact', description: 'Information density' }
      ],
      example: `<UserAccount showJoinDate="true" showHandle="true" />
<UserAccount format="detailed" />
<UserAccount format="compact" showJoinDate="false" />`,
      preview: (
        <div className="text-sm space-y-1">
          <div className="text-gray-600">@username</div>
          <div className="text-xs text-gray-500">Joined Oct 2024</div>
        </div>
      )
    },
    {
      name: 'Guestbook',
      description: 'Interactive guestbook for visitors to leave messages',
      props: [
        { name: 'maxEntries', type: 'number', options: ['5', '10', '20', '50'], default: '10', description: 'Maximum entries to display' },
        { name: 'allowAnonymous', type: 'boolean', options: ['true', 'false'], default: 'false', description: 'Allow anonymous posts' },
        { name: 'showDates', type: 'boolean', options: ['true', 'false'], default: 'true', description: 'Show post dates' }
      ],
      example: `<Guestbook maxEntries="10" allowAnonymous="false" />
<Guestbook maxEntries="20" showDates="false" />
<Guestbook allowAnonymous="true" class="custom-guestbook" />`,
      preview: (
        <div className="border border-gray-200 rounded p-3 text-sm">
          <div className="font-semibold mb-2">Sign My Guestbook!</div>
          <div className="bg-yellow-50 p-2 rounded mb-2 text-xs">
            <div className="font-medium">Visitor says:</div>
            <div className="text-gray-600">Great profile! 👍</div>
          </div>
          <button className="bg-blue-500 text-white text-xs px-3 py-1 rounded">Add Entry</button>
        </div>
      )
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
      name: 'CenteredBox',
      description: 'Center content with configurable max width and padding',
      props: [
        { name: 'maxWidth', type: 'string', options: ['sm', 'md', 'lg', 'xl', '2xl', 'full'], default: 'lg', description: 'Maximum container width' },
        { name: 'padding', type: 'string', options: ['xs', 'sm', 'md', 'lg', 'xl'], default: 'md', description: 'Inner padding amount' }
      ],
      example: `<CenteredBox maxWidth="lg" padding="md">
  <p>This content is centered and constrained to a max width</p>
</CenteredBox>
<CenteredBox maxWidth="sm" padding="xl">
  <div>Narrow, well-padded content</div>
</CenteredBox>`,
      preview: (
        <div className="max-w-sm mx-auto bg-green-50 p-3 text-center text-xs rounded border border-green-200">
          <div>Centered Content</div>
        </div>
      )
    },
    {
      name: 'Breadcrumb',
      description: 'Automatic breadcrumb navigation based on current route',
      props: [
        { name: 'separator', type: 'string', options: ['>', '/', '›', '•'], default: '›', description: 'Separator character between links' },
        { name: 'maxItems', type: 'number', options: ['3', '5', '7'], default: '5', description: 'Maximum breadcrumb items to show' }
      ],
      example: `<Breadcrumb />
<Breadcrumb separator="/" />
<Breadcrumb maxItems="3" separator="•" />`,
      preview: (
        <nav className="text-xs text-gray-600">
          <span className="text-blue-600 hover:underline cursor-pointer">Home</span>
          <span className="mx-2">›</span>
          <span className="text-blue-600 hover:underline cursor-pointer">Profile</span>
          <span className="mx-2">›</span>
          <span className="font-medium text-gray-800">Current Page</span>
        </nav>
      )
    },
    {
      name: 'GridLayout',
      description: 'Responsive CSS grids with configurable columns',
      props: [
        { name: 'columns', type: 'string', options: [], default: '', description: 'Number of columns in the grid' },
        { name: 'gap', type: 'string', options: [], default: '', description: 'Gap between grid items' },
        { name: 'responsive', type: 'boolean', options: ['true', 'false'], default: 'true', description: 'Enable responsive layout' }
      ],
      example: `<GridLayout columns="3" gap="md" responsive="true">
  <div>Item 1</div>
  <div>Item 2</div>
  <div>Item 3</div>
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
        { name: 'split', type: 'string', options: [], default: '', description: '' },
        { name: 'gap', type: 'string', options: [], default: '', description: '' }
      ],
      example: `<SplitLayout split="60-40" gap="lg">
  <div>Main content area</div>
  <div>Sidebar content</div>
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
        { name: 'colors', type: 'string', options: ['pink-purple', 'blue-green', 'yellow-orange', 'cyan-blue'], default: 'pink-purple', description: 'Gradient color scheme' },
        { name: 'direction', type: 'string', options: ['to-r', 'to-l', 'to-t', 'to-b', 'to-br', 'to-bl'], default: 'to-br', description: 'Gradient direction' }
      ],
      example: `<GradientBox colors="pink-purple" direction="diagonal">
  <p>Content with gradient background</p>
</GradientBox>`,
      preview: (
        <div className="bg-gradient-to-br from-pink-400 to-purple-600 p-3 text-white text-xs rounded">
          Gradient Box
        </div>
      )
    },
    {
      name: 'NeonBorder',
      description: 'Glowing neon border effects with customizable colors and intensity',
      props: [
        { name: 'color', type: 'string', options: ['blue', 'pink', 'green', 'purple', 'cyan', 'yellow'], default: 'blue', description: 'Neon glow color' },
        { name: 'intensity', type: 'string', options: ['soft', 'medium', 'bright'], default: 'medium', description: 'Glow intensity' },
        { name: 'padding', type: 'string', options: ['xs', 'sm', 'md', 'lg', 'xl'], default: 'md', description: 'Inner padding' },
        { name: 'rounded', type: 'boolean', options: ['true', 'false'], default: 'true', description: 'Rounded corners' }
      ],
      example: `<NeonBorder color="cyan" intensity="bright">
  <p>Glowing content!</p>
</NeonBorder>
<NeonBorder color="pink" intensity="soft" rounded="false">
  <div>Sharp neon box</div>
</NeonBorder>`,
      preview: (
        <div className="neon-box-shadow border-2 border-cyan-400 p-3 text-xs rounded">
          <span className="text-cyan-400">Neon Border</span>
        </div>
      )
    },
    {
      name: 'GlitchText',
      description: 'Animated glitch text effect with customizable colors and intensity',
      props: [
        { name: 'text', type: 'string', options: ['any text'], default: 'Glitch Text', description: 'Text to animate' },
        { name: 'intensity', type: 'string', options: ['low', 'medium', 'high'], default: 'medium', description: 'Animation intensity' },
        { name: 'color', type: 'string', options: ['any color'], default: 'currentColor', description: 'Main text color' },
        { name: 'glitchColor1', type: 'string', options: ['any color'], default: '#ff0000', description: 'First glitch color' },
        { name: 'glitchColor2', type: 'string', options: ['any color'], default: '#00ffff', description: 'Second glitch color' }
      ],
      example: `<GlitchText text="GLITCH ME" intensity="high" />
<GlitchText text="Subtle Effect" intensity="low" />
<GlitchText text="Custom Colors" glitchColor1="#ff00ff" glitchColor2="#00ff00" />`,
      preview: (
        <div className="text-sm font-bold animate-pulse text-red-500">
          GLITCH TEXT
        </div>
      )
    },
    {
      name: 'PolaroidFrame',
      description: 'Retro polaroid-style photo frame with rotation and customization',
      props: [
        { name: 'rotation', type: 'string', options: ['none', 'slight', 'medium', 'random'], default: 'slight', description: 'Frame rotation angle' },
        { name: 'shadow', type: 'boolean', options: ['true', 'false'], default: 'true', description: 'Drop shadow effect' },
        { name: 'caption', type: 'string', options: ['any text'], default: '', description: 'Bottom caption text' }
      ],
      example: `<PolaroidFrame rotation="medium" caption="Summer 2024">
  <img src="/photo.jpg" alt="My photo" />
</PolaroidFrame>
<PolaroidFrame rotation="random" shadow="true">
  <div>Any content can go here</div>
</PolaroidFrame>`,
      preview: (
        <div className="bg-white p-4 shadow-lg transform rotate-2 max-w-32">
          <div className="bg-gray-200 h-16 mb-2 flex items-center justify-center text-xs">
            Photo
          </div>
          <div className="text-xs text-center font-handwriting">Memories</div>
        </div>
      )
    },
    {
      name: 'StickyNote',
      description: 'Sticky note styling with various colors and rotation effects',
      props: [
        { name: 'color', type: 'string', options: ['yellow', 'pink', 'blue', 'green', 'orange'], default: 'yellow', description: 'Note color' },
        { name: 'size', type: 'string', options: ['sm', 'md', 'lg'], default: 'md', description: 'Note size' },
        { name: 'rotation', type: 'string', options: ['none', 'slight', 'random'], default: 'slight', description: 'Rotation angle' }
      ],
      example: `<StickyNote color="pink" rotation="slight">
  <p>Don't forget to call mom!</p>
</StickyNote>
<StickyNote color="blue" size="lg">
  <div>Important reminder here</div>
</StickyNote>`,
      preview: (
        <div className="bg-yellow-200 p-3 shadow-md transform rotate-1 max-w-24 text-xs">
          <div>Sticky Note</div>
        </div>
      )
    },
    {
      name: 'FloatingBadge',
      description: 'Floating badge that stays fixed on screen with animations',
      props: [
        { name: 'color', type: 'string', options: ['blue', 'green', 'red', 'yellow', 'purple', 'pink'], default: 'blue', description: 'Badge color' },
        { name: 'size', type: 'string', options: ['sm', 'md', 'lg'], default: 'md', description: 'Badge size' },
        { name: 'animation', type: 'string', options: ['bounce', 'pulse', 'float', 'none'], default: 'float', description: 'Animation type' },
        { name: 'position', type: 'string', options: ['top-left', 'top-right', 'bottom-left', 'bottom-right'], default: 'top-right', description: 'Screen position' }
      ],
      example: `<FloatingBadge color="red" position="top-right" animation="bounce">
  New!
</FloatingBadge>
<FloatingBadge color="green" position="bottom-left" size="lg">
  Online
</FloatingBadge>`,
      preview: (
        <div className="bg-red-500 text-white px-2 py-1 rounded-full text-xs font-semibold animate-bounce">
          New!
        </div>
      )
    },
    {
      name: 'RetroTerminal',
      description: 'Old-school computer terminal styling',
      props: [
        { name: 'color', type: 'string', options: [], default: '', description: '' },
        { name: 'title', type: 'string', options: [], default: '', description: '' }
      ],
      example: `<RetroTerminal color="green" title="My Terminal">
  <p>Welcome to my retro computer!</p>
  <p>> Type commands here_</p>
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
        { name: 'effect', type: 'string', options: ['fade', 'slide', 'scale', 'flip'], default: 'fade', description: 'Animation effect' }
      ],
      example: `<RevealBox trigger="hover" effect="slide">
  <div>Hover to reveal content!</div>
  <div>Hidden content appears here</div>
</RevealBox>`,
      preview: (
        <div className="bg-orange-200 p-2 text-xs rounded cursor-pointer hover:bg-orange-300">
          Hover me!
        </div>
      )
    },
    {
      name: 'Tabs',
      description: 'Tabbed interface for organizing content into sections',
      props: [
        { name: 'defaultTab', type: 'string', options: ['any tab name'], default: 'first', description: 'Initially active tab' },
        { name: 'orientation', type: 'string', options: ['horizontal', 'vertical'], default: 'horizontal', description: 'Tab layout direction' },
        { name: 'style', type: 'string', options: ['default', 'pills', 'underline'], default: 'default', description: 'Tab visual style' }
      ],
      example: `<Tabs defaultTab="about" style="pills">
  <Tab label="About" content="About me content..." />
  <Tab label="Projects" content="My projects..." />
  <Tab label="Contact" content="Contact info..." />
</Tabs>`,
      preview: (
        <div className="text-xs">
          <div className="flex gap-2 mb-2">
            <div className="bg-blue-500 text-white px-3 py-1 rounded">About</div>
            <div className="bg-gray-200 px-3 py-1 rounded">Projects</div>
            <div className="bg-gray-200 px-3 py-1 rounded">Contact</div>
          </div>
          <div className="bg-blue-50 p-2 rounded">Tab content goes here</div>
        </div>
      )
    },
    {
      name: 'FollowButton',
      description: 'Social follow button with different states and animations',
      props: [
        { name: 'variant', type: 'string', options: ['primary', 'secondary', 'outline'], default: 'primary', description: 'Button style variant' },
        { name: 'size', type: 'string', options: ['sm', 'md', 'lg'], default: 'md', description: 'Button size' },
        { name: 'animated', type: 'boolean', options: ['true', 'false'], default: 'true', description: 'Hover animations' }
      ],
      example: `<FollowButton variant="primary" size="md" />
<FollowButton variant="outline" animated="false" />
<FollowButton variant="secondary" size="lg" />`,
      preview: (
        <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 text-xs rounded transition-colors">
          + Follow
        </button>
      )
    },
    {
      name: 'NotificationBell',
      description: 'Notification bell icon with badge and animation options',
      props: [
        { name: 'count', type: 'number', options: ['0', '5', '10', '99+'], default: '0', description: 'Notification count' },
        { name: 'animate', type: 'boolean', options: ['true', 'false'], default: 'true', description: 'Bell shake animation' },
        { name: 'size', type: 'string', options: ['sm', 'md', 'lg'], default: 'md', description: 'Bell size' }
      ],
      example: `<NotificationBell count="5" animate="true" />
<NotificationBell count="99" size="lg" />
<NotificationBell count="0" />`,
      preview: (
        <div className="relative">
          <div className="w-6 h-6 text-gray-600">🔔</div>
          <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
            3
          </div>
        </div>
      )
    },
    {
      name: 'FriendDisplay',
      description: 'Display friends list with avatars and status indicators',
      props: [
        { name: 'layout', type: 'string', options: ['grid', 'list', 'carousel'], default: 'grid', description: 'Display layout' },
        { name: 'showStatus', type: 'boolean', options: ['true', 'false'], default: 'true', description: 'Show online status' },
        { name: 'limit', type: 'number', options: ['6', '12', '20'], default: '12', description: 'Maximum friends to show' }
      ],
      example: `<FriendDisplay layout="grid" showStatus="true" limit="12" />
<FriendDisplay layout="list" limit="6" />
<FriendDisplay layout="carousel" showStatus="false" />`,
      preview: (
        <div className="text-xs">
          <div className="font-semibold mb-2">Friends (24)</div>
          <div className="grid grid-cols-3 gap-1">
            {[1,2,3].map(i => (
              <div key={i} className="relative">
                <div className="w-8 h-8 bg-blue-200 rounded-full flex items-center justify-center text-xs">
                  {i}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full border border-white"></div>
              </div>
            ))}
          </div>
        </div>
      )
    },
    {
      name: 'WaveText',
      description: 'Animated text with wave effects',
      props: [
        { name: 'speed', type: 'string', options: [], default: '', description: '' },
        { name: 'amplitude', type: 'string', options: [], default: '', description: '' }
      ],
      example: `<WaveText speed="slow" amplitude="high">
  This text waves around!
</WaveText>`,
      preview: (
        <div className="text-xs text-blue-600 animate-pulse">
          ~ Wave Text ~
        </div>
      )
    }
  ],
  utility: [
    {
      name: 'NavigationLinks',
      description: 'Flexible navigation menu with customizable links and styling',
      props: [
        { name: 'orientation', type: 'string', options: ['horizontal', 'vertical'], default: 'horizontal', description: 'Link layout direction' },
        { name: 'style', type: 'string', options: ['plain', 'buttons', 'pills', 'underline'], default: 'plain', description: 'Link appearance' },
        { name: 'spacing', type: 'string', options: ['tight', 'normal', 'loose'], default: 'normal', description: 'Space between links' }
      ],
      example: `<NavigationLinks orientation="horizontal" style="pills" />
<NavigationLinks orientation="vertical" style="buttons" spacing="loose" />`,
      preview: (
        <nav className="flex gap-2 text-xs">
          <div className="bg-blue-100 px-3 py-1 rounded-full">Home</div>
          <div className="hover:bg-gray-100 px-3 py-1 rounded-full">About</div>
          <div className="hover:bg-gray-100 px-3 py-1 rounded-full">Contact</div>
        </nav>
      )
    },
    {
      name: 'SiteBranding',
      description: 'Site logo, title, and tagline display component',
      props: [
        { name: 'showLogo', type: 'boolean', options: ['true', 'false'], default: 'true', description: 'Display logo image' },
        { name: 'showTagline', type: 'boolean', options: ['true', 'false'], default: 'true', description: 'Show site tagline' },
        { name: 'layout', type: 'string', options: ['horizontal', 'vertical', 'stacked'], default: 'horizontal', description: 'Brand element layout' }
      ],
      example: `<SiteBranding showLogo="true" showTagline="true" layout="horizontal" />
<SiteBranding showLogo="false" layout="vertical" />`,
      preview: (
        <div className="flex items-center gap-2 text-xs">
          <div className="w-6 h-6 bg-blue-500 rounded flex items-center justify-center text-white font-bold">
            T
          </div>
          <div>
            <div className="font-bold">Threadstead</div>
            <div className="text-gray-500 text-xs">Your digital home</div>
          </div>
        </div>
      )
    },
    {
      name: 'WebsiteDisplay',
      description: 'Display website links with preview cards and metadata',
      props: [
        { name: 'showPreview', type: 'boolean', options: ['true', 'false'], default: 'true', description: 'Show link preview cards' },
        { name: 'layout', type: 'string', options: ['list', 'grid', 'compact'], default: 'list', description: 'Display layout' },
        { name: 'maxLinks', type: 'number', options: ['3', '5', '10'], default: '5', description: 'Maximum links to display' }
      ],
      example: `<WebsiteDisplay showPreview="true" layout="grid" maxLinks="6" />
<WebsiteDisplay layout="compact" showPreview="false" />`,
      preview: (
        <div className="border border-gray-200 rounded p-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <div>
              <div className="font-medium">My Portfolio</div>
              <div className="text-gray-500">portfolio.example.com</div>
            </div>
          </div>
        </div>
      )
    },
    {
      name: 'MutualFriends',
      description: 'Display mutual friends between users with avatars',
      props: [
        { name: 'limit', type: 'number', options: ['3', '5', '8'], default: '5', description: 'Max mutual friends to show' },
        { name: 'showCount', type: 'boolean', options: ['true', 'false'], default: 'true', description: 'Display total count' },
        { name: 'size', type: 'string', options: ['sm', 'md', 'lg'], default: 'md', description: 'Avatar size' }
      ],
      example: `<MutualFriends limit="5" showCount="true" />
<MutualFriends limit="3" size="lg" />`,
      preview: (
        <div className="text-xs">
          <div className="flex -space-x-2 mb-1">
            {[1,2,3].map(i => (
              <div key={i} className="w-6 h-6 bg-indigo-300 rounded-full border-2 border-white flex items-center justify-center text-xs">
                {i}
              </div>
            ))}
          </div>
          <div className="text-gray-600">12 mutual friends</div>
        </div>
      )
    },
    {
      name: 'FriendBadge',
      description: 'Small badge indicator for friend status and relationships',
      props: [
        { name: 'status', type: 'string', options: ['friend', 'pending', 'none', 'blocked'], default: 'none', description: 'Friendship status' },
        { name: 'showText', type: 'boolean', options: ['true', 'false'], default: 'false', description: 'Show status text' },
        { name: 'size', type: 'string', options: ['sm', 'md'], default: 'sm', description: 'Badge size' }
      ],
      example: `<FriendBadge status="friend" showText="true" />
<FriendBadge status="pending" size="md" />`,
      preview: (
        <div className="inline-flex items-center gap-1 bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          Friend
        </div>
      )
    },
    {
      name: 'NotificationCenter',
      description: 'Notification panel with list of recent notifications',
      props: [
        { name: 'maxNotifications', type: 'number', options: ['5', '10', '20'], default: '10', description: 'Maximum notifications to show' },
        { name: 'showTimestamps', type: 'boolean', options: ['true', 'false'], default: 'true', description: 'Display notification times' },
        { name: 'groupByDate', type: 'boolean', options: ['true', 'false'], default: 'false', description: 'Group notifications by date' }
      ],
      example: `<NotificationCenter maxNotifications="10" showTimestamps="true" />
<NotificationCenter groupByDate="true" />`,
      preview: (
        <div className="border border-gray-200 rounded p-2 text-xs max-w-48">
          <div className="font-semibold mb-2">Notifications</div>
          <div className="space-y-2">
            <div className="flex gap-2">
              <div className="w-6 h-6 bg-blue-200 rounded-full"></div>
              <div className="flex-1">
                <div>John liked your post</div>
                <div className="text-gray-500 text-xs">2h ago</div>
              </div>
            </div>
            <div className="flex gap-2">
              <div className="w-6 h-6 bg-green-200 rounded-full"></div>
              <div className="flex-1">
                <div>New friend request</div>
                <div className="text-gray-500 text-xs">1d ago</div>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      name: 'Choose (conditional)',
      description: 'Advanced conditional rendering with When/Otherwise logic blocks',
      props: [
        { name: 'children', type: 'components', options: ['When', 'Otherwise'], default: 'required', description: 'When and Otherwise components as children' }
      ],
      example: `<Choose>
  <When condition="user.isLoggedIn">
    <p>Welcome back, {user.name}!</p>
  </When>
  <When data="user.posts" equals="0">
    <p>You haven't posted anything yet.</p>
  </When>
  <Otherwise>
    <p>Please log in to see your content</p>
  </Otherwise>
</Choose>`,
      preview: (
        <div className="bg-yellow-50 border border-yellow-200 p-2 text-xs rounded">
          <div className="text-yellow-800">When condition is true: Welcome back!</div>
          <div className="text-gray-500 text-xs">Advanced conditional rendering with multiple When clauses</div>
        </div>
      )
    },
    {
      name: 'When (used with Choose)',
      description: 'Condition block for use inside Choose component',
      props: [
        { name: 'condition', type: 'string', options: ['true', 'false', 'has:path.to.data', 'path.to.data'], default: 'none', description: 'Condition to evaluate against resident data' },
        { name: 'data', type: 'string', options: ['user.name', 'posts', 'bio', 'any.data.path'], default: 'none', description: 'Data path to check' },
        { name: 'equals', type: 'string', options: ['any value'], default: 'none', description: 'Value to compare data against' },
        { name: 'exists', type: 'boolean', options: ['true', 'false'], default: 'none', description: 'Check if data exists' }
      ],
      example: `<When condition="has:user.bio">Bio exists</When>
<When data="user.posts" equals="5">You have exactly 5 posts</When>
<When data="user.verified" exists="true">Verified user badge</When>`,
      preview: (
        <div className="bg-blue-50 border border-blue-200 p-2 text-xs rounded">
          <div className="text-blue-800">✓ When condition met</div>
          <div className="text-gray-500 text-xs">Used inside Choose for conditional logic</div>
        </div>
      )
    },
    {
      name: 'Otherwise (used with Choose)',
      description: 'Fallback content block for use inside Choose component',
      props: [
        { name: 'children', type: 'ReactNode', options: ['any content'], default: 'required', description: 'Content to show when no When conditions are met' }
      ],
      example: `<Choose>
  <When condition="user.isLoggedIn">Welcome!</When>
  <Otherwise>
    <div>Please log in to continue</div>
  </Otherwise>
</Choose>`,
      preview: (
        <div className="bg-gray-50 border border-gray-200 p-2 text-xs rounded">
          <div className="text-gray-600">Otherwise: Default fallback content</div>
          <div className="text-gray-500 text-xs">Shown when no When conditions match</div>
        </div>
      )
    },
    {
      name: 'Show (conditional)',
      description: 'Simple conditional rendering with flexible data evaluation',
      props: [
        { name: 'when', type: 'string', options: ['true', 'false', 'has:path.to.data', 'path.to.data'], default: 'none', description: 'Condition string to evaluate' },
        { name: 'data', type: 'string', options: ['user.name', 'posts', 'bio', 'any.data.path'], default: 'none', description: 'Data path to check' },
        { name: 'equals', type: 'string', options: ['any value'], default: 'none', description: 'Value to compare data against' },
        { name: 'exists', type: 'string', options: ['any.data.path'], default: 'none', description: 'Check if data path exists' }
      ],
      example: `<Show when="has:user.bio">
  <div>User has a bio: {user.bio}</div>
</Show>
<Show data="user.posts" equals="0">
  <p>No posts yet - write your first one!</p>
</Show>
<Show exists="user.profilePhoto">
  <img src={user.profilePhoto} alt="Profile" />
</Show>`,
      preview: (
        <div className="bg-green-50 border border-green-200 p-2 text-xs rounded">
          <div className="text-green-800">✓ Content is shown</div>
          <div className="text-gray-500 text-xs">Simple conditional with data path evaluation</div>
        </div>
      )
    },
    {
      name: 'IfOwner (conditional)',
      description: 'Show content only to the profile owner (viewer === owner)',
      props: [
        { name: 'children', type: 'ReactNode', options: ['any content'], default: 'required', description: 'Content visible only to profile owner' }
      ],
      example: `<IfOwner>
  <button>Edit Profile</button>
  <button>Settings</button>
</IfOwner>`,
      preview: (
        <div className="bg-purple-50 border border-purple-200 p-2 text-xs rounded">
          <div className="text-purple-800">👤 Owner-only: Edit Profile button</div>
          <div className="text-gray-500 text-xs">Visible only when viewer.id === owner.id</div>
        </div>
      )
    },
    {
      name: 'IfVisitor (conditional)',
      description: 'Show content only to visitors (viewer !== owner)',
      props: [
        { name: 'children', type: 'ReactNode', options: ['any content'], default: 'required', description: 'Content visible only to visitors' }
      ],
      example: `<IfVisitor>
  <button>Follow</button>
  <button>Send Message</button>
</IfVisitor>`,
      preview: (
        <div className="bg-indigo-50 border border-indigo-200 p-2 text-xs rounded">
          <div className="text-indigo-800">👥 Visitor-only: Follow button</div>
          <div className="text-gray-500 text-xs">Visible only when viewer.id !== owner.id</div>
        </div>
      )
    }
  ],
  'css-classes': [
    {
      name: 'Profile Structure',
      description: 'Main container and layout elements for the default profile page',
      example: `/* Target the main profile container */
.profile-container {
  background: linear-gradient(to bottom, #f0f8ff, #e6f3ff);
  border-radius: 20px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.1);
}

/* Style the profile content wrapper */
.profile-content-wrapper {
  padding: 2rem;
  max-width: 800px;
  margin: 0 auto;
}`,
      preview: (
        <div className="bg-blue-50 border border-blue-200 p-3 rounded text-xs">
          <div className="font-semibold mb-1">Profile Container</div>
          <div className="text-gray-600">Main wrapper for all profile content</div>
        </div>
      ),
      stylingGuide: {
        classes: [
          {
            name: '.profile-container',
            description: 'Main container for the entire profile page'
          },
          {
            name: '.profile-content-wrapper', 
            description: 'Inner wrapper for profile content with responsive padding'
          },
          {
            name: '.profile-main-content',
            description: 'Contains the main profile sections (header, tabs, etc.)'
          }
        ],
        examples: [
          {
            title: 'Retro Computer Theme',
            css: `.profile-container {
  background: #c0c0c0 !important;
  border: 4px outset #808080 !important;
  border-radius: 0 !important;
  font-family: "MS Sans Serif", sans-serif !important;
}

.profile-content-wrapper {
  background: #008080 !important;
  border: 2px inset #c0c0c0 !important;
  margin: 4px !important;
}`
          }
        ]
      }
    },
    {
      name: 'Profile Header',
      description: 'User photo, name, bio, and header elements',
      example: `/* Style the profile header section */
.profile-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 15px;
  padding: 2rem;
}

/* Customize the display name */
.profile-display-name {
  font-size: 3rem !important;
  background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
  background-clip: text !important;
  -webkit-text-fill-color: transparent !important;
}`,
      preview: (
        <div className="bg-purple-100 border border-purple-200 p-3 rounded text-xs">
          <div className="font-bold text-purple-800">Profile Header</div>
          <div className="text-purple-600 mt-1">Photo, name, status, bio area</div>
        </div>
      ),
      stylingGuide: {
        classes: [
          {
            name: '.profile-header',
            description: 'Main header section containing photo and basic info'
          },
          {
            name: '.profile-header-layout',
            description: 'Flex layout container for header elements'
          },
          {
            name: '.profile-photo-section',
            description: 'Container for profile photo'
          },
          {
            name: '.profile-photo-wrapper',
            description: 'Photo wrapper with positioning'
          },
          {
            name: '.profile-photo-frame',
            description: 'Photo frame/border styling'
          },
          {
            name: '.profile-photo-image',
            description: 'The actual profile image element'
          },
          {
            name: '.profile-info-section',
            description: 'Container for name, bio, and action buttons'
          },
          {
            name: '.profile-identity',
            description: 'Name and status container'
          },
          {
            name: '.profile-display-name',
            description: 'User\'s display name heading'
          },
          {
            name: '.profile-status',
            description: 'Status text (e.g. "threadstead resident")'
          },
          {
            name: '.profile-bio-section',
            description: 'Bio/about text container'
          },
          {
            name: '.profile-bio',
            description: 'The bio text itself'
          },
          {
            name: '.profile-actions',
            description: 'Container for action buttons (follow, message, etc.)'
          }
        ],
        examples: [
          {
            title: 'Neon Cyberpunk Header',
            css: `.profile-header {
  background: linear-gradient(135deg, #0c0c0c 0%, #1a1a2e 50%, #16213e 100%) !important;
  border: 2px solid #00ffff !important;
  box-shadow: 
    0 0 20px rgba(0, 255, 255, 0.3),
    inset 0 0 20px rgba(0, 255, 255, 0.1) !important;
}

.profile-display-name {
  color: #00ffff !important;
  text-shadow: 
    0 0 10px #00ffff,
    0 0 20px #00ffff,
    0 0 30px #00ffff !important;
  font-family: "Courier New", monospace !important;
  text-transform: uppercase !important;
  letter-spacing: 2px !important;
}

.profile-bio {
  color: #ff00ff !important;
  text-shadow: 0 0 10px #ff00ff !important;
  border: 1px solid #ff00ff !important;
  padding: 1rem !important;
  background: rgba(255, 0, 255, 0.1) !important;
}`
          }
        ]
      }
    },
    {
      name: 'Navigation & Tabs', 
      description: 'Site navigation, profile tabs, and tab panels',
      example: `/* Style the site navigation */
.site-header {
  background: linear-gradient(90deg, #ff9a9e 0%, #fecfef 100%);
  border-bottom: 3px solid #ff6b9d;
}

/* Customize profile tabs */
.profile-tabs {
  background: #f8f9fa;
  border-radius: 10px;
  overflow: hidden;
}

.profile-tab-button {
  background: linear-gradient(to bottom, #e3f2fd, #bbdefb) !important;
  border: none !important;
  color: #1976d2 !important;
  font-weight: bold !important;
}`,
      preview: (
        <div className="bg-pink-50 border border-pink-200 p-3 rounded text-xs">
          <div className="flex gap-2 mb-2">
            <div className="bg-pink-200 px-2 py-1 rounded">Blog</div>
            <div className="bg-pink-100 px-2 py-1 rounded">Media</div>
          </div>
          <div className="text-pink-600">Tab navigation and panels</div>
        </div>
      ),
      stylingGuide: {
        classes: [
          {
            name: '.site-header',
            description: 'Main site header bar'
          },
          {
            name: '.site-title',
            description: 'Site title/logo text'
          },
          {
            name: '.site-tagline',
            description: 'Site tagline/subtitle'
          },
          {
            name: '.nav-link',
            description: 'Navigation menu links'
          },
          {
            name: '.profile-tabs',
            description: 'Container for the tab system'
          },
          {
            name: '.profile-tab-list',
            description: 'Container for tab buttons'
          },
          {
            name: '.profile-tab-button',
            description: 'Individual tab button'
          },
          {
            name: '.profile-tab-button.active',
            description: 'Currently active tab button'
          },
          {
            name: '.profile-tab-panel',
            description: 'Container for tab content'
          },
          {
            name: '.profile-tab-content',
            description: 'Individual tab content area'
          }
        ],
        examples: [
          {
            title: 'Retro Gaming Tabs',
            css: `.profile-tab-button {
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
  box-shadow: 2px 2px 0 #000 !important;
}`
          }
        ]
      }
    },
    {
      name: 'Blog Posts',
      description: 'Blog post cards, content, and metadata',
      example: `/* Style blog post cards */
.blog-post-card {
  background: linear-gradient(145deg, #ffffff, #f0f0f0);
  border: none;
  border-radius: 15px;
  box-shadow: 
    20px 20px 60px #d0d0d0,
    -20px -20px 60px #ffffff;
  padding: 2rem;
  margin: 1.5rem 0;
}

/* Customize post titles */
.blog-post-title {
  color: #2c3e50 !important;
  font-size: 1.8rem !important;
  font-weight: 700 !important;
  margin-bottom: 1rem !important;
}`,
      preview: (
        <div className="bg-gray-50 border border-gray-200 p-3 rounded text-xs">
          <div className="font-semibold mb-1">Blog Post Card</div>
          <div className="text-gray-500 text-xs mb-1">Oct 15, 2024</div>
          <div className="text-gray-800">Post title and content styling</div>
        </div>
      ),
      stylingGuide: {
        classes: [
          {
            name: '.blog-tab-content',
            description: 'Container for blog posts tab'
          },
          {
            name: '.blog-posts-list',
            description: 'List container for blog posts'
          },
          {
            name: '.blog-post-card',
            description: 'Individual blog post card'
          },
          {
            name: '.blog-post-header',
            description: 'Header section of blog post (date, meta)'
          },
          {
            name: '.blog-post-date',
            description: 'Post publication date'
          },
          {
            name: '.blog-post-content',
            description: 'Main content area of blog post'
          },
          {
            name: '.blog-post-title',
            description: 'Blog post title/heading'
          }
        ],
        examples: [
          {
            title: 'Newspaper Style Posts',
            css: `.blog-post-card {
  background: #f9f7f4 !important;
  border: 2px solid #333 !important;
  border-radius: 0 !important;
  font-family: "Times New Roman", serif !important;
  box-shadow: 5px 5px 0 #333 !important;
}

.blog-post-title {
  font-family: "Times New Roman", serif !important;
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
}`
          }
        ]
      }
    },
    {
      name: 'Site Layout',
      description: 'Overall site structure, header, footer, and main content areas',
      example: `/* Style the overall site layout */
.site-layout {
  background: linear-gradient(45deg, #fa8bff 0%, #2bd2ff 52%, #2bff88 90%);
  min-height: 100vh;
}

/* Customize the footer */
.site-footer {
  background: rgba(0, 0, 0, 0.8) !important;
  color: white !important;
  text-align: center !important;
  padding: 2rem !important;
}`,
      preview: (
        <div className="bg-gradient-to-r from-purple-200 to-blue-200 p-3 rounded text-xs">
          <div className="text-center">
            <div className="font-semibold">Site Layout</div>
            <div className="text-gray-600 mt-1">Overall page structure and background</div>
          </div>
        </div>
      ),
      stylingGuide: {
        classes: [
          {
            name: '.site-layout',
            description: 'Overall page container (body-level styling)'
          },
          {
            name: '.site-main',
            description: 'Main content area container'
          },
          {
            name: '.site-footer',
            description: 'Site footer area'
          },
          {
            name: '.footer-tagline',
            description: 'Footer tagline text'
          },
          {
            name: '.footer-copyright',
            description: 'Copyright text in footer'
          }
        ],
        examples: [
          {
            title: 'Matrix/Terminal Theme',
            css: `.site-layout {
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
}

.site-footer {
  background: #000 !important;
  border-top: 2px solid #00ff00 !important;
  color: #00ff00 !important;
}`
          }
        ]
      }
    }
  ]
};