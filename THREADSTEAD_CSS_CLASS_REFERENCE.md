# ThreadStead CSS Class Reference Guide

## Complete Site Redesign Reference

This comprehensive guide contains every CSS class from the ThreadStead design system, organized by category. Use this reference to completely customize your ThreadStead site by targeting these specific classes.

---

## 🔗 ThreadRing Pages

*ThreadRing community page styling and components*

### ThreadRing Page Layout
**Main page structure for ThreadRing community pages**

- `.tr-page-container` - Main grid container for ThreadRing pages
- `.tr-main-content` - Main content area (left column)
- `.tr-sidebar` - Sidebar area (right column)
- `.tr-header-card` - ThreadRing header information card
- `.tr-posts-container` - Container for posts list

### ThreadRing Header Elements
**Header components showing ThreadRing information**

- `.tr-title` - ThreadRing title/name
- `.tr-description` - ThreadRing description text
- `.tr-curator-note` - Curator's note/welcome message
- `.tr-meta-info` - Member count, post count, join type info
- `.tr-badge-wrapper` - Container for ThreadRing badge

### ThreadRing Sidebar Components
**Sidebar widgets and sections**

- `.tr-sidebar-section` - Individual sidebar section container
- `.tr-sidebar-header` - Collapsible section header
- `.tr-sidebar-title` - Section title text
- `.tr-ring-info` - Ring info section
- `.tr-member-status` - Current user membership status
- `.tr-actions-section` - Action buttons container

### ThreadRing Feed Components
**Post feed and scope selection components**

- `.tr-feed-scope` - Feed scope selector widget
- `.tr-scope-options` - Scope option buttons container
- `.tr-scope-active` - Currently active scope option
- `.tr-posts-list` - Posts list container
- `.tr-posts-loading` - Loading state for posts
- `.tr-posts-empty` - Empty state when no posts

### ThreadRing Active Prompts
**Challenge/prompt display components**

- `.tr-active-prompt` - Active prompt/challenge container
- `.tr-prompt-active` - Active prompt styling
- `.tr-prompt-inactive` - Inactive/ended prompt styling
- `.tr-prompt-title` - Prompt title text
- `.tr-prompt-description` - Prompt description/content
- `.tr-prompt-status` - Prompt status badges

### ThreadRing Statistics
**Statistics and data display components**

- `.tr-stats` - Statistics widget container
- `.tr-stats-overview` - Overview stats section
- `.tr-stats-grid` - Grid of stat items
- `.tr-stat-value` - Numeric stat values
- `.tr-stat-label` - Stat labels/descriptions
- `.tr-stats-activity` - Recent activity section

---

## 🏗️ Profile Structure

*Main containers and layout elements for profile pages*

### Profile Containers
**Main structural elements of profile pages**

- `.ts-profile-container` - Main wrapper for entire profile page
- `.ts-profile-content-wrapper` - Inner content wrapper with responsive padding
- `.ts-profile-main-content` - Contains main profile sections (header, tabs, etc.)
- `.ts-profile-header` - Profile header section containing photo and info
- `.ts-profile-header-layout` - Flex layout container for header elements

### Profile Photo Elements
**Photo containers and styling elements**

- `.ts-profile-photo-section` - Container for profile photo area
- `.profile-photo-wrapper` - Photo wrapper with positioning
- `.profile-photo-frame` - Photo frame/border styling
- `.profile-photo-image` - The actual profile image element
- `.profile-photo-placeholder` - Placeholder when no photo is set

### Navigation & Tabs
**Site navigation and profile tab system**

- `.site-header` - Main site header bar
- `.site-title` - Site title/logo text
- `.site-tagline` - Site tagline/subtitle
- `.nav-link` - Navigation menu links
- `.ts-profile-tabs-wrapper` - Container for tab system
- `.profile-tab-button` - Individual tab button
- `.profile-tab-button[aria-selected="true"]` - Currently active tab
- `.profile-tab-panel` - Tab content container

