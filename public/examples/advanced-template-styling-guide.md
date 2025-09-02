# ThreadStead Advanced Template Styling Guide

## Overview

When using **Advanced Templates** with **Override** or **Disable** CSS modes, you have complete control over how ThreadStead components look. This guide shows you how to style the core components used in your templates.

## Available Components

### 1. **RetroCard** (`<RetroCard>`)
- **Class**: `.thread-module`
- **Purpose**: Main container for content sections
- **Default**: Paper-like card with borders and shadows

### 2. **Headlines** (within components)
- **Class**: `.thread-headline` 
- **Purpose**: Section titles and headings
- **Default**: Serif font, pine green color

### 3. **Labels** (within components)
- **Class**: `.thread-label`
- **Purpose**: Small descriptive text
- **Default**: Uppercase, sage color

### 4. **Tabs** (`<Tabs>`)
- **Classes**: 
  - `.profile-tabs` (container)
  - `.profile-tab-list` (tab bar)
  - `.profile-tab-button` (individual tabs)
  - `.profile-tab-panel` (content area)
- **Purpose**: Tabbed content sections

## How CSS Override Works

In advanced templates, you get:

1. **Minimal component structure** - Just the essential classes and layout
2. **Default styling** - Basic ThreadStead appearance as a starting point  
3. **Complete override power** - Your CSS rules will override everything

## Basic Template Structure

```html
<RetroCard>
  <ProfileHeader showPhoto="true" showBio="true" showActions="true" photoSize="md" />
</RetroCard>

<Tabs>
  <Tab title="Blog">
    <BlogPosts limit="3" />
  </Tab>
  <Tab title="Guestbook">
    <Guestbook />
  </Tab>
</Tabs>
```

## Styling Examples

### Default ThreadStead Style
```css
.thread-module {
  background: #FCFAF7;
  border: 1px solid #A18463;
  border-radius: 8px;
  box-shadow: 3px 3px 0 #A18463;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.thread-headline {
  font-family: Georgia, "Times New Roman", serif;
  color: #2E4B3F;
  font-weight: 600;
  font-size: 1.25rem;
}
```

### Modern Clean Style
```css
.thread-module {
  background: white;
  border: none;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  padding: 2rem;
}

.thread-headline {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  color: #1a1a1a;
  font-weight: 700;
  font-size: 1.5rem;
}
```

### Dark Theme
```css
body {
  background: #1a1a1a;
  color: #e0e0e0;
}

.thread-module {
  background: #2d2d2d;
  border: 1px solid #404040;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
}

.thread-headline {
  color: #f0f0f0;
}

.profile-tab-button.active {
  background: #0d6efd;
  color: white;
}
```

### Vintage/Neocities Style
```css
body {
  background: #000080;
  background-image: url('data:image/svg+xml,<svg...stars pattern...>');
  color: #00ff00;
  font-family: 'Comic Sans MS', cursive;
}

.thread-module {
  background: linear-gradient(45deg, #ff00ff, #00ffff);
  border: 3px solid #ffff00;
  box-shadow: 0 0 20px #ff00ff;
  animation: glow 2s ease-in-out infinite alternate;
}

@keyframes glow {
  from { box-shadow: 0 0 20px #ff00ff; }
  to { box-shadow: 0 0 30px #00ffff; }
}
```

## Pro Tips

### 1. **Start with defaults, then customize**
The components come with reasonable defaults. You can override specific properties:

```css
/* Keep default styling but change colors */
.thread-module {
  background: #your-color;
  border-color: #your-border;
}
```

### 2. **Use CSS custom properties for themes**
```css
:root {
  --card-bg: #ffffff;
  --card-border: #cccccc;
  --text-color: #333333;
}

.thread-module {
  background: var(--card-bg);
  border-color: var(--card-border);
  color: var(--text-color);
}
```

### 3. **Responsive design**
```css
.thread-module {
  min-width: unset; /* Remove desktop min-width */
  margin: 1rem 0; /* Stack on mobile */
  padding: 1rem; /* Reduced padding */
}

@media (max-width: 768px) {
  .thread-headline {
    font-size: 1.1rem;
  }
}
```

### 4. **Animation and interactions**
```css
.thread-module {
  transition: transform 0.2s ease;
}

.thread-module:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
}

.profile-tab-button {
  transition: all 0.2s ease;
}
```

## Complete Style Templates

See the full [threadstead-component-styling.css](threadstead-component-styling.css) file for complete examples of:

- **Default ThreadStead** - Classic retro paper look
- **Modern Clean** - Minimal contemporary design  
- **Dark Theme** - Dark mode with blue accents
- **Vintage/Y2K** - Animated retro cyber aesthetic
- **Minimal** - Ultra-clean borderless design

## Getting Started

1. **Choose a base style** from the examples
2. **Copy the CSS** to your template's Custom CSS section
3. **Set CSS Mode** to "Override" or "Disable" 
4. **Customize** colors, fonts, and effects to match your vision

## Need Help?

- Check the [component reference](threadstead-component-styling.css) for all available classes
- Use browser developer tools to inspect elements and see what classes are available
- Remember: your CSS will override the defaults, so you have complete control!

---

**Happy styling!** 🎨