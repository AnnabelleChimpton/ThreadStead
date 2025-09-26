# Template Rendering Logic: Legacy vs Visual Builder

## Overview

The template system needs to handle two distinct template types with different rendering requirements:

1. **Legacy Templates**: Traditional HTML/CSS templates that need wrapper containers
2. **Visual Builder Templates**: Modern templates with absolute positioning that should render without wrappers

## Core Detection Logic

### Template Type Detection
```typescript
function detectTemplateMode(staticHTML: string, customCSS?: string): 'legacy' | 'visual-builder' {
  // Primary detection: Look for Visual Builder container
  if (staticHTML.includes('pure-absolute-container')) {
    return 'visual-builder';
  }

  // Secondary detection: Look for Visual Builder positioning data
  if (staticHTML.includes('data-pure-positioning')) {
    return 'visual-builder';
  }

  // Tertiary detection: Look for Visual Builder CSS patterns
  if (customCSS && customCSS.includes('--global-bg-color')) {
    return 'visual-builder';
  }

  return 'legacy';
}
```

## Rendering Strategies

### Legacy Templates
**Container**: `advanced-template-container`
**Approach**: Wrap template content in container div
**CSS Scoping**: Scope user CSS to profile ID

```typescript
// Legacy template rendering
return (
  <div id={profileId} className="advanced-template-container">
    {templateContent}
  </div>
);
```

### Visual Builder Templates
**Container**: `pure-absolute-container` + Visual Builder classes
**Approach**: Preserve original container structure
**CSS Scoping**: CSS already scoped to profile ID by Visual Builder system

```typescript
// Visual Builder template rendering - NO WRAPPER
return templateContent; // Contains its own pure-absolute-container
```

## CSS Handling

### Legacy Templates
- User CSS gets scoped to `#profile-{userId}`
- Container classes: `advanced-template-container`
- CSS selectors target: `#profile-{userId} .user-class`

### Visual Builder Templates
- CSS already scoped by Visual Builder generator
- Container classes: `pure-absolute-container vb-theme-{theme} vb-pattern-{pattern}`
- CSS selectors target: `#profile-{userId}.vb-theme-{theme}`

## The Core Problem

**Issue**: Visual Builder templates are being wrapped in `advanced-template-container` instead of preserving their original `pure-absolute-container` structure.

**Root Cause**: Template detection fails or rendering logic doesn't respect Visual Builder mode.

## Simple Solution Requirements

1. **Detect template type correctly**
2. **For Visual Builder**: Render content directly without wrapper
3. **For Legacy**: Wrap in `advanced-template-container`
4. **Ensure CSS selectors match HTML structure**

## Current Flow Issues

The complex reconstruction and DOM parsing logic is causing more problems than it solves. The simple approach should be:

```typescript
function renderTemplate(compiledTemplate, templateMode, profileId) {
  if (templateMode === 'visual-builder') {
    // Visual Builder templates handle their own containers
    return <div dangerouslySetInnerHTML={{ __html: compiledTemplate.staticHTML }} />;
  } else {
    // Legacy templates need wrapper
    return (
      <div id={profileId} className="advanced-template-container">
        <div dangerouslySetInnerHTML={{ __html: compiledTemplate.staticHTML }} />
      </div>
    );
  }
}
```

## Expected HTML Output

### Legacy Template
```html
<div id="profile-cmg08db7b00007p4sn1sc8rwc" class="advanced-template-container">
  <!-- legacy template content -->
</div>
```

### Visual Builder Template
```html
<div id="profile-cmg08db7b00007p4sn1sc8rwc" class="pure-absolute-container vb-theme-bubblegum vb-pattern-bubbles">
  <!-- visual builder components with data-pure-positioning -->
</div>
```

## Key Principles

1. **Keep it simple**: Don't overcomplicate with DOM parsing and reconstruction
2. **Respect the source**: Visual Builder templates know their structure
3. **Clear separation**: Different logic for different template types
4. **CSS consistency**: Ensure HTML structure matches CSS expectations

## Files Involved

- `ProfileModeRenderer.tsx`: Main template detection and routing
- `AdvancedProfileRenderer.tsx`: Template content rendering
- `visual-builder-class-extractor.ts`: CSS class extraction utilities
- `layers.ts`: CSS scoping and optimization

## Next Steps for Reintegration

1. Simplify template detection to one clear function
2. Remove complex DOM parsing and reconstruction logic
3. Use direct rendering approach based on template type
4. Ensure profile ID is correctly applied to containers
5. Test that CSS selectors match HTML structure