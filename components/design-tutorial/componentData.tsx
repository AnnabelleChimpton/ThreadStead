import React from 'react';
import { PixelIcon } from '@/components/ui/PixelIcon';

export const componentCategories = [
  {
    id: 'visual-builder',
    title: 'Visual Builder Tutorials',
    icon: '🎨',
    description: 'Learn to use our flagship drag-and-drop builder with professional workflow features'
  },
  {
    id: 'css-classes',
    title: 'CSS Classes Reference',
    icon: '💻',
    description: 'CSS class reference and styling guide for customizing your components'
  }
];

export const componentData = {
  'visual-builder': [
    {
      name: 'Getting Started',
      description: 'Learn the basics of drag-and-drop profile building',
      props: [],
      example: `<!-- Visual Builder Tutorial -->
1. Open Visual Builder from Profile Settings
2. Browse the Component Palette
3. Drag components onto the canvas
4. Click to customize properties
5. Save your beautiful template!`,
      preview: <div className="text-center p-4 bg-gradient-to-r from-purple-100 to-pink-100 border-2 border-purple-300 rounded">
        <div className="text-2xl mb-2">🎨</div>
        <div className="font-bold">Visual Builder</div>
        <div className="text-sm text-gray-600">Drag & Drop Design</div>
      </div>,
      tutorial: `
**Step 1: Opening Visual Builder**
Navigate to Profile Settings → Template Editor → "Switch to Visual Builder"

**Step 2: Understanding the Interface**
- Left Panel: Component Palette with search and categories
- Center: Canvas for designing your profile
- Right Panel: Property editor for selected components

**Step 3: Adding Components**
- Browse components by category (Content, Retro, Layout, etc.)
- Drag components from palette to canvas
- Use visual drop zones for precise placement

**Step 4: Customizing Components**
- Click any component to select it
- Edit properties in the right panel
- See changes in real-time on the canvas

**Step 5: Advanced Features**
- Ctrl+click for multi-select
- Drag to create selection rectangles
- Use Groups panel for organizing components
- Bulk edit multiple components at once
      `
    },
    {
      name: 'Component Palette',
      description: 'Browse and search through all available components',
      props: [],
      example: `Search components:
- Type to filter by name
- Browse by category
- Switch between list and grid view
- Mark favorites for quick access`,
      preview: <div className="p-3 bg-gray-50 border rounded">
        <div className="text-sm font-bold mb-2">Components</div>
        <div className="grid grid-cols-2 gap-1 text-xs">
          <div className="p-1 bg-white border">📝 Text</div>
          <div className="p-1 bg-white border">📺 CRT</div>
          <div className="p-1 bg-white border">🎮 Button</div>
          <div className="p-1 bg-white border">📱 Card</div>
        </div>
      </div>,
      tutorial: `
**Component Categories:**
- **Content**: Profile info, photos, text
- **Retro**: CRT monitors, VHS tapes, arcade elements
- **Layout**: Containers, grids, sections
- **Visual**: Backgrounds, borders, effects
- **Interactive**: Buttons, links, forms

**Search Features:**
- Real-time filtering by component name
- Category-based browsing
- Favorites system for frequently used components
- Recently used components section

**Viewing Options:**
- List view with descriptions
- Grid view with thumbnails
- Compact view for space saving
      `
    },
    {
      name: 'Multi-Select & Bulk Editing',
      description: 'Professional workflow features for efficient design',
      props: [],
      example: `Multi-Select Methods:
- Ctrl+Click: Add/remove from selection
- Rubber Band: Drag to select area
- Shift+Click: Select range

Bulk Operations:
- Move multiple components together
- Edit shared properties at once
- Group related components
- Delete multiple components`,
      preview: <div className="p-3 bg-blue-50 border-2 border-blue-200 rounded">
        <div className="text-sm font-bold mb-2">Multi-Select Active</div>
        <div className="flex gap-1">
          <div className="w-8 h-8 bg-purple-200 border-2 border-purple-400"></div>
          <div className="w-8 h-8 bg-purple-200 border-2 border-purple-400"></div>
          <div className="w-8 h-8 bg-purple-200 border-2 border-purple-400"></div>
        </div>
        <div className="text-xs text-blue-600 mt-1">3 components selected</div>
      </div>,
      tutorial: `
**Selection Methods:**
1. **Ctrl+Click**: Hold Ctrl and click components to add/remove from selection
2. **Rubber Band**: Click and drag on empty canvas to select multiple components in a rectangle
3. **Shift+Click**: Select a range of components
4. **Select All**: Ctrl+A to select all components

**Bulk Operations:**
- **Move**: Drag any selected component to move all together
- **Property Editing**: Change colors, fonts, spacing for all selected components
- **Grouping**: Create logical groups for better organization
- **Alignment**: Align multiple components to edges or centers
- **Distribution**: Evenly space components

**Keyboard Shortcuts:**
- Delete: Remove selected components
- Ctrl+G: Group selected components
- Ctrl+Shift+G: Ungroup
- Arrow Keys: Nudge selected components
- Shift+Arrow: Nudge by larger increments
      `
    },
    {
      name: 'CSS Grid System & Snapping',
      description: 'Professional CSS Grid layout with visual overlay and smart snapping',
      props: [],
      example: `Grid Components:
- Drag a Grid component onto the canvas
- See visual grid lines and track numbers
- Drag components to snap to grid cells
- Automatic grid cell highlighting

Grid Properties:
- gridTemplateColumns: "repeat(3, 1fr)"
- gridTemplateRows: "auto"
- gap: "1rem"
- Full CSS Grid support`,
      preview: <div className="p-3 bg-purple-50 border-2 border-purple-200 rounded">
        <div className="text-sm font-bold mb-2">CSS Grid</div>
        <div className="grid grid-cols-3 gap-2">
          <div className="h-8 bg-purple-200 border border-purple-400"></div>
          <div className="h-8 bg-purple-200 border border-purple-400"></div>
          <div className="h-8 bg-purple-200 border border-purple-400"></div>
        </div>
        <div className="text-xs text-purple-600 mt-2">Visual grid overlay with snapping</div>
      </div>,
      tutorial: `
**CSS Grid Components:**
- **Grid**: Main container with CSS Grid properties
- **GridItem**: Child components with positioning (gridColumn, gridRow, colSpan, rowSpan)

**Visual Grid Overlay:**
- Automatic visual overlay showing grid lines
- Track numbers displayed on rows and columns
- Grid lines update when you change grid properties
- Toggle overlay visibility as needed

**Smart Grid Snapping:**
- High-priority snapping to grid lines (priority 8)
- Magnetic pull effect (0.75) for easy alignment
- Visual cell highlighting during drag
- Shows target grid cell before dropping

**Grid Properties (Property Panel):**
- gridTemplateColumns: Define column structure (e.g., "repeat(3, 1fr)", "200px auto 1fr")
- gridTemplateRows: Define row structure (e.g., "auto", "100px 1fr auto")
- gridColumnGap/gridRowGap: Space between tracks
- justifyItems/alignItems: Align items within grid cells
- Full support for all CSS Grid properties

**Grid Parser:**
- Automatically parses complex grid templates
- Supports repeat(), fr units, px, %, auto
- Calculates exact grid line positions
- Accounts for gap spacing
      `
    },
    {
      name: 'Advanced Positioning Controls',
      description: 'Professional positioning with CSS position modes and constraints',
      props: [],
      example: `Position Modes:
- Static (default flow)
- Relative (offset from normal position)
- Absolute (positioned relative to parent)
- Fixed (viewport positioning)
- Sticky (scroll-aware positioning)

Advanced Controls:
- Z-index: Layer stacking (-100 to +100)
- Coordinates: top, right, bottom, left (with units)
- Size Constraints: min/max width/height
- Grid Positioning: column, row, span`,
      preview: <div className="p-3 bg-indigo-50 border-2 border-indigo-200 rounded space-y-2">
        <div className="flex gap-2 text-xs">
          <div className="flex-1 bg-indigo-200 p-2 text-center">Static</div>
          <div className="relative flex-1 bg-indigo-200 p-2 text-center">
            Relative
            <div className="absolute -top-1 -right-1 bg-red-400 text-white px-1 rounded">z:10</div>
          </div>
        </div>
        <div className="text-xs text-indigo-600">17 positioning controls added</div>
      </div>,
      tutorial: `
**CSS Position Modes (Phase 4.1):**
Select from 5 position modes in the Property Panel:
- **static**: Normal document flow (default)
- **relative**: Offset from normal position, preserves space
- **absolute**: Positioned relative to nearest positioned ancestor
- **fixed**: Positioned relative to viewport (stays on scroll)
- **sticky**: Hybrid of relative and fixed based on scroll

**Position Coordinates:**
- **Top/Right/Bottom/Left**: Precise positioning with CSS units
- Supports: px, %, rem, em, vh, vw
- Visual input with unit selector
- Real-time preview on canvas

**Z-Index Control:**
- Slider + number input
- Range: -100 to +100
- Controls stacking order
- Higher values appear on top

**Size Constraints:**
- **minWidth/maxWidth**: Constrain horizontal sizing
- **minHeight/maxHeight**: Constrain vertical sizing
- Accepts any CSS length values
- Responsive behavior with constraints

**Grid Positioning (for Grid children):**
- **gridColumn/gridRow**: Position in grid
- **colSpan/rowSpan**: Span multiple cells
- Visual grid cell selection
- Automatic span calculation

**Legacy Compatibility:**
- Old X/Y position system still works
- Automatically converted to CSS positioning
- Backward compatible with existing templates
      `
    },
    {
      name: 'Responsive Breakpoint Preview',
      description: 'Design for desktop, tablet, and mobile with live preview',
      props: [],
      example: `Breakpoint Modes:
- Desktop: 1200px (full width)
- Tablet: 768px
- Mobile: 375px

Features:
- Switch between breakpoints instantly
- Per-breakpoint component positioning
- Canvas automatically resizes
- Test responsive layouts visually`,
      preview: <div className="p-3 bg-teal-50 border-2 border-teal-200 rounded">
        <div className="text-sm font-bold mb-2">Breakpoint Preview</div>
        <div className="flex gap-2 text-xs mb-2">
          <button className="px-2 py-1 bg-teal-600 text-white rounded">Desktop</button>
          <button className="px-2 py-1 bg-gray-200 rounded">Tablet</button>
          <button className="px-2 py-1 bg-gray-200 rounded">Mobile</button>
        </div>
        <div className="text-xs text-teal-600">Canvas: 1200px</div>
      </div>,
      tutorial: `
**Breakpoint Switcher (Phase 4.2):**
Toggle between device previews in the Visual Builder toolbar:

**Desktop Mode (1200px):**
- Full canvas width
- Default design viewport
- Desktop-first layouts

**Tablet Mode (768px):**
- Canvas resizes to 768px width
- Test tablet layouts
- Medium screen optimization

**Mobile Mode (375px):**
- Canvas resizes to 375px width
- Mobile-first testing
- Phone screen simulation

**Per-Breakpoint Positioning:**
Each component can have different positions per breakpoint:
\`\`\`
component.position = {
  desktop: { x: 100, y: 50 },
  tablet: { x: 50, y: 50 },
  mobile: { x: 20, y: 50 }
}
\`\`\`

**Visual Breakpoint Indicator:**
- Shows current breakpoint mode
- Displays canvas width
- Quick switching between modes

**Grid Configuration Sync:**
- Grid system updates to match breakpoint
- Responsive column adjustments
- Gap spacing per breakpoint

**Workflow:**
1. Design at desktop breakpoint first
2. Switch to tablet, adjust positioning
3. Switch to mobile, optimize layout
4. Test across all breakpoints
5. Publish responsive template
      `
    },
    {
      name: 'Universal CSS Styling',
      description: 'Every component accepts standard CSS properties for complete design control',
      props: [],
      example: `CSS Properties on ANY Component:
- backgroundColor: "#667eea"
- color: "#ffffff"
- fontSize: "1.25rem"
- padding: "1rem 2rem"
- borderRadius: "0.5rem"
- boxShadow: "0 4px 6px rgba(0,0,0,0.1)"

ALL 59 components support UniversalCSSProps!`,
      preview: <div className="p-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg shadow-lg">
        <div className="text-sm font-bold mb-1">Universal CSS Props</div>
        <div className="text-xs opacity-90">backgroundColor • fontSize • padding</div>
        <div className="text-xs opacity-90">borderRadius • boxShadow • more!</div>
      </div>,
      tutorial: `
**UniversalCSSProps System (Phase 5 - Complete):**

**What It Is:**
Every component in the Visual Builder now extends UniversalCSSProps, which means you can apply standard CSS properties to ANY component, not just specific ones.

**Supported CSS Categories:**

**Colors & Backgrounds:**
- backgroundColor, color, borderColor
- background (gradients, images)
- opacity

**Typography:**
- fontSize, fontFamily, fontWeight
- lineHeight, letterSpacing
- textAlign, textDecoration, textTransform

**Spacing:**
- padding, margin (all sides or individual)
- gap (for flex/grid containers)

**Borders & Effects:**
- border, borderRadius, borderWidth
- boxShadow
- outline

**Positioning:**
- position, top, right, bottom, left
- zIndex
- transform, transformOrigin

**Layout:**
- display
- width, height, minWidth, maxWidth, minHeight, maxHeight
- overflow, overflowX, overflowY

**How It Works:**
1. Select any component
2. Open Property Panel → Style tab
3. Use CSS-native property editors:
   - **CSSLengthEditor**: For sizing, spacing (with unit picker: px, rem, em, %)
   - **CSSColorEditor**: For colors (hex, rgb, named colors)
   - **Text inputs**: For any CSS value

**User Styling Is Queen:**
- CSS props ALWAYS override component defaults
- Uses \`removeTailwindConflicts()\` to prevent conflicts
- Smart style merging for animations and transforms

**All 59 Components Migrated:**
- Content components (DisplayName, Bio, ProfilePhoto, etc.)
- Layout components (FlexContainer, Grid, CenteredBox, etc.)
- Decorative components (NeonBorder, GradientBox, StickyNote, etc.)
- Retro components (CRTMonitor, VHSTape, MatrixRain, etc.)
- Interactive components (Tabs, NotificationCenter, etc.)

**Example Usage:**
\`\`\`jsx
<DisplayName
  backgroundColor="#667eea"
  color="white"
  padding="1rem"
  borderRadius="0.5rem"
  fontSize="2rem"
  fontWeight="bold"
/>
\`\`\`

**Property Panel Integration:**
- Automatic CSS value validation
- Real-time preview
- Intelligent autocomplete
- Error messages for invalid values

**Backward Compatibility:**
- All existing templates still work
- Legacy properties preserved
- Migration layer handles old prop formats
      `
    }
  ],
  'retro-components': [
    {
      name: 'CRTMonitor',
      description: 'Authentic CRT monitor with scanlines, phosphor glow, and multiple screen colors',
      props: [
        { name: 'screenColor', type: 'string', options: ['green', 'amber', 'white', 'blue'], default: 'green', description: 'CRT phosphor color' },
        { name: 'phosphorGlow', type: 'boolean', options: ['true', 'false'], default: 'true', description: 'Enable phosphor glow effect' },
        { name: 'scanlines', type: 'boolean', options: ['true', 'false'], default: 'true', description: 'Show CRT scanlines' },
        { name: 'curvature', type: 'string', options: ['none', 'slight', 'medium', 'strong'], default: 'medium', description: 'Screen curvature effect' },
        { name: 'content', type: 'string', default: 'CRT Display Content', description: 'Text to display on screen' }
      ],
      example: `<CRTMonitor screenColor="green" phosphorGlow="true" scanlines="true" curvature="medium">
  Terminal Ready...
</CRTMonitor>

<CRTMonitor screenColor="amber" curvature="slight">
  Welcome to Threadstead
</CRTMonitor>`,
      preview: <div className="relative p-4 bg-gray-800 rounded-lg border-4 border-gray-600">
        <div className="bg-green-900 p-3 rounded text-green-400 font-mono text-sm relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-green-500 to-transparent opacity-10 animate-pulse"></div>
          Welcome to Threadstead &gt;_
        </div>
      </div>
    },
    {
      name: 'NeonSign',
      description: 'Animated neon text with glow effects, multiple colors, and animation modes',
      props: [
        { name: 'text', type: 'string', default: 'NEON', description: 'Text to display' },
        { name: 'color', type: 'string', options: ['pink', 'blue', 'green', 'orange', 'purple', 'red'], default: 'pink', description: 'Neon color' },
        { name: 'animation', type: 'string', options: ['steady', 'flicker', 'pulse', 'buzz'], default: 'steady', description: 'Animation type' },
        { name: 'intensity', type: 'string', options: ['low', 'medium', 'high'], default: 'medium', description: 'Glow intensity' },
        { name: 'fontSize', type: 'string', options: ['small', 'medium', 'large', 'xlarge'], default: 'medium', description: 'Text size' }
      ],
      example: `<NeonSign text="WELCOME" color="pink" animation="pulse" intensity="high" />

<NeonSign text="RETRO VIBES" color="blue" animation="flicker" fontSize="large" />`,
      preview: <div className="bg-black p-4 rounded">
        <div className="text-pink-400 font-bold text-xl text-center" style={{
          textShadow: '0 0 10px #ec4899, 0 0 20px #ec4899, 0 0 30px #ec4899',
          fontFamily: 'monospace'
        }}>
          THREADSTEAD
        </div>
      </div>
    },
    {
      name: 'ArcadeButton',
      description: 'Chunky retro button with 3D styling, click effects, and multiple shapes',
      props: [
        { name: 'text', type: 'string', default: 'PRESS START', description: 'Button text' },
        { name: 'color', type: 'string', options: ['red', 'blue', 'green', 'yellow', 'purple', 'orange'], default: 'red', description: 'Button color' },
        { name: 'shape', type: 'string', options: ['round', 'square', 'pill'], default: 'round', description: 'Button shape' },
        { name: 'size', type: 'string', options: ['small', 'medium', 'large'], default: 'medium', description: 'Button size' },
        { name: 'glow', type: 'boolean', options: ['true', 'false'], default: 'true', description: 'Enable glow effect' },
        { name: 'href', type: 'string', default: '', description: 'Link URL (optional)' }
      ],
      example: `<ArcadeButton text="PLAY GAME" color="red" shape="round" size="large" glow="true" />

<ArcadeButton text="MENU" color="blue" shape="square" href="/menu" />`,
      preview: <button className="bg-red-500 hover:bg-red-400 text-white font-bold py-3 px-6 rounded-full shadow-lg border-4 border-red-300 transform hover:scale-105 transition-all">
        PRESS START
      </button>
    },
    {
      name: 'VHSTape',
      description: 'Authentic VHS cassette with customizable labels, wear effects, and multiple styles',
      props: [
        { name: 'title', type: 'string', default: 'My VHS Tape', description: 'Tape title' },
        { name: 'labelStyle', type: 'string', options: ['classic', 'rental', 'homemade', 'premium'], default: 'classic', description: 'Label design style' },
        { name: 'wearLevel', type: 'string', options: ['new', 'used', 'worn', 'vintage'], default: 'used', description: 'Tape condition' },
        { name: 'showBarcode', type: 'boolean', options: ['true', 'false'], default: 'true', description: 'Show rental barcode' },
        { name: 'year', type: 'string', default: '1985', description: 'Year on label' }
      ],
      example: `<VHSTape title="Summer Vacation '85" labelStyle="homemade" wearLevel="vintage" year="1985" />

<VHSTape title="BLOCKBUSTER RENTAL" labelStyle="rental" showBarcode="true" />`,
      preview: <div className="bg-black p-3 rounded">
        <div className="bg-gradient-to-r from-gray-800 to-gray-600 p-2 rounded border">
          <div className="bg-white text-black text-xs p-1 text-center">MY VHS TAPE</div>
          <div className="flex mt-1">
            <div className="w-4 h-4 bg-gray-700 rounded-full"></div>
            <div className="flex-1"></div>
            <div className="w-4 h-4 bg-gray-700 rounded-full"></div>
          </div>
        </div>
      </div>
    },
    {
      name: 'CassetteTape',
      description: 'Audio cassette with rotating spokes animation, side A/B support, and vintage styling',
      props: [
        { name: 'title', type: 'string', default: 'Mix Tape', description: 'Cassette title' },
        { name: 'side', type: 'string', options: ['A', 'B'], default: 'A', description: 'Tape side' },
        { name: 'tapeColor', type: 'string', options: ['clear', 'chrome', 'metal', 'black'], default: 'clear', description: 'Tape color variant' },
        { name: 'rotation', type: 'boolean', options: ['true', 'false'], default: 'true', description: 'Animate spokes rotation' },
        { name: 'labelStyle', type: 'string', options: ['handwritten', 'typed', 'printed'], default: 'handwritten', description: 'Label style' }
      ],
      example: `<CassetteTape title="Road Trip Mix" side="A" tapeColor="chrome" rotation="true" />

<CassetteTape title="Study Music" side="B" labelStyle="typed" />`,
      preview: <div className="bg-gray-100 p-3 rounded">
        <div className="bg-gray-800 p-2 rounded">
          <div className="flex justify-between items-center">
            <div className="w-6 h-6 bg-gray-600 rounded-full flex items-center justify-center">
              <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
            </div>
            <div className="text-white text-xs">MIX TAPE</div>
            <div className="w-6 h-6 bg-gray-600 rounded-full flex items-center justify-center">
              <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
            </div>
          </div>
        </div>
      </div>
    },
    {
      name: 'Boombox',
      description: '80s stereo system with equalizer visualization, cassette deck, and LED indicators',
      props: [
        { name: 'playing', type: 'boolean', options: ['true', 'false'], default: 'false', description: 'Show as playing music' },
        { name: 'equalizerBars', type: 'number', options: ['5', '7', '10'], default: '7', description: 'Number of EQ bars' },
        { name: 'showRadio', type: 'boolean', options: ['true', 'false'], default: 'true', description: 'Show radio display' },
        { name: 'cassetteLoaded', type: 'boolean', options: ['true', 'false'], default: 'true', description: 'Show cassette in deck' },
        { name: 'ledColor', type: 'string', options: ['red', 'green', 'blue'], default: 'red', description: 'LED indicator color' }
      ],
      example: `<Boombox playing="true" equalizerBars="10" showRadio="true" ledColor="green" />

<Boombox cassetteLoaded="false" equalizerBars="5" />`,
      preview: <div className="bg-gray-800 p-4 rounded-lg">
        <div className="flex justify-center mb-2">
          <div className="flex gap-1">
            {[1,2,3,4,5].map(i => <div key={i} className="w-2 bg-green-400" style={{height: `${Math.random() * 20 + 10}px`}}></div>)}
          </div>
        </div>
        <div className="bg-black text-green-400 text-xs text-center p-1 font-mono">88.5 FM</div>
      </div>
    },
    {
      name: 'MatrixRain',
      description: 'Animated falling code background with customizable characters and effects',
      props: [
        { name: 'characters', type: 'string', options: ['katakana', 'latin', 'numbers', 'mixed'], default: 'katakana', description: 'Character set to use' },
        { name: 'speed', type: 'string', options: ['slow', 'medium', 'fast'], default: 'medium', description: 'Animation speed' },
        { name: 'density', type: 'string', options: ['sparse', 'medium', 'dense'], default: 'medium', description: 'Column density' },
        { name: 'glowEffect', type: 'boolean', options: ['true', 'false'], default: 'true', description: 'Enable glow effect' },
        { name: 'fadeEffect', type: 'boolean', options: ['true', 'false'], default: 'true', description: 'Fade trail effect' }
      ],
      example: `<MatrixRain characters="katakana" speed="medium" density="dense" glowEffect="true" />

<MatrixRain characters="numbers" speed="fast" density="sparse" />`,
      preview: <div className="bg-black p-4 rounded relative overflow-hidden h-24">
        <div className="absolute inset-0 text-green-400 font-mono text-xs opacity-70">
          {Array.from({length: 8}).map((_, i) => (
            <div key={i} className="absolute animate-pulse" style={{left: `${i * 12}%`, animationDelay: `${i * 0.2}s`}}>
              {Array.from({length: 6}).map((_, j) => (
                <div key={j} className="mb-1">ア</div>
              ))}
            </div>
          ))}
        </div>
      </div>
    },
    {
      name: 'RetroTV',
      description: 'CRT television with scanlines, static effects, multiple TV styles, and channel display',
      props: [
        { name: 'tvStyle', type: 'string', options: ['crt', 'vintage', 'portable'], default: 'crt', description: 'TV design style' },
        { name: 'screenColor', type: 'string', options: ['color', 'green', 'amber', 'blue'], default: 'color', description: 'Screen type' },
        { name: 'staticLevel', type: 'string', options: ['none', 'light', 'medium', 'heavy'], default: 'light', description: 'Static interference' },
        { name: 'showChannel', type: 'boolean', options: ['true', 'false'], default: 'true', description: 'Show channel display' },
        { name: 'antenna', type: 'boolean', options: ['true', 'false'], default: 'true', description: 'Show antenna' },
        { name: 'content', type: 'string', default: 'Channel 3', description: 'Screen content' }
      ],
      example: `<RetroTV tvStyle="vintage" screenColor="color" staticLevel="medium" showChannel="true">
  Welcome to Threadstead TV
</RetroTV>

<RetroTV tvStyle="portable" screenColor="green" antenna="false" />`,
      preview: <div className="bg-gray-600 p-4 rounded-lg relative">
        <div className="bg-gray-800 p-2 rounded">
          <div className="bg-gray-900 p-3 rounded text-white text-xs text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white to-transparent opacity-5 animate-pulse"></div>
            CHANNEL 3
          </div>
        </div>
        <div className="text-center mt-1 text-xs text-gray-300">📺</div>
      </div>
    },
    {
      name: 'PixelArtFrame',
      description: '8-bit style borders and containers with corner decorations and pixel-perfect rendering',
      props: [
        { name: 'frameStyle', type: 'string', options: ['classic', 'ornate', 'simple', 'thick'], default: 'classic', description: 'Frame border style' },
        { name: 'cornerStyle', type: 'string', options: ['none', 'dots', 'crosses', 'stars'], default: 'dots', description: 'Corner decoration' },
        { name: 'color', type: 'string', options: ['black', 'brown', 'gold', 'silver'], default: 'brown', description: 'Frame color' },
        { name: 'pixelSize', type: 'string', options: ['1px', '2px', '3px'], default: '2px', description: 'Pixel border thickness' },
        { name: 'content', type: 'string', default: 'Framed Content', description: 'Content inside frame' }
      ],
      example: `<PixelArtFrame frameStyle="ornate" cornerStyle="stars" color="gold">
  Important Message Here
</PixelArtFrame>

<PixelArtFrame frameStyle="simple" color="black" pixelSize="1px">
  Profile Photo
</PixelArtFrame>`,
      preview: <div className="p-4">
        <div className="border-4 border-amber-600 bg-amber-50 p-3 relative" style={{imageRendering: 'pixelated'}}>
          <div className="absolute top-0 left-0 w-2 h-2 bg-amber-800"></div>
          <div className="absolute top-0 right-0 w-2 h-2 bg-amber-800"></div>
          <div className="absolute bottom-0 left-0 w-2 h-2 bg-amber-800"></div>
          <div className="absolute bottom-0 right-0 w-2 h-2 bg-amber-800"></div>
          <div className="text-center text-sm">Pixel Art Frame</div>
        </div>
      </div>
    },
    {
      name: 'RetroGrid',
      description: 'Synthwave/outrun perspective grids with multiple theme variants and animations',
      props: [
        { name: 'theme', type: 'string', options: ['synthwave', 'outrun', 'cyberpunk', 'vaporwave', 'neon', 'classic'], default: 'synthwave', description: 'Grid theme' },
        { name: 'animation', type: 'string', options: ['none', 'scroll', 'pulse', 'wave'], default: 'scroll', description: 'Animation type' },
        { name: 'perspective', type: 'string', options: ['flat', 'slight', 'medium', 'strong'], default: 'medium', description: '3D perspective effect' },
        { name: 'gridSize', type: 'string', options: ['small', 'medium', 'large'], default: 'medium', description: 'Grid line spacing' },
        { name: 'opacity', type: 'string', options: ['0.3', '0.5', '0.7', '0.9'], default: '0.5', description: 'Grid opacity' }
      ],
      example: `<RetroGrid theme="synthwave" animation="scroll" perspective="strong" />

<RetroGrid theme="cyberpunk" animation="wave" gridSize="large" opacity="0.7" />`,
      preview: <div className="bg-gradient-to-b from-purple-900 to-pink-900 p-4 rounded relative overflow-hidden h-24">
        <div className="absolute inset-0 opacity-50">
          <div className="h-full w-full" style={{
            backgroundImage: 'linear-gradient(0deg, rgba(255,0,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,0,255,0.3) 1px, transparent 1px)',
            backgroundSize: '20px 20px',
            transform: 'perspective(100px) rotateX(45deg)'
          }}></div>
        </div>
      </div>
    }
  ],
  content: [
    {
      name: 'DisplayName',
      description: 'Shows your display name with customizable styling and element type. ✨ Supports UniversalCSSProps!',
      props: [
        { name: 'as', type: 'string', options: ['h1', 'h2', 'h3', 'h4', 'div', 'span', 'p'], default: 'h2', description: 'HTML element to render as' },
        { name: 'showLabel', type: 'boolean', options: ['true', 'false'], default: 'false', description: 'Show "Name:" label before display name' },
        { name: 'class', type: 'string', options: ['any CSS classes'], default: 'none', description: 'Custom CSS classes to apply' },
        { name: '+ UniversalCSSProps', type: 'all CSS properties', options: [], default: '', description: 'ALL CSS styling properties (backgroundColor, fontSize, padding, etc.)' }
      ],
      example: `<!-- Basic usage -->
<DisplayName as="h1" />

<!-- With CSS styling props -->
<DisplayName
  as="h1"
  fontSize="3rem"
  fontWeight="bold"
  backgroundColor="#667eea"
  color="white"
  padding="1rem 2rem"
  borderRadius="0.5rem"
/>

<!-- Legacy class approach -->
<DisplayName as="h3" class="text-4xl font-bold" />`,
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
      description: '📦 CONTAINER - Wraps hero section with profile photo, name, and social links in one container',
      props: [
        { name: 'layout', type: 'string', options: ['horizontal', 'vertical'], default: 'horizontal', description: 'Layout direction' },
        { name: 'showBio', type: 'boolean', options: ['true', 'false'], default: 'true', description: 'Include bio in hero section' },
        { name: 'class', type: 'string', options: ['any CSS classes'], default: 'none', description: 'Custom CSS classes' }
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
      description: 'Display user profile image with fallback and customization options. Use for avatars with status indicators and small profile images.',
      whenToUse: 'For user avatars, status indicators, and interactive profile images in lists or small contexts.',
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
          <div className="text-xs text-gray-500">Joined Oct &apos;24</div>
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
        { name: 'class', type: 'string', options: ['any CSS classes'], default: 'none', description: 'Custom CSS classes to apply to bio section' },
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
      description: '📦 CONTAINER - Wraps and displays your recent blog posts in a styled list',
      props: [
        { name: 'limit', type: 'number', options: ['1', '2', '3', '5', '10'], default: '5', description: 'Maximum number of posts to show' },
        { name: 'class', type: 'string', options: ['any CSS classes'], default: 'none', description: 'Custom CSS classes for the posts container' },
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
      description: 'Display your profile photo with decorative frame, border, and shadow options. Perfect for hero sections and main profile displays.',
      whenToUse: 'For large hero profile photos, decorative displays, and when you want custom frames/borders/shadows.',
      props: [
        { name: 'size', type: 'string', options: ['sm', 'md', 'lg', 'xl'], default: 'md', description: 'Photo size (sm=64px, md=96px, lg=128px, xl=192px)' },
        { name: 'shape', type: 'string', options: ['circle', 'square', 'rounded'], default: 'circle', description: 'Photo shape style' },
        { name: 'class', type: 'string', options: ['any CSS classes'], default: 'none', description: 'Custom CSS classes for photo wrapper' },
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
    },
    {
      name: '✨ Universal CSS Styling',
      description: 'ALL content components support UniversalCSSProps for complete styling control',
      props: [
        { name: 'backgroundColor', type: 'string', options: [], default: '', description: 'Background color (hex, rgb, named)' },
        { name: 'color', type: 'string', options: [], default: '', description: 'Text color' },
        { name: 'fontSize', type: 'string', options: [], default: '', description: 'Font size (px, rem, em)' },
        { name: 'padding', type: 'string', options: [], default: '', description: 'Padding (all sides or individual)' },
        { name: 'margin', type: 'string', options: [], default: '', description: 'Margin spacing' },
        { name: 'borderRadius', type: 'string', options: [], default: '', description: 'Border radius' },
        { name: 'boxShadow', type: 'string', options: [], default: '', description: 'Drop shadow' },
        { name: '...and 50+ more', type: 'all CSS', options: [], default: '', description: 'Every CSS property is supported!' }
      ],
      example: `<!-- Apply CSS props to ANY content component! -->
<DisplayName
  backgroundColor="#667eea"
  color="white"
  fontSize="2.5rem"
  padding="1rem 2rem"
  borderRadius="0.75rem"
  boxShadow="0 10px 30px rgba(0,0,0,0.2)"
/>

<Bio
  backgroundColor="#f3f4f6"
  padding="2rem"
  borderRadius="1rem"
  fontSize="1.125rem"
  lineHeight="1.75"
/>

<ProfilePhoto
  borderRadius="50%"
  boxShadow="0 0 20px rgba(102, 126, 234, 0.5)"
  border="4px solid #667eea"
/>`,
      preview: (
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-4 rounded-lg shadow-lg">
          <div className="text-sm font-bold mb-2">🎨 Universal CSS Props</div>
          <div className="text-xs space-y-1">
            <div><PixelIcon name="check" /> All 59 components migrated</div>
            <div><PixelIcon name="check" /> Standard CSS property names</div>
            <div><PixelIcon name="check" /> Real-time preview in Visual Builder</div>
          </div>
        </div>
      ),
      tutorial: `
**Every Content Component Supports UniversalCSSProps!**

**What This Means:**
You can apply standard CSS properties to ANY component in the content category (and all other categories too!). No more custom styling classes required.

**Supported Properties:**
- **Colors**: backgroundColor, color, borderColor, opacity
- **Typography**: fontSize, fontFamily, fontWeight, lineHeight, letterSpacing, textAlign
- **Spacing**: padding, margin, gap
- **Borders**: border, borderRadius, borderWidth, borderStyle
- **Effects**: boxShadow, transform, filter
- **Layout**: width, height, minWidth, maxWidth, position, zIndex
- **And many more!**

**How to Use:**
1. Select any component in Visual Builder
2. Open Property Panel → Style tab
3. Use CSS property editors to set values
4. See changes in real-time!

**Example - Styled DisplayName:**
\`\`\`jsx
<DisplayName
  as="h1"
  fontSize="3rem"
  fontWeight="900"
  background="linear-gradient(45deg, #667eea, #764ba2)"
  backgroundClip="text"
  color="transparent"
  padding="2rem"
  textAlign="center"
/>
\`\`\`

**Example - Styled Bio:**
\`\`\`jsx
<Bio
  backgroundColor="rgba(255, 255, 255, 0.9)"
  backdropFilter="blur(10px)"
  padding="2rem"
  borderRadius="1.5rem"
  boxShadow="0 20px 60px rgba(0,0,0,0.15)"
  fontSize="1.125rem"
  lineHeight="1.8"
  maxWidth="600px"
  margin="0 auto"
/>
\`\`\`

**Why This Is Powerful:**
- No need to write custom CSS
- Visual property editors with validation
- Works across all 59 components
- User styling ALWAYS wins (overrides defaults)
- Backward compatible with existing templates
      `
    }
  ],
  layout: [
    {
      name: 'FlexContainer',
      description: '📦 CONTAINER - Wraps content in flexible box layouts using CSS Flexbox property names',
      props: [
        { name: 'flexDirection', type: 'string', options: ['row', 'row-reverse', 'column', 'column-reverse'], default: 'row', description: 'CSS flex-direction property' },
        { name: 'alignItems', type: 'string', options: ['flex-start', 'center', 'flex-end', 'stretch', 'baseline'], default: 'flex-start', description: 'CSS align-items (cross-axis alignment)' },
        { name: 'justifyContent', type: 'string', options: ['flex-start', 'center', 'flex-end', 'space-between', 'space-around', 'space-evenly'], default: 'flex-start', description: 'CSS justify-content (main axis alignment)' },
        { name: 'flexWrap', type: 'string', options: ['nowrap', 'wrap', 'wrap-reverse'], default: 'nowrap', description: 'CSS flex-wrap property' },
        { name: 'gap', type: 'string', options: [], default: '1rem', description: 'Gap between items (CSS length: px, rem, em, %)' }
      ],
      example: `<!-- Standard CSS Flexbox properties -->
<FlexContainer flexDirection="row" justifyContent="space-between" gap="1rem">
  <div>Left content</div>
  <div>Right content</div>
</FlexContainer>

<!-- Vertical centering -->
<FlexContainer flexDirection="column" alignItems="center" gap="0.5rem">
  <div>Item 1</div>
  <div>Item 2</div>
</FlexContainer>

<!-- Responsive with wrapping -->
<FlexContainer flexWrap="wrap" gap="2rem" justifyContent="center">
  <div>Card 1</div>
  <div>Card 2</div>
  <div>Card 3</div>
</FlexContainer>`,
      preview: (
        <div className="flex justify-between items-center gap-2 text-xs bg-blue-50 p-2 rounded">
          <div className="bg-blue-200 p-1">Left</div>
          <div className="bg-blue-200 p-1">Right</div>
        </div>
      ),
      tutorial: `
**FlexContainer - CSS Flexbox Component:**

**Uses Standard CSS Property Names:**
This component uses real CSS Flexbox property names, not custom abstractions. If you know CSS Flexbox, you already know how to use this component!

**CSS Properties:**
- \`flexDirection\`: "row" | "row-reverse" | "column" | "column-reverse"
- \`justifyContent\`: "flex-start" | "center" | "flex-end" | "space-between" | "space-around" | "space-evenly"
- \`alignItems\`: "flex-start" | "center" | "flex-end" | "stretch" | "baseline"
- \`flexWrap\`: "nowrap" | "wrap" | "wrap-reverse"
- \`gap\`: Any CSS length (1rem, 16px, 1em, 2%, etc.)

**Common Patterns:**

**Horizontal Layout with Spacing:**
\`\`\`jsx
<FlexContainer flexDirection="row" gap="1rem">
  <div>Item 1</div>
  <div>Item 2</div>
  <div>Item 3</div>
</FlexContainer>
\`\`\`

**Space Between Layout:**
\`\`\`jsx
<FlexContainer justifyContent="space-between" alignItems="center">
  <div>Left</div>
  <div>Right</div>
</FlexContainer>
\`\`\`

**Centered Content:**
\`\`\`jsx
<FlexContainer justifyContent="center" alignItems="center" flexDirection="column">
  <h1>Title</h1>
  <p>Centered content</p>
</FlexContainer>
\`\`\`

**Responsive Card Grid:**
\`\`\`jsx
<FlexContainer flexWrap="wrap" gap="2rem" justifyContent="flex-start">
  <Card />
  <Card />
  <Card />
</FlexContainer>
\`\`\`

**Plus UniversalCSSProps:**
Like all components, FlexContainer also accepts all universal CSS properties:
- backgroundColor, padding, margin
- borderRadius, boxShadow
- width, height, minHeight, maxHeight
- All CSS styling properties
      `
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
      name: 'Grid',
      description: '🎯 NEW - Professional CSS Grid container with visual overlay and complete CSS Grid support',
      props: [
        { name: 'gridTemplateColumns', type: 'string', options: [], default: 'repeat(3, 1fr)', description: 'CSS Grid column template (e.g., "repeat(3, 1fr)", "200px auto 1fr")' },
        { name: 'gridTemplateRows', type: 'string', options: [], default: 'auto', description: 'CSS Grid row template (e.g., "auto", "100px 1fr auto")' },
        { name: 'gap', type: 'string', options: [], default: '1rem', description: 'Gap between grid cells (CSS length)' },
        { name: 'rowGap', type: 'string', options: [], default: '', description: 'Gap between rows (overrides gap)' },
        { name: 'columnGap', type: 'string', options: [], default: '', description: 'Gap between columns (overrides gap)' },
        { name: 'alignItems', type: 'string', options: ['start', 'end', 'center', 'stretch'], default: 'stretch', description: 'Align items vertically in cells' },
        { name: 'justifyItems', type: 'string', options: ['start', 'end', 'center', 'stretch'], default: 'stretch', description: 'Align items horizontally in cells' },
        { name: 'columns', type: 'number', options: [], default: '', description: 'Shorthand: number of equal columns (converts to repeat(n, 1fr))' },
        { name: 'rows', type: 'number', options: [], default: '', description: 'Shorthand: number of rows (converts to repeat(n, auto))' }
      ],
      example: `<!-- Standard CSS Grid -->
<Grid gridTemplateColumns="repeat(3, 1fr)" gap="1rem">
  <GridItem>Cell 1</GridItem>
  <GridItem>Cell 2</GridItem>
  <GridItem>Cell 3</GridItem>
</Grid>

<!-- Shorthand for equal columns -->
<Grid columns={4} gap="2rem">
  <GridItem>Item 1</GridItem>
  <GridItem>Item 2</GridItem>
  <GridItem>Item 3</GridItem>
  <GridItem>Item 4</GridItem>
</Grid>

<!-- Advanced: Custom column sizes -->
<Grid gridTemplateColumns="200px 1fr 1fr" gridTemplateRows="auto 1fr" gap="1.5rem">
  <GridItem gridColumn="1 / -1">Header spans all columns</GridItem>
  <GridItem>Sidebar</GridItem>
  <GridItem>Main content</GridItem>
  <GridItem>Right panel</GridItem>
</Grid>`,
      preview: (
        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="bg-purple-200 p-2 text-center border border-purple-400">1</div>
            <div className="bg-purple-200 p-2 text-center border border-purple-400">2</div>
            <div className="bg-purple-200 p-2 text-center border border-purple-400">3</div>
          </div>
          <div className="text-xs text-purple-600">With visual grid overlay in builder</div>
        </div>
      ),
      tutorial: `
**CSS Grid Component (NEW):**

**What Makes It Special:**
- Uses standard CSS Grid property names (no custom abstractions)
- Visual overlay shows grid lines and track numbers in Visual Builder
- Smart snapping to grid lines during drag operations
- Full CSS Grid specification support

**Basic Usage:**
\`\`\`jsx
<Grid gridTemplateColumns="repeat(3, 1fr)" gap="1rem">
  <GridItem>Content 1</GridItem>
  <GridItem>Content 2</GridItem>
  <GridItem>Content 3</GridItem>
</Grid>
\`\`\`

**Convenience Shortcuts:**
Instead of writing \`gridTemplateColumns="repeat(3, 1fr)"\`, you can use:
\`\`\`jsx
<Grid columns={3} gap="1rem">
  {/* Creates 3 equal columns */}
</Grid>
\`\`\`

**Advanced Grid Templates:**
\`\`\`jsx
// Fixed sidebar + fluid content
<Grid gridTemplateColumns="250px 1fr" gap="2rem">

// Auto-fit responsive columns
<Grid gridTemplateColumns="repeat(auto-fit, minmax(200px, 1fr))" gap="1rem">

// Complex multi-row layout
<Grid
  gridTemplateColumns="1fr 2fr 1fr"
  gridTemplateRows="auto 1fr auto"
  gap="1.5rem"
>
\`\`\`

**Visual Builder Features:**
- **Grid Overlay**: See grid lines and track numbers
- **Smart Snapping**: Components snap to grid cells
- **Cell Highlighting**: Visual feedback when dragging
- **Property Panel**: All CSS Grid properties available
- **Responsive**: Works with breakpoint preview system

**CSS Properties Supported:**
- gridTemplateColumns, gridTemplateRows, gridTemplateAreas
- gridAutoColumns, gridAutoRows, gridAutoFlow
- gap, rowGap, columnGap
- alignItems, justifyItems, alignContent, justifyContent
- Plus ALL UniversalCSSProps (backgroundColor, padding, etc.)
      `
    },
    {
      name: 'GridItem',
      description: '🎯 NEW - Grid child component with CSS Grid positioning properties',
      props: [
        { name: 'gridColumn', type: 'string', options: [], default: '', description: 'CSS Grid column position (e.g., "1 / 3", "span 2")' },
        { name: 'gridRow', type: 'string', options: [], default: '', description: 'CSS Grid row position (e.g., "1 / 3", "span 2")' },
        { name: 'gridArea', type: 'string', options: [], default: '', description: 'Grid area name (if using gridTemplateAreas)' },
        { name: 'justifySelf', type: 'string', options: ['start', 'end', 'center', 'stretch'], default: '', description: 'Horizontal alignment in cell' },
        { name: 'alignSelf', type: 'string', options: ['start', 'end', 'center', 'stretch'], default: '', description: 'Vertical alignment in cell' },
        { name: 'column', type: 'number', options: [], default: '', description: 'Shorthand: grid column number' },
        { name: 'row', type: 'number', options: [], default: '', description: 'Shorthand: grid row number' },
        { name: 'colSpan', type: 'number', options: [], default: '', description: 'Shorthand: span this many columns' },
        { name: 'rowSpan', type: 'number', options: [], default: '', description: 'Shorthand: span this many rows' }
      ],
      example: `<!-- Span multiple columns -->
<GridItem gridColumn="1 / 3">
  Spans columns 1-2
</GridItem>

<!-- Shorthand for spanning -->
<GridItem colSpan={2}>
  Spans 2 columns
</GridItem>

<!-- Position and span rows -->
<GridItem gridRow="2 / 4">
  Spans rows 2-3
</GridItem>

<!-- Center content in cell -->
<GridItem justifySelf="center" alignSelf="center">
  Centered in cell
</GridItem>`,
      preview: (
        <div className="grid grid-cols-3 gap-1 text-xs">
          <div className="bg-indigo-200 p-2 col-span-2 text-center border border-indigo-400">
            Spans 2 columns
          </div>
          <div className="bg-indigo-200 p-2 text-center border border-indigo-400">1</div>
          <div className="bg-indigo-200 p-2 text-center border border-indigo-400">2</div>
          <div className="bg-indigo-200 p-2 text-center border border-indigo-400">3</div>
          <div className="bg-indigo-200 p-2 text-center border border-indigo-400">4</div>
        </div>
      ),
      tutorial: `
**GridItem Component (NEW):**

**What It Does:**
GridItem is a wrapper component that adds CSS Grid positioning properties to its children. Use it inside a Grid component to control placement and spanning.

**Basic Positioning:**
\`\`\`jsx
// Standard CSS syntax
<GridItem gridColumn="1 / 3" gridRow="1">
  Positioned at column 1-2, row 1
</GridItem>

// Shorthand syntax
<GridItem column={1} row={1} colSpan={2}>
  Same result, easier to write
</GridItem>
\`\`\`

**Spanning Cells:**
\`\`\`jsx
// Span 2 columns
<GridItem gridColumn="span 2">Content</GridItem>

// Or use shorthand
<GridItem colSpan={2}>Content</GridItem>

// Span rows
<GridItem rowSpan={3}>Tall content</GridItem>
\`\`\`

**Alignment Within Cell:**
\`\`\`jsx
// Center horizontally and vertically
<GridItem justifySelf="center" alignSelf="center">
  Centered
</GridItem>

// Align to end of cell
<GridItem justifySelf="end" alignSelf="start">
  Top-right aligned
</GridItem>
\`\`\`

**Grid Areas (Advanced):**
\`\`\`jsx
<Grid gridTemplateAreas={[
  "header header header",
  "sidebar content content",
  "footer footer footer"
]}>
  <GridItem gridArea="header">Header</GridItem>
  <GridItem gridArea="sidebar">Sidebar</GridItem>
  <GridItem gridArea="content">Main</GridItem>
  <GridItem gridArea="footer">Footer</GridItem>
</Grid>
\`\`\`

**Visual Builder Features:**
- **Property Panel**: Edit grid position visually
- **Snapping**: Automatically snaps to grid cells
- **Visual Feedback**: See target cell while dragging
- **Span Controls**: Easy UI for colSpan/rowSpan

**All UniversalCSSProps Supported:**
Like every component, GridItem also accepts:
- backgroundColor, padding, margin
- borderRadius, boxShadow
- All CSS styling properties

**Common Patterns:**
\`\`\`jsx
// Full-width header
<GridItem gridColumn="1 / -1">Header</GridItem>

// Sidebar that spans multiple rows
<GridItem gridRow="1 / -1">Sidebar</GridItem>

// Featured item spanning 2x2
<GridItem colSpan={2} rowSpan={2}>Featured</GridItem>
\`\`\`
      `
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
      description: '📦 CONTAINER - Wraps content with colorful gradient backgrounds and customizable colors',
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
      description: '📦 CONTAINER - Wraps content with glowing neon border effects and customizable colors and intensity',
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
      description: '📦 CONTAINER - Wraps content in sticky note styling with various colors and rotation effects',
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
      description: '📦 CONTAINER - Wraps content in old-school computer terminal styling',
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
      description: '📦 CONTAINER - Wraps content that shows/hides with hover or click',
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
      description: '📦 CONTAINER - Wraps Tab components to create a tabbed interface for organizing content',
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
    },
    {
      name: 'ProgressTracker',
      description: 'Visual progress tracking with multiple display modes and themes',
      props: [
        { name: 'title', type: 'string', options: ['any text'], default: 'none', description: 'Section heading' },
        { name: 'display', type: 'string', options: ['bars', 'stars', 'circles', 'dots'], default: 'bars', description: 'Visual display mode' },
        { name: 'theme', type: 'string', options: ['modern', 'retro', 'neon', 'minimal'], default: 'modern', description: 'Color and styling theme' },
        { name: 'showValues', type: 'boolean', options: ['true', 'false'], default: 'true', description: 'Show numeric values' },
        { name: 'layout', type: 'string', options: ['vertical', 'horizontal'], default: 'vertical', description: 'Item arrangement' },
        { name: 'size', type: 'string', options: ['sm', 'md', 'lg'], default: 'md', description: 'Component size' }
      ],
      example: `<ProgressTracker title="My Skills" display="bars" theme="modern">
  <ProgressItem label="React" value="85" color="blue" />
  <ProgressItem label="TypeScript" value="75" color="green" />
  <ProgressItem label="CSS" value="90" color="purple" />
</ProgressTracker>

<ProgressTracker title="Project Ratings" display="stars">
  <ProgressItem label="Website Design" value="4" max="5" />
  <ProgressItem label="Mobile App" value="9" max="10" />
</ProgressTracker>

<ProgressTracker title="Goals 2024" display="circles" theme="neon">
  <ProgressItem label="Fitness" value="75" color="red" />
  <ProgressItem label="Learning" value="60" color="purple" />
</ProgressTracker>

<ProgressTracker title="Skill Levels" display="dots" layout="horizontal">
  <ProgressItem label="JavaScript" value="8" max="10" />
  <ProgressItem label="Python" value="6" max="10" />
</ProgressTracker>`,
      preview: (
        <div className="text-xs space-y-2">
          <div className="font-semibold">My Skills</div>
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <span>React</span>
              <span className="text-gray-600">85%</span>
            </div>
            <div className="bg-gray-200 rounded-full h-2">
              <div className="bg-blue-500 h-2 rounded-full" style={{width: '85%'}}></div>
            </div>
            <div className="flex justify-between items-center">
              <span>TypeScript</span>
              <span className="text-gray-600">75%</span>
            </div>
            <div className="bg-gray-200 rounded-full h-2">
              <div className="bg-green-500 h-2 rounded-full" style={{width: '75%'}}></div>
            </div>
          </div>
        </div>
      ),
      stylingGuide: {
        classes: [
          {
            name: '.ts-progress-tracker',
            description: 'Main container element'
          },
          {
            name: '.ts-progress-tracker-title',
            description: 'Section title heading'
          },
          {
            name: '.ts-progress-item',
            description: 'Individual progress item container'
          },
          {
            name: '.ts-progress-label',
            description: 'Progress item label text'
          },
          {
            name: '.ts-progress-value',
            description: 'Progress value display'
          },
          {
            name: '.ts-progress-bar-track',
            description: 'Progress bar background track'
          },
          {
            name: '.ts-progress-bar-fill',
            description: 'Progress bar fill element'
          },
          {
            name: '.ts-progress-stars',
            description: 'Star rating container'
          },
          {
            name: '.ts-progress-circle',
            description: 'Circular progress indicator'
          },
          {
            name: '.ts-progress-dots',
            description: 'Dot progress container'
          }
        ],
        examples: [
          {
            title: 'Glowing Neon Progress Bars',
            css: `.ts-progress-bar-fill {
  background: linear-gradient(90deg, #00ffff, #ff00ff) !important;
  box-shadow: 0 0 10px #00ffff, 0 0 20px #ff00ff !important;
  animation: glow-pulse 2s ease-in-out infinite alternate !important;
}

@keyframes glow-pulse {
  from { box-shadow: 0 0 5px #00ffff, 0 0 10px #ff00ff; }
  to { box-shadow: 0 0 15px #00ffff, 0 0 30px #ff00ff; }
}`
          },
          {
            title: 'Retro Gaming Style',
            css: `.ts-progress-tracker {
  background: #000 !important;
  border: 2px solid #00ff00 !important;
  padding: 1rem !important;
  font-family: 'Courier New', monospace !important;
}

.ts-progress-label {
  color: #00ff00 !important;
  text-transform: uppercase !important;
}

.ts-progress-bar-track {
  background: #333 !important;
  border: 1px solid #00ff00 !important;
}

.ts-progress-bar-fill {
  background: linear-gradient(90deg, #ff0000, #ffff00, #00ff00) !important;
}`
          },
          {
            title: 'Minimal Clean Style',
            css: `.ts-progress-tracker {
  background: #f8f9fa !important;
  border-radius: 8px !important;
  padding: 1.5rem !important;
}

.ts-progress-label {
  font-weight: 600 !important;
  color: #495057 !important;
}

.ts-progress-bar-track {
  background: #e9ecef !important;
  height: 6px !important;
}

.ts-progress-bar-fill {
  background: #6c757d !important;
  border-radius: 3px !important;
}`
          }
        ]
      }
    },
    {
      name: 'ImageCarousel',
      description: 'Interactive image gallery with multiple display modes and navigation options',
      props: [
        { name: 'autoplay', type: 'boolean', options: ['true', 'false'], default: 'false', description: 'Auto-advance slides' },
        { name: 'interval', type: 'number', options: ['1', '3', '5', '10'], default: '5', description: 'Autoplay interval in seconds' },
        { name: 'showThumbnails', type: 'boolean', options: ['true', 'false'], default: 'true', description: 'Show thumbnail navigation' },
        { name: 'showDots', type: 'boolean', options: ['true', 'false'], default: 'true', description: 'Show dot indicators' },
        { name: 'showArrows', type: 'boolean', options: ['true', 'false'], default: 'true', description: 'Show prev/next arrows' },
        { name: 'height', type: 'string', options: ['sm', 'md', 'lg', 'xl'], default: 'md', description: 'Carousel height' },
        { name: 'transition', type: 'string', options: ['slide', 'fade', 'zoom'], default: 'slide', description: 'Transition effect' },
        { name: 'loop', type: 'boolean', options: ['true', 'false'], default: 'true', description: 'Loop back to start' },
        { name: 'controls', type: 'string', options: ['arrows', 'dots', 'thumbnails', 'all'], default: 'all', description: 'Which controls to show' }
      ],
      example: `<!-- Uses your uploaded images automatically -->
<ImageCarousel height="lg" transition="fade" showThumbnails="true" />

<!-- Custom image gallery -->
<ImageCarousel autoplay="true" interval="3" controls="dots">
  <CarouselImage src="/art1.jpg" caption="Digital Art #1" />
  <CarouselImage src="/art2.jpg" caption="Digital Art #2" link="https://artsite.com" />
  <CarouselImage src="/art3.jpg" caption="Digital Art #3" />
</ImageCarousel>

<!-- Portfolio showcase -->
<ImageCarousel height="xl" transition="zoom" controls="all">
  <CarouselImage src="/project1.jpg" alt="Project 1" caption="E-commerce Website" />
  <CarouselImage src="/project2.jpg" alt="Project 2" caption="Mobile App Design" />
  <CarouselImage src="/project3.jpg" alt="Project 3" caption="Brand Identity" />
</ImageCarousel>

<!-- Simple photo strip -->
<ImageCarousel height="sm" showThumbnails="false" controls="arrows" />`,
      preview: (
        <div className="text-xs bg-gray-100 rounded-lg overflow-hidden">
          <div className="bg-blue-200 h-32 flex items-center justify-center relative">
            <div className="text-blue-700 font-medium">🖼️ Main Image Display</div>
            <div className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">
              ←
            </div>
            <div className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">
              →
            </div>
            <div className="absolute bottom-2 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-2">
              <div className="text-white text-xs">Image Caption</div>
            </div>
          </div>
          <div className="flex gap-1 p-2">
            <div className="w-8 h-6 bg-blue-300 rounded border-2 border-blue-500"></div>
            <div className="w-8 h-6 bg-gray-300 rounded border border-gray-400"></div>
            <div className="w-8 h-6 bg-gray-300 rounded border border-gray-400"></div>
          </div>
          <div className="flex justify-center gap-1 p-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
            <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
          </div>
        </div>
      ),
      stylingGuide: {
        classes: [
          {
            name: '.ts-image-carousel',
            description: 'Main carousel container'
          },
          {
            name: '.ts-carousel-main',
            description: 'Main image display area'
          },
          {
            name: '.ts-carousel-slide',
            description: 'Individual image slide'
          },
          {
            name: '.ts-carousel-caption',
            description: 'Image caption overlay'
          },
          {
            name: '.ts-carousel-arrow',
            description: 'Navigation arrow buttons'
          },
          {
            name: '.ts-carousel-arrow-prev',
            description: 'Previous arrow button'
          },
          {
            name: '.ts-carousel-arrow-next',
            description: 'Next arrow button'
          },
          {
            name: '.ts-carousel-thumbnails',
            description: 'Thumbnail navigation container'
          },
          {
            name: '.ts-carousel-thumbnail',
            description: 'Individual thumbnail button'
          },
          {
            name: '.ts-carousel-dots',
            description: 'Dot indicator container'
          },
          {
            name: '.ts-carousel-dot',
            description: 'Individual dot indicator'
          },
          {
            name: '.ts-carousel-play-pause',
            description: 'Play/pause button for autoplay'
          }
        ],
        examples: [
          {
            title: 'Cyberpunk Neon Style',
            css: `.ts-image-carousel {
  background: #000 !important;
  border: 2px solid #00ffff !important;
  box-shadow: 0 0 20px #00ffff !important;
}

.ts-carousel-caption {
  background: linear-gradient(to top, #ff00ff, transparent) !important;
  border-top: 1px solid #00ffff !important;
}

.ts-carousel-arrow {
  background: linear-gradient(45deg, #ff00ff, #00ffff) !important;
  border: none !important;
  box-shadow: 0 0 10px #ff00ff !important;
}

.ts-carousel-dot {
  background: #00ffff !important;
  box-shadow: 0 0 5px #00ffff !important;
}

.ts-carousel-thumbnail {
  border-color: #00ffff !important;
  filter: brightness(0.7) contrast(1.2) !important;
}`
          },
          {
            title: 'Elegant Gallery Style',
            css: `.ts-image-carousel {
  background: #f8f9fa !important;
  border-radius: 12px !important;
  box-shadow: 0 8px 32px rgba(0,0,0,0.1) !important;
  overflow: hidden !important;
}

.ts-carousel-main {
  border-radius: 8px !important;
  overflow: hidden !important;
}

.ts-carousel-caption {
  background: linear-gradient(to top, rgba(0,0,0,0.8), transparent) !important;
  backdrop-filter: blur(4px) !important;
}

.ts-carousel-arrow {
  background: rgba(255,255,255,0.9) !important;
  color: #333 !important;
  backdrop-filter: blur(4px) !important;
  border: 1px solid rgba(255,255,255,0.3) !important;
}

.ts-carousel-thumbnails {
  background: rgba(255,255,255,0.95) !important;
  backdrop-filter: blur(8px) !important;
}

.ts-carousel-dot {
  background: rgba(0,0,0,0.3) !important;
  transition: all 0.3s ease !important;
}

.ts-carousel-dot:hover {
  background: rgba(0,0,0,0.6) !important;
  transform: scale(1.2) !important;
}`
          },
          {
            title: 'Retro Polaroid Style',
            css: `.ts-image-carousel {
  background: #f4f1e8 !important;
  border: 8px solid #fff !important;
  box-shadow: 0 4px 16px rgba(0,0,0,0.3) !important;
  transform: rotate(-1deg) !important;
  font-family: 'Comic Sans MS', cursive !important;
}

.ts-carousel-main img {
  filter: sepia(10%) contrast(1.1) brightness(1.1) !important;
}

.ts-carousel-caption {
  background: #fff !important;
  color: #333 !important;
  font-family: 'Comic Sans MS', cursive !important;
  text-align: center !important;
  border-top: 2px solid #ddd !important;
}

.ts-carousel-arrow {
  background: #ff6b6b !important;
  color: white !important;
  font-weight: bold !important;
  transform: rotate(0deg) !important;
}

.ts-carousel-thumbnails {
  background: #fff !important;
  border-top: 2px solid #ddd !important;
}

.ts-carousel-thumbnail {
  border: 3px solid #fff !important;
  box-shadow: 0 2px 8px rgba(0,0,0,0.2) !important;
  transform: rotate(1deg) !important;
}

.ts-carousel-thumbnail:nth-child(even) {
  transform: rotate(-1deg) !important;
}`
          }
        ]
      }
    },
    {
      name: 'ContactCard',
      description: 'Interactive contact information display with copy functionality and multiple layouts',
      props: [
        { name: 'expanded', type: 'boolean', options: ['true', 'false'], default: 'false', description: 'Initially show all contact methods' },
        { name: 'theme', type: 'string', options: ['modern', 'business', 'creative', 'minimal'], default: 'modern', description: 'Visual theme style' },
        { name: 'layout', type: 'string', options: ['compact', 'detailed', 'grid'], default: 'compact', description: 'Information display layout' },
        { name: 'showHeader', type: 'boolean', options: ['true', 'false'], default: 'true', description: 'Show card header with title' },
        { name: 'collapsible', type: 'boolean', options: ['true', 'false'], default: 'true', description: 'Allow expand/collapse functionality' },
        { name: 'maxMethods', type: 'number', options: ['1', '2', '3', '4', '5'], default: '3', description: 'Max methods shown when collapsed' },
        { name: 'title', type: 'string', options: ['any text'], default: 'Contact Me', description: 'Card header title' }
      ],
      example: `<!-- Professional business card -->
<ContactCard theme="business" layout="detailed" title="Get In Touch">
  <ContactMethod type="email" value="john@company.com" />
  <ContactMethod type="phone" value="+1-555-0123" />
  <ContactMethod type="linkedin" value="linkedin.com/in/johndoe" />
</ContactCard>

<!-- Creative contact card -->
<ContactCard theme="creative" layout="grid" expanded="true">
  <ContactMethod type="email" value="hello@designer.com" label="Email Me" />
  <ContactMethod type="website" value="myportfolio.com" label="Portfolio" />
  <ContactMethod type="github" value="github.com/designer" label="Code" />
  <ContactMethod type="website" value="designer.social" label="Social" />
</ContactCard>

<!-- Minimal contact strip -->
<ContactCard theme="minimal" layout="compact" showHeader="false" collapsible="false">
  <ContactMethod type="email" value="contact@site.com" copyable="false" />
  <ContactMethod type="discord" value="username#1234" priority="10" />
</ContactCard>

<!-- Auto-expanding professional card -->
<ContactCard theme="modern" maxMethods="2" title="Contact Information">
  <ContactMethod type="email" value="sarah.wilson@tech.com" priority="10" />
  <ContactMethod type="phone" value="(555) 987-6543" priority="9" />
  <ContactMethod type="linkedin" value="linkedin.com/in/sarahwilson" priority="8" />
  <ContactMethod type="github" value="github.com/swilson" priority="7" />
  <ContactMethod type="website" value="sarahwilson.dev" priority="6" />
</ContactCard>`,
      preview: (
        <div className="text-xs bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gray-50 border-b border-gray-200 px-3 py-2 flex justify-between items-center">
            <div className="font-semibold text-gray-800">Contact Me</div>
            <div className="text-gray-500">↕</div>
          </div>
          <div className="p-3 space-y-2">
            <div className="flex justify-between items-center group">
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <span>📧</span>
                  <span className="text-gray-600">Email</span>
                </div>
                <div className="text-blue-600 underline">john@example.com</div>
              </div>
              <button className="text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100">📋</button>
            </div>
            <div className="flex justify-between items-center group">
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <span>📞</span>
                  <span className="text-gray-600">Phone</span>
                </div>
                <div className="text-blue-600 underline">+1-555-0123</div>
              </div>
              <button className="text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100">📋</button>
            </div>
          </div>
        </div>
      ),
      stylingGuide: {
        classes: [
          {
            name: '.ts-contact-card',
            description: 'Main contact card container'
          },
          {
            name: '.ts-contact-header',
            description: 'Card header with title and toggle'
          },
          {
            name: '.ts-contact-method',
            description: 'Individual contact method item'
          },
          {
            name: '.ts-contact-value',
            description: 'Contact value/link text'
          },
          {
            name: '.ts-contact-icon',
            description: 'Contact type icon'
          },
          {
            name: '.ts-contact-action',
            description: 'Copy button and other actions'
          }
        ],
        examples: [
          {
            title: 'Professional Dark Theme',
            css: `.ts-contact-card {
  background: #1a1a1a !important;
  border: 1px solid #333 !important;
  color: #ffffff !important;
}

.ts-contact-header {
  background: #2d2d2d !important;
  border-bottom: 1px solid #444 !important;
}

.ts-contact-method:hover {
  background: #2a2a2a !important;
}

.ts-contact-value {
  color: #60a5fa !important;
}

.ts-contact-icon {
  color: #fbbf24 !important;
}

.ts-contact-action {
  color: #10b981 !important;
}`
          },
          {
            title: 'Glassmorphism Style',
            css: `.ts-contact-card {
  background: rgba(255, 255, 255, 0.25) !important;
  backdrop-filter: blur(10px) !important;
  border: 1px solid rgba(255, 255, 255, 0.18) !important;
  box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37) !important;
}

.ts-contact-header {
  background: rgba(255, 255, 255, 0.1) !important;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
}

.ts-contact-method:hover {
  background: rgba(255, 255, 255, 0.2) !important;
}

.ts-contact-value {
  color: #1e40af !important;
  font-weight: 500 !important;
}

.ts-contact-action {
  background: rgba(255, 255, 255, 0.2) !important;
  border-radius: 50% !important;
}`
          },
          {
            title: 'Neon Cyberpunk Card',
            css: `.ts-contact-card {
  background: #0a0a0a !important;
  border: 2px solid #00ffff !important;
  box-shadow: 0 0 20px rgba(0, 255, 255, 0.3) !important;
  font-family: 'Courier New', monospace !important;
}

.ts-contact-header {
  background: linear-gradient(45deg, #001122, #002244) !important;
  border-bottom: 1px solid #00ffff !important;
  color: #00ffff !important;
  text-transform: uppercase !important;
  letter-spacing: 2px !important;
}

.ts-contact-method {
  border-bottom: 1px solid #003344 !important;
}

.ts-contact-method:hover {
  background: rgba(0, 255, 255, 0.05) !important;
  box-shadow: inset 0 0 10px rgba(0, 255, 255, 0.1) !important;
}

.ts-contact-value {
  color: #00ff88 !important;
  text-shadow: 0 0 5px rgba(0, 255, 136, 0.5) !important;
}

.ts-contact-icon {
  color: #ff0080 !important;
  text-shadow: 0 0 5px rgba(255, 0, 128, 0.5) !important;
}

.ts-contact-action {
  color: #ffff00 !important;
  border: 1px solid #ffff00 !important;
  background: rgba(255, 255, 0, 0.1) !important;
}

.ts-contact-action:hover {
  background: rgba(255, 255, 0, 0.2) !important;
  box-shadow: 0 0 10px rgba(255, 255, 0, 0.3) !important;
}`
          }
        ]
      }
    },
    {
      name: 'SkillChart',
      description: 'Interactive skill visualization with multiple display modes, themes, and layouts',
      props: [
        { name: 'title', type: 'string', options: ['any text'], default: 'Skills', description: 'Chart title' },
        { name: 'display', type: 'string', options: ['bars', 'radial', 'bubbles', 'tags'], default: 'bars', description: 'Visual display mode' },
        { name: 'theme', type: 'string', options: ['modern', 'neon', 'professional', 'minimal'], default: 'modern', description: 'Visual theme style' },
        { name: 'layout', type: 'string', options: ['grid', 'columns', 'flow'], default: 'grid', description: 'Skill arrangement layout' },
        { name: 'showValues', type: 'boolean', options: ['true', 'false'], default: 'true', description: 'Show numeric values/percentages' },
        { name: 'showCategories', type: 'boolean', options: ['true', 'false'], default: 'true', description: 'Group skills by categories' },
        { name: 'sortBy', type: 'string', options: ['proficiency', 'category', 'name', 'custom'], default: 'proficiency', description: 'Sort order for skills' },
        { name: 'maxDisplay', type: 'number', options: ['1', '5', '10', '20'], default: 'unlimited', description: 'Max number of skills to display' },
        { name: 'size', type: 'string', options: ['sm', 'md', 'lg'], default: 'md', description: 'Overall component size' }
      ],
      example: `<!-- Tech skills with bars -->
<SkillChart title="Technical Skills" display="bars" theme="modern">
  <Skill name="React" level="90" category="Frontend" color="#3B82F6" icon="⚛️" />
  <Skill name="TypeScript" level="85" category="Languages" color="#3178C6" icon="📘" />
  <Skill name="Node.js" level="80" category="Backend" color="#339933" icon="🟢" />
  <Skill name="PostgreSQL" level="75" category="Database" color="#8B5CF6" icon="🐘" />
</SkillChart>

<!-- Design skills with radial indicators -->
<SkillChart title="Design Tools" display="radial" theme="neon" layout="grid">
  <Skill name="Figma" level="95" icon="🎨" yearsExperience="4" description="UI/UX Design" />
  <Skill name="Photoshop" level="80" icon="📸" yearsExperience="6" description="Photo editing" />
  <Skill name="Illustrator" level="70" icon="✏️" yearsExperience="3" description="Vector graphics" />
</SkillChart>

<!-- Language proficiency bubbles -->
<SkillChart title="Languages" display="bubbles" theme="professional" sortBy="proficiency">
  <Skill name="English" level="5" max="5" category="Languages" />
  <Skill name="Spanish" level="4" max="5" category="Languages" />
  <Skill name="French" level="2" max="5" category="Languages" />
</SkillChart>

<!-- Simple skill tags -->
<SkillChart title="Soft Skills" display="tags" layout="flow" showCategories="false">
  <Skill name="Leadership" level="8" max="10" color="#10B981" />
  <Skill name="Communication" level="9" max="10" color="#3B82F6" />
  <Skill name="Problem Solving" level="9" max="10" color="#8B5CF6" />
</SkillChart>

<!-- Advanced example with priorities and custom layout -->
<SkillChart title="Full Stack Development" display="bars" sortBy="custom" maxDisplay="6">
  <Skill name="Frontend" level="95" category="Development" priority="10" icon="🌐" />
  <Skill name="Backend APIs" level="88" category="Development" priority="9" icon="⚙️" />
  <Skill name="Database Design" level="82" category="Development" priority="8" icon="💾" />
  <Skill name="DevOps" level="75" category="Development" priority="7" icon="🚀" />
  <Skill name="Mobile Dev" level="65" category="Development" priority="6" icon="📱" />
  <Skill name="AI/ML" level="45" category="Development" priority="5" icon="🤖" />
</SkillChart>`,
      preview: (
        <div className="text-xs bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-200 px-3 py-2">
            <div className="font-semibold text-gray-800">Technical Skills</div>
            <div className="text-blue-600 mt-1">4 skills • Sorted by proficiency</div>
          </div>
          <div className="p-3 space-y-3">
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-1">
                  <span>⚛️</span>
                  <span className="font-medium">React</span>
                </div>
                <span className="text-blue-600 text-xs">90/100 (90%)</span>
              </div>
              <div className="bg-gray-200 rounded-full h-2">
                <div className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full" style={{width: '90%'}}></div>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-1">
                  <span>📘</span>
                  <span className="font-medium">TypeScript</span>
                </div>
                <span className="text-blue-600 text-xs">85/100 (85%)</span>
              </div>
              <div className="bg-gray-200 rounded-full h-2">
                <div className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full" style={{width: '85%'}}></div>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-1">
                  <span>🟢</span>
                  <span className="font-medium">Node.js</span>
                </div>
                <span className="text-blue-600 text-xs">80/100 (80%)</span>
              </div>
              <div className="bg-gray-200 rounded-full h-2">
                <div className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full" style={{width: '80%'}}></div>
              </div>
            </div>
          </div>
        </div>
      ),
      stylingGuide: {
        classes: [
          {
            name: '.ts-skill-chart',
            description: 'Main skill chart container'
          },
          {
            name: '.ts-skill-chart-header',
            description: 'Chart title and info header'
          },
          {
            name: '.ts-skill-category',
            description: 'Category grouping containers'
          },
          {
            name: '.ts-skill-item',
            description: 'Individual skill display items'
          },
          {
            name: '.ts-skill-bar-fill',
            description: 'Progress bar fill (bars mode)'
          },
          {
            name: '.ts-skill-radial',
            description: 'Circular progress indicator (radial mode)'
          },
          {
            name: '.ts-skill-bubble',
            description: 'Skill bubble element (bubbles mode)'
          },
          {
            name: '.ts-skill-tag',
            description: 'Skill tag badge (tags mode)'
          },
          {
            name: '.ts-skill-label',
            description: 'Skill name/title text'
          },
          {
            name: '.ts-skill-value',
            description: 'Numeric value/percentage display'
          },
          {
            name: '.ts-skill-icon',
            description: 'Skill type icon/emoji'
          }
        ],
        examples: [
          {
            title: 'Gaming/Streamer Theme',
            css: `.ts-skill-chart {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
  border: 2px solid #9f7aea !important;
  color: white !important;
  box-shadow: 0 0 30px rgba(159, 122, 234, 0.3) !important;
}

.ts-skill-chart-header {
  background: rgba(0, 0, 0, 0.2) !important;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
}

.ts-skill-item {
  background: rgba(255, 255, 255, 0.05) !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  backdrop-filter: blur(10px) !important;
}

.ts-skill-item:hover {
  background: rgba(255, 255, 255, 0.1) !important;
  transform: translateY(-2px) !important;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3) !important;
}

.ts-skill-bar-fill {
  background: linear-gradient(90deg, #ff6b6b, #4ecdc4, #45b7d1) !important;
  box-shadow: 0 0 10px rgba(255, 107, 107, 0.5) !important;
}

.ts-skill-icon {
  filter: drop-shadow(0 0 5px currentColor) !important;
  font-size: 1.2em !important;
}`
          },
          {
            title: 'Corporate Dashboard',
            css: `.ts-skill-chart {
  background: #f8fafc !important;
  border: 1px solid #e2e8f0 !important;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1) !important;
}

.ts-skill-chart-header {
  background: #1e293b !important;
  color: white !important;
  border-bottom: none !important;
}

.ts-skill-chart-title {
  font-weight: 600 !important;
  text-transform: uppercase !important;
  letter-spacing: 0.025em !important;
}

.ts-skill-item {
  background: white !important;
  border: 1px solid #e2e8f0 !important;
  margin-bottom: 8px !important;
}

.ts-skill-bar-track {
  background: #e2e8f0 !important;
}

.ts-skill-bar-fill {
  background: linear-gradient(90deg, #0f172a, #1e293b) !important;
}

.ts-skill-value {
  color: #0f172a !important;
  font-weight: 600 !important;
}

.ts-skill-icon {
  color: #64748b !important;
}`
          },
          {
            title: 'Retro Arcade Style',
            css: `.ts-skill-chart {
  background: #0a0a0a !important;
  border: 4px solid #00ffff !important;
  box-shadow: 
    0 0 20px #00ffff,
    inset 0 0 20px rgba(0, 255, 255, 0.1) !important;
  font-family: 'Courier New', monospace !important;
}

.ts-skill-chart-header {
  background: linear-gradient(90deg, #ff007f, #00ffff) !important;
  color: black !important;
  border-bottom: 2px solid #ffff00 !important;
  text-transform: uppercase !important;
}

.ts-skill-item {
  background: rgba(0, 255, 255, 0.05) !important;
  border: 1px solid #ff007f !important;
  margin: 4px !important;
}

.ts-skill-item:hover {
  background: rgba(255, 0, 127, 0.1) !important;
  box-shadow: 0 0 15px #ff007f !important;
}

.ts-skill-bar-track {
  background: #333 !important;
  border: 1px solid #666 !important;
}

.ts-skill-bar-fill {
  background: linear-gradient(90deg, #ff007f, #ffff00, #00ffff) !important;
  animation: retro-glow 2s ease-in-out infinite alternate !important;
}

.ts-skill-label {
  color: #00ffff !important;
  text-shadow: 0 0 5px currentColor !important;
}

.ts-skill-value {
  color: #ffff00 !important;
  text-shadow: 0 0 5px currentColor !important;
}

@keyframes retro-glow {
  from { 
    filter: brightness(100%) saturate(100%);
  }
  to { 
    filter: brightness(120%) saturate(150%);
  }
}`
          }
        ]
      }
    }
  ],
  utility: [
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
      description: '📦 CONTAINER - Wraps When/Otherwise components for advanced conditional rendering with multiple logic branches. Evaluates When conditions in order and renders the first match.',
      props: [
        { name: 'children', type: 'components', options: ['When', 'Otherwise'], default: 'required', description: 'When and Otherwise components as children (evaluates in order)' }
      ],
      example: `<!-- Basic if-else logic -->
<Choose>
  <When data="posts.length" greater-than="10">
    <h3>Prolific Poster! 🌟</h3>
    <BlogPosts limit="10" />
  </When>
  <When data="posts.length" greater-than="0">
    <h3>Recent Posts</h3>
    <BlogPosts limit="5" />
  </When>
  <Otherwise>
    <p>No posts yet - stay tuned!</p>
  </Otherwise>
</Choose>

<!-- Relationship-based content tiers -->
<Choose>
  <When data="viewer.isFriend">
    <div class="vip-content">
      <h2>💚 Friend-Exclusive Content</h2>
      <p>Thanks for being my friend! Here's special content just for you.</p>
      <ImageGallery limit="20" />
    </div>
  </When>
  <When data="viewer.isFollowing">
    <div class="follower-content">
      <h3>Thanks for following! 🎉</h3>
      <ImageGallery limit="10" />
    </div>
  </When>
  <Otherwise>
    <p>Follow me to unlock exclusive content!</p>
  </Otherwise>
</Choose>

<!-- Complex conditions with multiple checks -->
<Choose>
  <When and='[{"data": "viewer.isFriend"}, {"data": "guestbook.length", "greater-than": "0"}]'>
    <p>You're a friend who signed my guestbook - you're the best!</p>
  </When>
  <When data="guestbook.length" greater-than="0">
    <Guestbook limit="5" />
  </When>
  <Otherwise>
    <p>Be the first to sign my guestbook!</p>
  </Otherwise>
</Choose>`,
      preview: (
        <div className="bg-yellow-50 border border-yellow-200 p-2 text-xs rounded">
          <div className="text-yellow-800">Multi-branch logic: First matching When is rendered</div>
          <div className="text-gray-500 text-xs">Advanced if-else-if logic with comparison operators and relationship awareness</div>
        </div>
      )
    },
    {
      name: 'When (used with Choose)',
      description: 'Condition block for use inside Choose component. Supports all comparison operators, logical operators, and relationship checks. First matching When renders.',
      props: [
        { name: 'when', type: 'string', options: ['true', 'false', 'has:path.to.data', 'path.to.data'], default: 'none', description: 'Simple condition to evaluate' },
        { name: 'data', type: 'string', options: ['owner.displayName', 'posts.length', 'viewer.isFriend', 'any.data.path'], default: 'none', description: 'Data path to check' },
        { name: 'equals', type: 'string', options: ['any value'], default: 'none', description: 'Check equality' },
        { name: 'not-equals', type: 'string', options: ['any value'], default: 'none', description: 'Check inequality' },
        { name: 'greater-than', type: 'number', options: ['any number'], default: 'none', description: 'Check >' },
        { name: 'less-than', type: 'number', options: ['any number'], default: 'none', description: 'Check <' },
        { name: 'greater-than-or-equal', type: 'number', options: ['any number'], default: 'none', description: 'Check >=' },
        { name: 'less-than-or-equal', type: 'number', options: ['any number'], default: 'none', description: 'Check <=' },
        { name: 'contains', type: 'string', options: ['any text'], default: 'none', description: 'String contains (case-insensitive)' },
        { name: 'starts-with', type: 'string', options: ['any text'], default: 'none', description: 'String starts with' },
        { name: 'ends-with', type: 'string', options: ['any text'], default: 'none', description: 'String ends with' },
        { name: 'and', type: 'array', options: ['[{...}, {...}]'], default: 'none', description: 'AND logic for multiple conditions' },
        { name: 'or', type: 'array', options: ['[{...}, {...}]'], default: 'none', description: 'OR logic for multiple conditions' },
        { name: 'not', type: 'boolean/condition', options: ['true', 'false', 'data path'], default: 'none', description: 'Negate condition' }
      ],
      example: `<!-- Simple existence check -->
<When when="has:capabilities.bio">Bio exists</When>

<!-- Comparison operators -->
<When data="posts.length" greater-than="10">Many posts!</When>
<When data="posts.length" equals="0">No posts</When>

<!-- Relationship status -->
<When data="viewer.isFriend">Friend content</When>
<When data="viewer.isFollowing">Follower content</When>

<!-- String matching -->
<When data="owner.displayName" contains="artist">Artist badge</When>

<!-- Complex AND logic -->
<When and='[{"data": "viewer.isFriend"}, {"data": "posts.length", "greater-than": "5"}]'>
  Friend with many posts to share!
</When>`,
      preview: (
        <div className="bg-blue-50 border border-blue-200 p-2 text-xs rounded">
          <div className="text-blue-800">✓ When condition met - content renders</div>
          <div className="text-gray-500 text-xs">Used inside Choose for multi-branch conditional logic</div>
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
      description: '📦 CONTAINER - Wraps content to show/hide based on conditional evaluation. Supports existence checks, comparisons, logical operators, and relationship status.',
      props: [
        { name: 'when', type: 'string', options: ['true', 'false', 'has:path.to.data', 'path.to.data'], default: 'none', description: 'Simple condition string to evaluate' },
        { name: 'data', type: 'string', options: ['owner.displayName', 'posts', 'viewer.isFriend', 'any.data.path'], default: 'none', description: 'Data path to check (supports owner.*, viewer.*, posts, guestbook, etc.)' },
        { name: 'equals', type: 'string', options: ['any value'], default: 'none', description: 'Check if data equals this value' },
        { name: 'not-equals', type: 'string', options: ['any value'], default: 'none', description: 'Check if data does not equal this value' },
        { name: 'greater-than', type: 'number', options: ['any number'], default: 'none', description: 'Check if data is greater than this number' },
        { name: 'less-than', type: 'number', options: ['any number'], default: 'none', description: 'Check if data is less than this number' },
        { name: 'greater-than-or-equal', type: 'number', options: ['any number'], default: 'none', description: 'Check if data is >= this number' },
        { name: 'less-than-or-equal', type: 'number', options: ['any number'], default: 'none', description: 'Check if data is <= this number' },
        { name: 'contains', type: 'string', options: ['any text'], default: 'none', description: 'Check if data contains this text (case-insensitive)' },
        { name: 'starts-with', type: 'string', options: ['any text'], default: 'none', description: 'Check if data starts with this text' },
        { name: 'ends-with', type: 'string', options: ['any text'], default: 'none', description: 'Check if data ends with this text' },
        { name: 'not', type: 'boolean/condition', options: ['true', 'false', 'data path'], default: 'none', description: 'Negate the condition (show when false)' },
        { name: 'and', type: 'array', options: ['[{data: "..."}, {...}]'], default: 'none', description: 'Combine multiple conditions with AND logic' },
        { name: 'or', type: 'array', options: ['[{data: "..."}, {...}]'], default: 'none', description: 'Combine multiple conditions with OR logic' }
      ],
      example: `<!-- Existence checks -->
<Show when="has:capabilities.bio">
  <p>User has written a bio!</p>
</Show>

<!-- Relationship-based personalization -->
<Show data="viewer.isFriend">
  <div class="friend-only-message">
    💚 Thanks for being my friend! Here's exclusive content just for you.
  </div>
</Show>

<Show data="viewer.isFollowing">
  <p>Thanks for following me! 🎉</p>
</Show>

<!-- Comparison operators -->
<Show data="posts.length" greater-than="0">
  <BlogPosts limit="5" />
</Show>

<Show data="posts.length" equals="0">
  <p>No posts yet - check back soon!</p>
</Show>

<!-- String matching -->
<Show data="owner.displayName" contains="artist">
  <div>🎨 Artist Badge</div>
</Show>

<!-- Logical operators (AND) -->
<Show and='[{"data": "viewer.isFriend"}, {"data": "posts.length", "greater-than": "5"}]'>
  <p>You're a friend AND I have lots of posts to share with you!</p>
</Show>

<!-- Negation (NOT) -->
<Show not="viewer.isFriend">
  <button>Send Friend Request</button>
</Show>`,
      preview: (
        <div className="bg-green-50 border border-green-200 p-2 text-xs rounded">
          <div className="text-green-800">✓ Content is shown based on conditions</div>
          <div className="text-gray-500 text-xs">Powerful conditional logic with comparisons, relationships, and logical operators</div>
        </div>
      )
    },
    {
      name: 'IfOwner (conditional)',
      description: '📦 CONTAINER - Wraps content to show only to the profile owner (viewer === owner)',
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
      description: '📦 CONTAINER - Wraps content to show only to visitors (viewer !== owner). Combine with Show component to personalize based on relationship status.',
      props: [
        { name: 'children', type: 'ReactNode', options: ['any content'], default: 'required', description: 'Content visible only to visitors' }
      ],
      example: `<!-- Basic visitor-only content -->
<IfVisitor>
  <button>Follow</button>
  <button>Send Message</button>
</IfVisitor>

<!-- Personalize for friends -->
<IfVisitor>
  <Show data="viewer.isFriend">
    <div class="friend-welcome">
      💚 Hey friend! Great to see you here!
    </div>
  </Show>

  <Show not="viewer.isFriend">
    <Show data="viewer.isFollowing">
      <p>Thanks for following! Want to be friends?</p>
    </Show>
  </Show>
</IfVisitor>

<!-- Different content based on relationship -->
<IfVisitor>
  <Choose>
    <When data="viewer.isFriend">
      <div class="friend-zone">
        <h3>Friend-Only Section</h3>
        <p>Here's my private photo collection!</p>
      </div>
    </When>
    <When data="viewer.isFollowing">
      <p>Thanks for the follow! Follow me back to unlock more content.</p>
    </When>
    <Otherwise>
      <button>Follow Me</button>
    </Otherwise>
  </Choose>
</IfVisitor>`,
      preview: (
        <div className="bg-indigo-50 border border-indigo-200 p-2 text-xs rounded">
          <div className="text-indigo-800">👥 Visitor-only: Relationship-aware content</div>
          <div className="text-gray-500 text-xs">Visible only when viewer.id !== owner.id, with personalization based on viewer.isFriend, viewer.isFollowing, and viewer.isFollower</div>
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