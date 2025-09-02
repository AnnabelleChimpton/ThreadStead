# CSS Layers Implementation Guide

## Overview

This guide documents the new CSS Layers system that replaces the problematic `!important` approach in ThreadStead's template system. The new system provides predictable CSS cascade behavior across all template modes.

## The Problem We Solved

The old system had several issues:
- **!important Chaos**: Override mode automatically added `!important` to all user CSS rules
- **Specificity Wars**: Difficult to understand why styles weren't applying
- **Maintenance Nightmare**: Hard to debug CSS priority issues
- **User Confusion**: Users couldn't predict which styles would take precedence

## The Solution: CSS Layers

CSS `@layer` provides native cascade control without relying on specificity or `!important`.

### Layer Hierarchy (Low to High Priority)

```css
@layer threadstead-browser,     /* Browser defaults */
       threadstead-reset,       /* CSS resets */
       threadstead-global,      /* Global base styles */
       threadstead-site,        /* Site-wide admin CSS */
       threadstead-components,  /* Component base styles */
       threadstead-template,    /* Template structure */
       threadstead-user-base,   /* User base styles */
       threadstead-user-custom, /* User custom styles (inherit mode) */
       threadstead-user-override; /* User override styles (override mode) */
```

## CSS Mode Behavior

### Inherit Mode (`cssMode: 'inherit'`)
- **Purpose**: User CSS extends site styles
- **Layers Used**: Global → Site → User Custom
- **Use Case**: Standard layout customization
- **Example**:
```css
@layer threadstead-global { /* Site defaults */ }
@layer threadstead-site { /* Admin CSS */ }  
@layer threadstead-user-custom { /* User extensions */ }
```

### Override Mode (`cssMode: 'override'`)
- **Purpose**: User CSS takes precedence over site styles
- **Layers Used**: Global → Site → User Override
- **Use Case**: Heavy customization while keeping components functional
- **Example**:
```css
@layer threadstead-global { /* Site defaults */ }
@layer threadstead-site { /* Admin CSS */ }
@layer threadstead-user-override { /* User takes control */ }
```

### Disable Mode (`cssMode: 'disable'`)
- **Purpose**: User has complete CSS control
- **Layers Used**: User Override only
- **Use Case**: Completely custom styling
- **Example**:
```css
@layer threadstead-user-override { /* Only user CSS */ }
```

## Implementation Files

### Core Utility: `/lib/css-layers.ts`
```typescript
// Main functions
generateOptimizedCSS(options)     // Auto-detects layer support
generateLayeredCSS(options)       // Uses CSS layers
generateFallbackCSS(options)      // Fallback for old browsers
generatePreviewCSS(options)       // For template editor preview
```

### Updated Components
- `ProfileLayout.tsx` - Uses layered CSS instead of direct injection
- `AdvancedProfileRenderer.tsx` - Removed `!important` nightmare
- `EnhancedTemplateEditor.tsx` - Preview uses proper layers
- `pages/resident/[username]/index.tsx` - Passes CSS mode to layout

## Usage Examples

### Standard Layout (Inherit Mode)
```typescript
const layeredCSS = generateOptimizedCSS({
  cssMode: 'inherit',
  templateMode: 'default',
  siteWideCSS: adminCSS,
  userCustomCSS: userCSS,
  profileId: 'profile-123'
});
```

### Advanced Template (Override Mode)  
```typescript
const layeredCSS = generateOptimizedCSS({
  cssMode: 'override',
  templateMode: 'advanced',
  siteWideCSS: adminCSS,
  userCustomCSS: userCSS,
  profileId: 'profile-456'
});
```

### Template Editor Preview
```typescript
const previewCSS = generatePreviewCSS({
  cssMode: 'inherit',
  templateMode: 'enhanced',
  siteWideCSS: adminCSS,
  userCustomCSS: userCSS
});
```

## CSS Scoping

All user CSS is automatically scoped to prevent global pollution:

### Input:
```css
body { background: red; }
.header { color: blue; }
```

### Output:
```css
#profile-123 { background: red; }
#profile-123 .header { color: blue; }
```

### Special Cases:
- `body` selectors become profile container selectors
- `@media` and `@keyframes` are preserved as-is
- `:root` variables are scoped to profile container

## Migration Benefits

1. **No More !important**: Clean, predictable CSS
2. **Better Performance**: Browser can optimize layered CSS
3. **User-Friendly**: Natural CSS inheritance behavior
4. **Maintainable**: Clear priority hierarchy
5. **Future-Proof**: Easy to add new layers

## Browser Support

- **Modern Browsers**: Uses CSS `@layer` for optimal performance
- **Legacy Browsers**: Automatic fallback to specificity-based approach
- **SSR Safe**: Works correctly during server-side rendering

## Testing

Run the test suite to verify CSS layer behavior:
```bash
npm test css-layers.test.ts
```

Tests cover:
- Layer order generation
- CSS mode behavior
- Scoping functionality
- Comment removal
- Fallback behavior

## Troubleshooting

### Styles Not Applying?
1. Check CSS mode - override mode has higher priority than inherit
2. Verify layer order in browser dev tools
3. Ensure CSS is properly scoped to profile container

### Performance Issues?
1. CSS layers are more performant than `!important`
2. Use browser dev tools to verify layers are being applied
3. Check for CSS parsing errors in console

### Legacy Browser Support?
1. System automatically detects layer support
2. Falls back to specificity-based approach
3. No action needed - works transparently

## Best Practices

1. **Use Inherit Mode** for standard layout customization
2. **Use Override Mode** sparingly - only when you need complete control
3. **Use Disable Mode** only for fully custom templates
4. **Test in multiple browsers** to ensure consistent behavior
5. **Use browser dev tools** to inspect layer application

This new system eliminates the CSS nightmare and provides a clean, predictable way to handle styling across all template modes!