### Blog Post Elements
**Blog post cards and content styling**

- `.blog-tab-content` - Container for blog posts tab
- `.blog-posts-list` - List container for blog posts
- `.blog-post-card` - Individual blog post card
- `.blog-post-header` - Post header (date, meta)
- `.blog-post-title` - Blog post title/heading
- `.blog-post-content` - Post content area
- `.blog-post-date` - Post publication date

---

## 🧵 Thread Utilities

*ThreadStead design system classes and components*

### Core Thread Classes
**Main ThreadStead design system components**

- `.thread-surface` - Warm paper texture background
- `.thread-module` - Paper-like container with cozy shadow
- `.thread-divider` - Stitched divider pattern
- `.thread-button` - Primary cozy button styling
- `.thread-button-secondary` - Secondary button variant
- `.thread-headline` - Serif headline with text shadow
- `.thread-label` - Monospace micro-labels
- `.thread-content` - Enhanced content typography
- `.thread-background` - Background hover state for dropdown items

### Layout Utilities
**Layout and spacing utilities**

- `.line-clamp-2` - Clamp text to 2 lines with ellipsis
- `.line-clamp-3` - Clamp text to 3 lines with ellipsis
- `.site-layout` - Overall page container
- `.site-main` - Main content area
- `.site-header` - Site header with consistent background
- `.site-footer` - Site footer with consistent background
- `.footer-tagline` - Footer tagline text
- `.footer-copyright` - Copyright text

---

## 🎨 Colors & Themes

*Color palette and theming utilities*

### ThreadStead Color Palette
**Official color classes from the ThreadStead design system**

