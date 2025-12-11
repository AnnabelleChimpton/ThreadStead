# Advanced Profile Rendering Architecture Documentation

This document provides a comprehensive technical reference for the Advanced Profile rendering system, covering the Visual Builder, Template Rendering Pipeline, and CSS Styling System.

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Visual Builder Architecture](#2-visual-builder-architecture)
3. [Template Rendering Pipeline](#3-template-rendering-pipeline)
4. [CSS Styling System](#4-css-styling-system)
5. [Data Flow Diagrams](#5-data-flow-diagrams)
6. [Key File Reference](#6-key-file-reference)
7. [Live Profile Rendering Flow](#7-live-profile-rendering-flow)
8. [Known Flaky Areas](#8-known-flaky-areas)
9. [Troubleshooting Quick Reference](#9-troubleshooting-quick-reference)
10. [Key File Quick Reference](#10-key-file-quick-reference)

---

## 1. System Overview

The Advanced Profile system has **three distinct rendering paths**:

| Mode | Description | CSS Handling | Template Source |
|------|-------------|--------------|-----------------|
| **default** | Standard React components | No custom CSS | Built-in components |
| **enhanced** | Default + custom CSS injection | Simple style tag | Built-in + CSS |
| **advanced** | Full custom template with Islands | Visual Builder CSS | Custom HTML + Islands |

**Entry Points:**
- **Editor**: `pages/resident/[username]/template-editor.tsx`
- **Viewer**: `pages/resident/[username]/index.tsx`
- **API**: `pages/api/profile/[username]/template.ts`

---

## 2. Visual Builder Architecture

### 2.1 Component Hierarchy

```
template-editor.tsx (Page)
  └── EnhancedTemplateEditor (Container - handles save/load)
        └── VisualTemplateBuilder (Main Editor - 2,128 lines)
              ├── SmartToolbar (Top controls)
              ├── BreakpointSwitcher (Responsive preview)
              ├── CanvasRenderer (Main editing surface - 656 lines)
              ├── ComponentPalette (Left sidebar - drag components)
              ├── PropertyPanel (Right sidebar - edit properties)
              ├── GlobalSettingsPanel (Theme/styling)
              ├── GroupPanel (Component organization)
              ├── BulkPropertyEditor (Multi-select editing)
              └── TemplateGallery (Template presets)
```

**Location**: `components/features/templates/visual-builder/`

### 2.2 State Management (`hooks/useCanvasState.ts`)

Central hook managing all Visual Builder state (~900 lines):

```typescript
interface ComponentItem {
  id: string;
  type: string;                         // e.g., 'ProfilePhoto'
  position: { x: number; y: number };   // Absolute positioning
  gridPosition?: { column, row, span }; // Grid positioning
  positioningMode: 'absolute' | 'grid';

  publicProps: Record<string, any>;     // Component-specific props
  visualBuilderState: {
    isSelected: boolean;
    isLocked: boolean;
    isHidden: boolean;
    lastModified: number;
  };

  // PHASE 4.2: Responsive positioning
  responsivePositions?: {
    tablet?: ResponsivePositionData;
    mobile?: ResponsivePositionData;
  };

  children?: ComponentItem[];
}
```

**Key Operations:**
- `addComponent()` / `removeComponent()` - Component management
- `updateComponent()` - Modify properties
- `updateComponentPosition()` - Move components
- `updateResponsivePosition()` - Breakpoint-specific positioning
- `undo()` / `redo()` - History management (max 50 states)

### 2.3 Positioning System

**Two Positioning Modes:**

1. **Absolute Positioning** (pixel-based)
   - Direct X, Y coordinates in pixels
   - Width, height in pixels
   - Detected by `pure-absolute-container` class

2. **Grid Positioning** (responsive)
   - Column, row, span values
   - Auto-calculates pixels based on grid config
   - Better for responsive layouts

**Breakpoints** (from `lib/templates/visual-builder/grid-utils.ts`):
```
Mobile:  < 768px   (columns: 4,  gap: 8px,  rowHeight: 60px)
Tablet:  768-1023px (columns: 8,  gap: 12px, rowHeight: 70px)
Desktop: >= 1024px (columns: 12, gap: 16px, rowHeight: 80px)
```

### 2.4 HTML Generation (`lib/templates/visual-builder/pure-html-generator.ts`)

**Process:**
1. Convert `ComponentItem[]` to `AbsoluteComponent[]`
2. Generate opening tags with data attributes
3. Include position data (`data-position`, `data-positioning-mode`)
4. Render children recursively
5. Wrap in `pure-absolute-container` div
6. Generate CSS from GlobalSettings
7. Inject CSS into style tags

**Output:** Complete HTML with inline styles and positioned components

### 2.5 Template Detection

Flow vs Positioned mode detection:
```typescript
// In VisualTemplateBuilder
const isFlowTemplate = !htmlContent.includes('pure-absolute-container');
```

---

## 3. Template Rendering Pipeline

### 3.1 Compilation Architecture

**Core Files:**
- `lib/templates/compilation/template-parser.ts` (775 lines) - HTML parsing
- `lib/templates/compilation/compiler/compiler.ts` - Compilation orchestrator
- `lib/templates/compilation/compiler/island-detector.ts` - Islands detection
- `lib/templates/compilation/compiler/html-optimizer.ts` - Static HTML generation
- `lib/templates/compilation/template-cache.ts` - LRU cache (100 entries, 7-day TTL)

### 3.2 Compilation Flow

```
User Template HTML
    ↓
Pre-parse Validation (detectSyntaxErrors)
    ├─ Unclosed tags
    ├─ Mismatched tags
    └─ Quote mismatches
    ↓
HTML Entity Unescaping
    ↓
Self-closing Tag Conversion
    ↓
HAST Parsing (unified + rehype-parse + rehype-sanitize)
    ↓
Component Detection & Validation
    ├─ Compare tags before/after sanitization
    ├─ Track stripped components
    └─ Validate attributes against registry
    ↓
AST-to-JSON Conversion
    ↓
Template Limits Check
    ├─ Max nodes (configurable)
    ├─ Max depth (configurable)
    ├─ Max size: 65536 bytes
    └─ Warnings for soft limits
    ↓
Island Detection (advanced mode)
    ├─ Identify interactive components
    ├─ Generate unique island IDs
    └─ Extract positioning data
    ↓
Static HTML Generation
    ├─ Replace islands with <span> placeholders
    └─ Preserve styling attributes
    ↓
Cache Result (SHA-256 hash key)
```

### 3.3 Islands Architecture

Interactive components are detected and hydrated client-side:

```typescript
// island-detector.ts
interface IslandMetadata {
  id: string;           // Unique island ID
  componentType: string;
  props: object;        // Stripped of positioning data
  path: number[];       // AST path for placement
}
```

**Flow:**
1. Server renders static HTML with island placeholders
2. Island metadata sent to client
3. Client hydrates interactive components in placeholders
4. Non-interactive content remains static HTML

### 3.4 Runtime Rendering

**React Transformation** (`lib/templates/rendering/template-renderer.tsx`):

```typescript
function transformNodeToReact(node: TemplateNode): React.ReactElement {
  // 1. Text nodes → raw text
  // 2. Root nodes → array of children
  // 3. Component nodes:
  //    - Lookup in registry
  //    - Normalize props (kebab-case → camelCase)
  //    - Validate against schema
  //    - Handle positioning (absolute, grid, pure)
  //    - Create React.createElement()
}
```

**Props Normalization:**
- `show-photo` → `showPhoto`
- `class` → `className`
- Data attributes preserved for positioning

### 3.5 Component Registry (`lib/templates/core/template-registry.ts`)

128+ profile components organized by category:

| Category | Examples |
|----------|----------|
| **Display** | ProfileHeader, ProfilePhoto, DisplayName, Bio, BlogPosts, MediaGrid, Guestbook |
| **Conditional** | Show, Hide, Switch/Case |
| **State** | Var, Set, For, ShowVar |
| **Actions** | Event handlers, Form actions, Navigation |

---

## 4. CSS Styling System

### 4.1 CSS Modes

Three modes control custom CSS behavior:

| Mode | Behavior | Use Case |
|------|----------|----------|
| **inherit** | Profile extends site styles. User CSS wins via nuclear dominance. | Default for most users |
| **override** | User CSS takes precedence over site styles. | Power users |
| **disable** | Complete isolation. Site styles disabled. | Visual Builder (default) |

### 4.2 CSS Layers Architecture

Uses `@layer` rules for cascade management:

```css
/* Layer hierarchy (lowest to highest priority) */
@layer threadstead-browser;    /* Browser defaults */
@layer threadstead-reset;      /* Global reset */
@layer threadstead-global;     /* Global base */
@layer threadstead-site;       /* Site-wide styles */
@layer threadstead-components; /* Component base */
@layer threadstead-template;   /* Template-specific */
@layer threadstead-user-base;  /* User base */
@layer threadstead-user-custom; /* User custom */
@layer threadstead-user-override; /* User override (advanced) */
@layer threadstead-user-nuclear; /* Nuclear dominance (!important) */
```

**Location**: `lib/utils/css/layers.ts`

### 4.3 Nuclear Dominance

User CSS gets maximum specificity via `forceUserCSSDominance()`:

```css
/* Input */
.my-class { color: red; }

/* Output */
html body html body .my-class { color: red !important; }
```

### 4.4 Visual Builder CSS Generation

**CSSClassGenerator** (`lib/templates/visual-builder/css-class-generator.ts`):

Converts GlobalSettings to CSS:

```typescript
interface GlobalSettings {
  background: {
    color: string;
    type: 'solid' | 'gradient' | 'pattern';
    gradient?: { colors: string[]; angle: number };
    pattern?: BackgroundPattern;
  };
  typography: {
    fontFamily: string;
    baseSize: string;
    scale: number;
    textShadow?: string;
  };
  spacing: {
    containerPadding: string;
    sectionSpacing: string;
  };
  theme: 'y2k' | 'vaporwave' | 'geocities' | 'cottagecore' |
         'cyberpunk' | 'bubblegum' | 'space' | 'custom';
  effects?: { blur, borderRadius, boxShadow, animation };
}
```

**Generated Output:**
```css
:root {
  --global-bg-color: #ffffff;
  --global-font-family: 'Inter, sans-serif';
  --vb-pattern-type: 'stars';
}

.vb-theme-bubblegum { ... }
.vb-pattern-stars { background-image: url("data:image/svg+xml,..."); }
.vb-effect-rounded { border-radius: var(--vb-border-radius); }
```

### 4.5 Background Patterns

14 pattern types in `lib/templates/visual-builder/background-patterns.ts`:
- dots, stripes, checkerboard, stars, hearts, diamonds
- waves, grid, confetti, sparkles, bubbles, etc.

Configurable: size, opacity, colors, rotation, animation

### 4.6 CSS Injection Points

**Default/Enhanced Mode** (`ProfileLayout.tsx`):
```jsx
<style dangerouslySetInnerHTML={{ __html: layeredCSS }} />
```

**Advanced Mode** (`AdvancedProfileRenderer.tsx`):
- CSS embedded in compiled template HTML
- `StaticHTMLWithIslands` component handles injection
- Body classes applied for full-viewport patterns

### 4.7 CSS Scoping

All selectors scoped to profile container:
```css
/* Input */
body { background: blue; }

/* Output */
.profile-template-root#[profileId] { background: blue; }
```

### 4.8 CSS Sanitization (`lib/utils/sanitization/css.ts`)

Blocks dangerous patterns:
- `javascript:` URLs
- `expression()`
- `behavior:` property
- Non-whitelisted `@import` (only Google Fonts allowed)

---

## 5. Data Flow Diagrams

### 5.1 Save Flow (Visual Builder → Database)

```
User edits in Visual Builder
    ↓
updateComponent() called
    ↓
State update (hasUserMadeChanges = true)
    ↓
useEffect detects change
    ↓
generatePureHTMLOutput() → HTML string
    ↓
debouncedTemplateChange() (150ms debounce)
    ↓
onTemplateChange() callback
    ↓
EnhancedTemplateEditor.onSave()
    ↓
PUT /api/profile/[username]/template
    ↓
Backend: Strip navigation, compile, detect islands
    ↓
Store: profile.compiledTemplate, profile.templateIslands
```

### 5.2 Render Flow (Database → Browser)

```
getServerSideProps (pages/resident/[username]/index.tsx)
    ├─ Fetch user profile
    ├─ Load compiledTemplate + templateIslands
    ├─ Fetch site CSS
    └─ Build ResidentData
    ↓
ProfileModeRenderer
    ├─ Detect template mode (default/enhanced/advanced)
    ├─ Extract CSS mode from customCSS
    └─ Route to appropriate renderer
    ↓
AdvancedProfileRenderer (for advanced mode)
    ├─ Load compiled islands
    ├─ Inject CSS via StaticHTMLWithIslands
    └─ Hydrate interactive components
    ↓
transformNodeToReact (AST → React elements)
    ↓
ResidentDataProvider wraps output
    ↓
Browser renders profile
```

---

## 6. Key File Reference

### Visual Builder
| File | Purpose | Lines |
|------|---------|-------|
| `components/features/templates/visual-builder/VisualTemplateBuilder.tsx` | Main orchestrator | ~2,128 |
| `components/features/templates/visual-builder/CanvasRenderer.tsx` | Editing surface | ~656 |
| `hooks/useCanvasState.ts` | Central state hook | ~900 |
| `lib/templates/visual-builder/pure-html-generator.ts` | HTML generation | - |
| `lib/templates/visual-builder/template-parser-reverse.ts` | HTML → ComponentItem | - |
| `lib/templates/visual-builder/grid-utils.ts` | Grid calculations | - |
| `lib/templates/visual-builder/snapping-utils.ts` | Smart snapping | - |

### Template Compilation
| File | Purpose | Lines |
|------|---------|-------|
| `lib/templates/compilation/template-parser.ts` | Core HTML parsing | 775 |
| `lib/templates/compilation/compiler/compiler.ts` | Compilation orchestrator | - |
| `lib/templates/compilation/compiler/island-detector.ts` | Islands detection | - |
| `lib/templates/compilation/compiler/html-optimizer.ts` | Static HTML generation | - |
| `lib/templates/compilation/template-cache.ts` | LRU cache | - |
| `lib/templates/rendering/template-renderer.tsx` | AST → React | - |

### CSS System
| File | Purpose |
|------|---------|
| `lib/utils/css/layers.ts` | CSS layer management & scoping |
| `lib/utils/css/css-mode-mapper.ts` | CSS mode mapping |
| `lib/utils/sanitization/css.ts` | CSS security sanitization |
| `lib/templates/visual-builder/css-class-generator.ts` | VB settings → CSS |
| `lib/templates/visual-builder/background-patterns.ts` | SVG pattern generation |
| `components/ui/layout/ProfileLayout.tsx` | CSS injection (default/enhanced) |
| `components/core/profile/ProfileModeRenderer.tsx` | Mode orchestration |
| `components/core/profile/AdvancedProfileRenderer.tsx` | Advanced mode rendering |

### API & Pages
| File | Purpose |
|------|---------|
| `pages/resident/[username]/template-editor.tsx` | Editor page |
| `pages/resident/[username]/index.tsx` | Profile viewer page |
| `pages/api/profile/[username]/template.ts` | Template CRUD |
| `pages/api/profile/[username]/css.ts` | CSS save endpoint |

---

## 7. Live Profile Rendering Flow

This section traces exactly how a profile renders when a user visits `/resident/[username]`.

### 7.1 Server-Side Rendering (getServerSideProps)

**File**: `pages/resident/[username]/index.tsx` (lines 456-845)

**Step-by-step execution:**

```
1. Request: GET /resident/[username]
   ↓
2. Fetch profile data from /api/profile/[username]
   - Returns: userId, username, primaryHandle, profile object, plugins
   ↓
3. Check private profile access (lines 471-485)
   - If 403 + 'private_profile' → render PrivateProfile component
   ↓
4. Fetch admin default CSS from /api/site-config (lines 499-509)
   ↓
5. Fetch site-wide CSS via getSiteCSS() (line 512)
   ↓
6. For ADVANCED templates only (lines 588-758):
   │
   ├─ Parse customTemplateAst from JSON (lines 600-623)
   │  - Handle Image→UserImage migration
   │  - Recompile if AST corrupted
   │
   ├─ Fetch content in parallel (Promise.allSettled):
   │  - getPostsForUser() → blog posts
   │  - getGuestbookForUser() → visitor messages
   │  - getPhotosForUser() → profile images
   │
   ├─ Compute viewer relationship (lines 632-651):
   │  - isFriend = isFollowing && isFollower
   │  - isFollowing = viewerFollowsOwner?.status === "accepted"
   │
   └─ Build ResidentData context (lines 729-752):
      {
        owner: { id, handle, displayName, avatarUrl },
        viewer: { id, isFriend, isFollowing, isFollower },
        posts: [...],
        guestbook: [...],
        images: [...],
        cssRenderMode: 'inherit' | 'override' | 'disable'
      }
   ↓
7. Generate pre-rendered CSS (lines 835-842):
   generateOptimizedCSS({ cssMode, templateMode, siteWideCSS, userCustomCSS })
   ↓
8. Return props to page component
```

### 7.2 CSS Mode Determination

**CSS is assembled differently per template mode:**

| Mode | CSS Sources |
|------|-------------|
| **default** | adminDefaultCSS only, ignore user CSS |
| **enhanced** | User customCSS + adminDefaultCSS |
| **advanced** | Raw user CSS as-is, no admin defaults |

### 7.3 Initial HTML Delivery

**For Advanced Templates** (lines 157-256):
```html
<div class="profile-template-root">
  <style>/* Pre-rendered CSS from server */</style>

  <!-- Optional navigation -->
  <nav class="advanced-template-nav">...</nav>

  <!-- ProfileModeRenderer renders as loading placeholder on server -->
  <div class="advanced-profile-loading">Loading...</div>
</div>
```

**For Default/Enhanced** (lines 336-451):
```html
<ProfileLayout>
  <RetroCard>
    <ProfileHeader />
  </RetroCard>
  <Tabs>...</Tabs>
  <MidiPlayer />
</ProfileLayout>
```

### 7.4 Client-Side Hydration

**ProfileModeRenderer Decision** (`components/core/profile/ProfileModeRenderer.tsx`):

```typescript
switch (mode) {
  case 'default':
    return renderDefaultMode()

  case 'enhanced':
    return renderEnhancedMode()

  case 'advanced':
    if (useIslands && compiledTemplate) {
      return <AdvancedProfileRenderer />  // Islands mode
    } else if (useIslands && !compiledTemplate) {
      return renderEnhancedMode()  // Fallback
    } else {
      return renderAdvancedLegacyMode()  // Legacy AST
    }
}
```

**AdvancedProfileRenderer is dynamically imported** (ssr: false):
```typescript
const AdvancedProfileRenderer = dynamic(
  () => import('./AdvancedProfileRenderer'),
  { ssr: false, loading: () => <div>Loading...</div> }
)
```

### 7.5 Islands Hydration Process

**File**: `components/core/profile/AdvancedProfileRenderer.tsx` (lines 39-196)

**Phase 1: Component Preloading** (lines 87-110)
```typescript
useEffect(() => {
  if (!componentsReady && islands.length > 0) {
    await preloadTemplateComponents(islands)
    setComponentsReady(true)
    setIsHydrated(true)
  }
}, [compiledTemplate?.staticHTML, islands.length])
```

**Phase 2: Static HTML Parsing** (`HTMLIslandHydration.tsx`)
```typescript
// Parse static HTML from database
const container = document.createElement('div')
container.innerHTML = staticHTML

// Convert DOM nodes to React elements
const processedContent = Array.from(container.childNodes).map(node =>
  domToReact(node, islands, residentData)
)
```

**Phase 3: DOM to React Conversion** (lines 245-621)

For each DOM node:
1. Check if it's an island placeholder (`data-island`, `data-component`)
2. Find island definition from islands array
3. Get component from dynamic registry
4. Strip positioning from props (wrapper handles it)
5. Apply CSS properties
6. Wrap in error boundary
7. Return positioned React element

**Phase 4: Island Ready Tracking**
```typescript
// ProfileIslandWrapper.tsx
const { loadedIslands, failedIslands, islandsReady } = useIslandManager(expectedIslands)

useEffect(() => {
  if (islandsReady) {
    onIslandsReady?.()  // Profile fully loaded
  }
}, [islandsReady])
```

### 7.6 Final DOM Structure

```html
<div id="__next">
  <div class="profile-template-root vb-theme-xyz">
    <nav class="navigation-preview">...</nav>

    <div class="pure-absolute-container">
      <!-- Island placeholders replaced by React components -->
      <div data-island="island-1" data-component="Heading">
        <!-- Now contains hydrated React component -->
      </div>

      <div data-island="island-2" data-component="BlogPosts">
        <!-- Now contains hydrated React component -->
      </div>
    </div>
  </div>
</div>
```

### 7.7 React Component Tree (After Hydration)

```
<ProfilePage>
├── <Head> (metadata)
├── <ProfileLayout>
│   ├── <style> (CSS injection)
│   ├── <NavigationPreview/> (optional)
│   └── <ProfileModeRenderer>
│       └── <AdvancedProfileRenderer>
│           ├── <GlobalTemplateStateProvider>
│           └── <ResidentDataProvider>
│               └── <ToastProvider>
│                   └── <StaticHTMLWithIslands>
│                       ├── Island 1: <Heading>
│                       ├── Island 2: <BlogPosts>
│                       └── Each wrapped in <IslandErrorBoundary>
├── <WelcomeHomeOverlay/> (optional)
└── <MidiPlayer/> (optional)
```

### 7.8 Complete Timeline

```
[0ms]     Browser requests /resident/[username]
[50ms]    Server: getServerSideProps starts
[100ms]   Server: Profile data fetched
[150ms]   Server: Posts, guestbook, images fetched (parallel)
[200ms]   Server: CSS generated, HTML rendered
[250ms]   HTML delivered to browser
[300ms]   Browser: Parse CSS (no FOUC)
[350ms]   Browser: Display static HTML
[400ms]   Browser: Download React bundles
[600ms]   Browser: React hydration begins
[700ms]   Browser: AdvancedProfileRenderer dynamically imported
[800ms]   Browser: Component preloading starts
[1000ms]  Browser: Islands hydration begins
[1200ms]  Browser: All islands interactive
[1500ms]  Profile fully loaded
```

---

## 8. Known Flaky Areas (Detailed)

Based on the architecture analysis, these are the primary sources of flakiness with detailed breakdowns:

---

### 8.1 Mode Detection Issues

**Files:**
- `components/features/templates/visual-builder/VisualTemplateBuilder.tsx`
- `components/core/profile/ProfileModeRenderer.tsx`

**The Problem:**
Flow vs Positioned mode is detected by string matching:
```typescript
const isFlowTemplate = !htmlContent.includes('pure-absolute-container')
```

**Failure Scenarios:**
1. Template HTML is malformed/corrupted → wrong mode detected
2. User manually edits HTML and removes the class → mode switches unexpectedly
3. Template migration leaves stale markers → mixed mode behavior

**Symptoms:**
- Components appear in wrong positions
- Drag-and-drop stops working
- Saved template doesn't match editor view

**Debugging:**
1. Check if `pure-absolute-container` exists in template HTML
2. Verify `positioningMode` on each ComponentItem
3. Look for mixed positioning modes in same template

---

### 8.2 Responsive Position Sync Issues

**Files:**
- `hooks/useCanvasState.ts`
- `lib/templates/visual-builder/grid-utils.ts`

**The Problem:**
PHASE 4.2 responsive positions are stored separately:
```typescript
interface ComponentItem {
  position: { x, y },              // Desktop (base)
  responsivePositions?: {
    tablet?: { x, y },             // Tablet override
    mobile?: { x, y }              // Mobile override
  }
}
```

**Failure Scenarios:**
1. User edits desktop position → tablet/mobile positions not updated
2. Component resized on desktop → responsive positions have wrong bounds
3. Grid snapping applied inconsistently across breakpoints

**Symptoms:**
- Component looks fine on desktop, broken on mobile
- Switching breakpoints shows component in unexpected location
- Saved template has different positions than preview

**Debugging:**
1. Log `getEffectivePosition(component, breakpoint)` for each breakpoint
2. Check if base position changed without responsive update
3. Verify grid calculations for each breakpoint config

---

### 8.3 Template Parsing Edge Cases

**File:** `lib/templates/compilation/template-parser.ts` (775 lines)

**The Problem:**
Self-closing tag conversion uses regex that can fail with complex attributes:
```typescript
// Attributes like where="item.price > 100" contain '>'
// This breaks the self-closing tag regex
```

**Failure Scenarios:**
1. Conditional expressions with `>` or `<` → parsing fails
2. JSON in attributes with unescaped quotes → attribute truncated
3. Nested component tags → incorrect closing tag matching

**Symptoms:**
- Template won't save ("Syntax error in template")
- Components disappear after save
- Preview shows "Error parsing template"

**Debugging:**
1. Call `detectSyntaxErrors(templateHtml)` to get specific error
2. Check for unclosed tags in error message
3. Look for `>` or `<` inside attribute values

---

### 8.4 Island Hydration Mismatch

**Files:**
- `lib/templates/compilation/compiler/island-detector.ts`
- `components/core/profile/AdvancedProfileRenderer.tsx`
- `components/core/profile/HTMLIslandHydration.tsx`

**The Problem:**
Islands must match exactly between:
1. Server compilation (stored in DB)
2. Client hydration (parsed from staticHTML)

```typescript
// Server: generates island IDs
const islandId = `${componentType}-${pathHash}`

// Client: looks for matching placeholder
const placeholder = document.querySelector(`[data-island="${islandId}"]`)
```

**Failure Scenarios:**
1. Template recompiled with different island IDs → placeholders don't match
2. Component registry changed → component type lookup fails
3. Props differ between server/client → hydration warning

**Symptoms:**
- "Hydration failed" error in console
- Interactive components don't respond to clicks
- Loading spinner that never resolves
- Console warning: "Expected server HTML to contain..."

**Debugging:**
1. Compare `templateIslands` from props with actual placeholders in DOM
2. Check if `compiledTemplate.staticHTML` matches `templateIslands` array
3. Verify component is in registry: `getLoadedComponent(type)`

---

### 8.5 CSS Layer Browser Support

**File:** `lib/utils/css/layers.ts`

**The Problem:**
CSS `@layer` has inconsistent browser support. Fallback uses specificity hacks:
```css
/* Modern browsers */
@layer threadstead-user-nuclear { ... }

/* Fallback for older browsers */
html body html body .selector { ... !important }
```

**Failure Scenarios:**
1. Safari < 15.4 → layers not supported, uses fallback
2. Fallback specificity conflicts with component styles
3. Nuclear dominance overrides things it shouldn't

**Symptoms:**
- Styles work in Chrome, broken in Safari
- User CSS overrides critical UI elements
- Theme colors don't apply consistently

**Debugging:**
1. Check `CSS.supports('@layer', 'test')` in browser console
2. Inspect computed styles to see which layer won
3. Look for `!important` conflicts in DevTools

---

### 8.6 Debounce Race Conditions

**File:** `components/features/templates/visual-builder/VisualTemplateBuilder.tsx`

**The Problem:**
Template changes debounced to reduce API calls:
```typescript
const debouncedTemplateChange = useMemo(
  () => debounce((html, css) => onTemplateChange?.(html, css), 150),
  [onTemplateChange]
)
```

**Failure Scenarios:**
1. User makes edit → immediately closes tab → change lost
2. Rapid edits → only last change saved → intermediate states lost
3. Network slow → user sees "saved" but API hasn't responded

**Symptoms:**
- "I just saved that and it's gone!"
- Undo history doesn't match saved state
- Template reverts to older version on page refresh

**Debugging:**
1. Add logging to `onTemplateChange` callback
2. Check network tab for pending PUT requests
3. Verify `hasUserMadeChanges` flag is true before save

---

### 8.7 AST Corruption During Migration

**Files:**
- `pages/resident/[username]/index.tsx` (lines 600-623)
- `lib/templates/compilation/template-parser.ts`

**The Problem:**
Legacy templates undergo migration that can corrupt AST:
```typescript
// Migration: Image → UserImage
const migratedAst = JSON.parse(
  JSON.stringify(ast).replace(/"Image"/g, '"UserImage"')
)
```

**Failure Scenarios:**
1. String replacement affects attribute values, not just tag names
2. Double-migration if template loaded multiple times
3. Partial migration leaves mixed component types

**Symptoms:**
- "Unknown component: Image" error
- Template shows blank where images should be
- Components have wrong props after migration

**Debugging:**
1. Check `customTemplateAst` in database for corrupted JSON
2. Look for `"Image"` vs `"UserImage"` in AST
3. Compare raw template HTML with parsed AST

---

### 8.8 ResidentData Context Not Available

**File:** `components/features/templates/ResidentDataProvider.tsx`

**The Problem:**
Components access data via context, but context may not be available:
```typescript
const residentData = useResidentData()
// If called outside provider, returns null
```

**Failure Scenarios:**
1. Component rendered before provider mounted
2. Error boundary catches error, re-renders without provider
3. Dynamic import loads component before context ready

**Symptoms:**
- "Cannot read property 'owner' of null"
- Profile loads but all dynamic content blank
- Only static text visible, no user data

**Debugging:**
1. Add null check: `if (!residentData) return <Loading />`
2. Check React DevTools for provider in component tree
3. Verify `residentData` prop passed to page component

---

### 8.9 Component Preloading Timeout

**File:** `components/core/profile/AdvancedProfileRenderer.tsx`

**The Problem:**
Component preloading has no timeout or retry:
```typescript
await preloadTemplateComponents(islands)
// If this hangs, profile never finishes loading
```

**Failure Scenarios:**
1. Component chunk fails to load (network error)
2. Circular dependency causes infinite loop
3. Too many islands → memory pressure → slow load

**Symptoms:**
- Loading spinner forever
- Profile partially loads, some islands missing
- Browser becomes unresponsive

**Debugging:**
1. Check network tab for failed chunk requests
2. Monitor `componentsReady` state in React DevTools
3. Look for console errors during preload phase

---

### 8.10 CSS Sanitization Over-Aggressive

**File:** `lib/utils/sanitization/css.ts`

**The Problem:**
Security sanitization may block legitimate CSS:
```typescript
// Blocks anything with 'javascript:' anywhere
if (css.includes('javascript:')) {
  return '' // Entire CSS rejected
}
```

**Failure Scenarios:**
1. Comment mentions "javascript" → entire CSS rejected
2. URL with encoded characters → false positive
3. New CSS features not in whitelist → stripped

**Symptoms:**
- Custom CSS doesn't apply at all
- Some rules work, others silently dropped
- "My CSS worked yesterday, now it's gone"

**Debugging:**
1. Compare input CSS with sanitized output
2. Check for blocked patterns in sanitizer
3. Look for console warnings about stripped CSS

---

## 9. Troubleshooting Quick Reference

| Symptom | Likely Cause | First Check |
|---------|--------------|-------------|
| Components in wrong position | Mode detection (8.1) | `pure-absolute-container` class present? |
| Mobile layout broken | Responsive sync (8.2) | `responsivePositions` populated? |
| Template won't save | Parsing edge case (8.3) | `>` or `<` in attribute values? |
| Islands not interactive | Hydration mismatch (8.4) | Island IDs match placeholders? |
| Styles inconsistent across browsers | CSS layers (8.5) | Safari version < 15.4? |
| Changes lost after save | Debounce race (8.6) | Network request completed? |
| Images missing after update | AST corruption (8.7) | `"Image"` still in AST? |
| Blank dynamic content | Context missing (8.8) | `ResidentDataProvider` in tree? |
| Infinite loading | Preload timeout (8.9) | Chunk load errors in network? |
| CSS not applying | Sanitization (8.10) | Dangerous patterns in CSS? |

---

## 10. Key File Quick Reference

### Visual Builder
| File | Lines | Purpose |
|------|-------|---------|
| `components/features/templates/visual-builder/VisualTemplateBuilder.tsx` | ~2,128 | Main orchestrator |
| `hooks/useCanvasState.ts` | ~900 | State management |
| `lib/templates/visual-builder/pure-html-generator.ts` | - | HTML output |

### Template Compilation
| File | Lines | Purpose |
|------|-------|---------|
| `lib/templates/compilation/template-parser.ts` | 775 | HTML parsing |
| `lib/templates/compilation/compiler/island-detector.ts` | - | Islands detection |
| `lib/templates/compilation/template-cache.ts` | - | LRU cache |

### Live Rendering
| File | Lines | Purpose |
|------|-------|---------|
| `pages/resident/[username]/index.tsx` | 456-845 | SSR entry point |
| `components/core/profile/ProfileModeRenderer.tsx` | - | Mode routing |
| `components/core/profile/AdvancedProfileRenderer.tsx` | 39-196 | Islands hydration |
| `components/core/profile/HTMLIslandHydration.tsx` | 98-728 | DOM→React conversion |

### CSS System
| File | Purpose |
|------|---------|
| `lib/utils/css/layers.ts` | Layer management |
| `lib/utils/sanitization/css.ts` | Security sanitization |
| `components/ui/layout/ProfileLayout.tsx` | CSS injection |
