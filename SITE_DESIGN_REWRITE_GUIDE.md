# ThreadStead Site Design Rewrite Guide

## Quick CSS-Only Site Redesign

### 1. Access Your CSS Editor
- Go to `/resident/[username]/css-editor`
- This affects your entire profile view when others visit

### 2. Core Layout Elements

```css
/* Site Structure */
.site-layout { /* Overall page container */ }
.site-header { /* Top navigation bar */ }
.site-footer { /* Bottom footer */ }
.site-main { /* Main content area */ }

/* Profile Layout */
.ts-profile-container { /* Main profile wrapper */ }
.ts-profile-header { /* Profile header section */ }
.ts-profile-content-wrapper { /* Content wrapper */ }
```

### 3. Key Components to Restyle

```css
/* Navigation */
.site-title { /* Site name/logo */ }
.nav-link { /* Navigation menu items */ }
.profile-tab-button { /* Tab buttons */ }
.profile-tab-panel { /* Tab content areas */ }

/* Content Cards */
.thread-module { /* Paper-like content containers */ }
.blog-post-card { /* Blog post cards */ }
.thread-button { /* Primary buttons */ }

/* Profile Elements */
.profile-photo-frame { /* Profile photo border */ }
.ts-profile-display-name { /* Display name */ }
.ts-profile-bio { /* Bio text */ }
```

### 4. Color System Override

```css
/* Replace ThreadStead colors entirely */
.site-layout {
  background: your-background !important;
  color: your-text-color !important;
}

/* Override all thread-* backgrounds */
.thread-module,
.site-header,
.site-footer {
  background: your-card-color !important;
  border: your-border !important;
}
```

### 5. Typography Overhaul

```css
/* Change all fonts site-wide */
* {
  font-family: 'Your Font', sans-serif !important;
}

/* Headline styling */
.thread-headline,
h1, h2, h3, h4, h5, h6 {
  font-family: 'Your Heading Font' !important;
  color: your-heading-color !important;
}
```

### 6. Complete Theme Examples

#### Dark Mode
```css
.site-layout { background: #1a1a1a !important; color: #ffffff !important; }
.thread-module { background: #2d2d2d !important; border: 1px solid #444 !important; }
.site-header, .site-footer { background: #000000 !important; }
```

#### Neon/Cyberpunk
```css
.site-layout { background: #0a0a0a !important; color: #00ff41 !important; }
.thread-module { 
  background: #111 !important; 
  border: 1px solid #00ff41 !important;
  box-shadow: 0 0 10px #00ff41 !important;
}
```

#### Retro/Brutalist
```css
.thread-module {
  background: #ffff00 !important;
  border: 4px solid #000 !important;
  box-shadow: 8px 8px 0 #000 !important;
  border-radius: 0 !important;
}
```

### 7. Advanced Customization

- **Animations**: Add CSS animations to any element
- **Custom Layout**: Use CSS Grid/Flexbox to completely rearrange sections
- **Background Patterns**: Use CSS gradients, patterns, or images
- **Custom Components**: Style ThreadRing elements (`.tr-*` classes)

### 8. Testing & Iteration

1. Save changes in CSS editor
2. View your profile to see results
3. Use browser dev tools to inspect elements
4. Iterate until satisfied

### 9. Reference

- Full class list: `/design-css-tutorial`
- All available classes documented with examples
- Copy/modify examples for your design

---

**Pro Tip**: Use `!important` to override ThreadStead defaults, but use sparingly for maintainable CSS.