- `bg-thread-cream` - Warm cream background (#F5E9D4)
- `bg-thread-sage` - Muted sage background (#A18463)
- `bg-thread-pine` - Deep pine background (#2E4B3F)
- `bg-thread-sky` - Soft sky blue background (#8EC5E8)
- `bg-thread-meadow` - Fresh meadow green background (#4FAF6D)
- `bg-thread-sunset` - Warm sunset coral background (#E27D60)
- `bg-thread-paper` - Off-white paper background (#FCFAF7)
- `bg-thread-stone` - Mid gray background (#B8B8B8)
- `bg-thread-charcoal` - Dark charcoal background (#2F2F2F)

### Text Colors
**Text color utilities using ThreadStead palette**

- `text-thread-cream` - Warm cream text
- `text-thread-sage` - Muted sage text
- `text-thread-pine` - Deep pine text
- `text-thread-sky` - Soft sky blue text
- `text-thread-meadow` - Fresh meadow green text
- `text-thread-sunset` - Warm sunset coral text
- `text-thread-paper` - Off-white paper text
- `text-thread-stone` - Mid gray text
- `text-thread-charcoal` - Dark charcoal text

### Border Colors
**Border color utilities**

- `border-thread-cream` - Warm cream border
- `border-thread-sage` - Muted sage border
- `border-thread-pine` - Deep pine border
- `border-thread-sky` - Soft sky blue border
- `border-thread-meadow` - Fresh meadow green border
- `border-thread-sunset` - Warm sunset coral border
- `border-thread-paper` - Off-white paper border
- `border-thread-stone` - Mid gray border
- `border-thread-charcoal` - Dark charcoal border

---

## 📝 Typography

*Text styling and content formatting*

### Content Typography
**Text content and formatting classes**

- `.thread-content h1` - Large heading (1.5rem)
- `.thread-content h2` - Medium heading (1.25rem)
- `.thread-content h3` - Small heading (1.125rem)
- `.thread-content p` - Paragraph with enhanced line-height
- `.thread-content blockquote` - Styled blockquotes with border
- `.thread-content code` - Inline code styling
- `.thread-content pre` - Code block styling

### Font Families
**Typography system font stacks**

- `font-headline` - Georgia, serif for headlines
- `font-body` - System UI sans-serif for body text
- `font-mono` - Monospace for code and labels
- `font-retro` - Legacy Georgia serif

---

## 📱 Layout & Responsive

*Layout utilities and responsive design classes*

### Shadow Utilities
**Custom shadow styles for ThreadStead design**

- `shadow-cozy` - Warm sage shadow (3px 3px 0 #A18463)
- `shadow-cozySm` - Small warm shadow (2px 2px 0 #A18463)
- `shadow-thread` - Soft pine shadow with blur
- `shadow-retro` - Retro box shadow (4px 4px 0 #A18463)
- `shadow-retroSm` - Small retro shadow (2px 2px 0 #A18463)

### Border Radius
**Consistent border radius utilities**

- `rounded-cozy` - Cozy border radius (8px)
- `rounded-thread` - Thread border radius (12px)

### Responsive Breakpoints
**Mobile-first responsive design guidance**

- `@media (max-width: 767px)` - Mobile devices
- `@media (min-width: 768px) and (max-width: 1023px)` - Tablet devices
- `@media (min-width: 1024px)` - Desktop devices
- `@media (hover: none) and (pointer: coarse)` - Touch devices

### Component Utilities
**CSS classes for specific UI components and functionality**

- `.nav-link-underline` - Navigation link underline styling
- `.post-editor-container` - Wide container for post editor
- `.tr-header-min-width` - ThreadRing header minimum width
- `.tr-prompt-link-purple` - Purple link styling for prompts
- `.tr-prompt-button-white` - White text on colored buttons
- `.tr-prompt-host-purple` - Purple styling for prompt hosts
- `.modal-overlay-high` - High z-index for modal overlays
- `.username-input` - Username input letter spacing
- `.preview-isolation` - CSS isolation for previews
- `.threadring-badge-image` - 88x31 badge image dimensions
- `.upload-progress-bar` - Dynamic width progress bar
- `.template-editor-iframe` - Template editor iframe styling
- `.media-modal-overlay` - Media modal overlay positioning
- `.template-preview-wrapper` - Template preview isolation
- `.code-editor-textarea` - Code editor font family and styling
- `.profile-sidebar-hidden` - Hidden profile sidebar
- `.profile-sidebar-visible` - Visible profile sidebar
- `.user-select-all` - Select all text utility
- `.toast-container` - Toast notification z-index

---

## 🎯 How to Use This Reference

### Targeting Classes
Use specific CSS selectors to override existing styles:

```css
/* Example: Customize profile container */
.ts-profile-container {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
  border-radius: 20px !important;
}
```

### Override Priority
Use `!important` to ensure your custom styles take precedence:

```css
.thread-button {
  background: #ff69b4 !important;
  color: white !important;
}
```

### Responsive Design
Include responsive breakpoints for mobile-friendly designs:

```css
/* Mobile first */
.ts-profile-header {
  padding: 1rem !important;
}

/* Tablet and up */
@media (min-width: 768px) {
  .ts-profile-header {
    padding: 2rem !important;
  }
}
```

---

## 📋 Quick Start Examples

### Glass Morphism Theme
```css
.ts-profile-container {
  background: rgba(255, 255, 255, 0.1) !important;
  backdrop-filter: blur(20px) !important;
  border: 1px solid rgba(255, 255, 255, 0.2) !important;
  border-radius: 20px !important;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1) !important;
}
```

### Retro Gaming Theme
```css
.profile-tab-button {
  background: #ffff00 !important;
  border: 3px solid #000 !important;
  color: #000 !important;
  font-family: "Comic Sans MS", cursive !important;
  font-weight: bold !important;
  box-shadow: 4px 4px 0 #000 !important;
}
```

### Matrix/Terminal Theme
```css
.site-layout {
  background: #000 !important;
  color: #00ff00 !important;
  font-family: "Courier New", monospace !important;
}

.site-title {
  color: #00ff00 !important;
  text-shadow: 0 0 10px #00ff00 !important;
}
```

---

*This reference contains 100+ CSS classes for complete ThreadStead customization. Use these classes to create unique, personalized site designs while maintaining functionality.*