# WYSIWYG Visual Builder Guidelines

## Overview
This document provides guidelines for ensuring Visual Builder components render identically on the Profile page (WYSIWYG - What You See Is What You Get). These patterns prevent visual discrepancies between editing and published views.

## Component Categorization System

All components are automatically categorized by their sizing behavior using shared utilities in `grid-utils.ts`:

### 1. Content-Driven Components
**Examples**: `paragraph`, `textelement`, `heading`, `bio`, `contactcard`
- **Behavior**: Expand with content but respect user constraints
- **Container**: `width: 'fit-content'`, `maxWidth: Math.max(userWidth * 2, 400)px`
- **Use Case**: Text components that need to wrap naturally

### 2. Container-Filler Components
**Examples**: `gradientbox`, `stickynote`, `retroterminal`
- **Behavior**: Fill their container exactly as user specifies
- **Container**: Fixed `width` and `height` from user input
- **Use Case**: Layout containers and decorative elements

### 3. Square Components
**Examples**: `profilephoto`, `userimage`, `friendbadge`
- **Behavior**: Maintain square aspect ratio to prevent distortion
- **Container**: Square dimensions using `Math.min(userWidth, userHeight)`
- **Use Case**: Images and icons that must preserve aspect ratio

### 4. Auto-Size Components
**Examples**: `displayname`, `followbutton`, `mutualfriends`
- **Behavior**: Balance user intent with natural component size
- **Container**: Respect user dimensions with slight flexibility
- **Use Case**: Interactive elements with intrinsic sizing

## WYSIWYG Implementation Checklist

### ✅ Required for All Components

1. **Use Shared Categorization**
   ```typescript
   import { getComponentSizingCategory } from '@/lib/templates/visual-builder/grid-utils';
   const category = getComponentSizingCategory(componentType);
   ```

2. **Consistent Container Padding**
   - Visual Builder: `padding: ${gridConfig.currentBreakpoint.containerPadding}px`
   - Profile Page: `padding: ${getCurrentBreakpoint().containerPadding}px`

3. **Unified Grid Calculations**
   ```typescript
   import { gridToPixelCoordinates, calculateSpanWidth } from '@/lib/templates/visual-builder/grid-utils';
   ```

### ✅ Required for Text Components

4. **Consistent Text Wrapping CSS**
   ```css
   word-wrap: break-word;
   overflow-wrap: break-word;
   hyphens: auto;
   overflow-x: hidden;
   ```

5. **Consistent Text Wrapping Classes**
   ```typescript
   className="break-words hyphens-auto"
   ```

6. **Avoid Visual Builder-Only Layout Styles**
   - ❌ Don't: Different padding/margins when `_isInVisualBuilder`
   - ✅ Do: Same layout styles in both contexts, only visual editing indicators differ

### ✅ Required for Layout Components

7. **Consistent Sizing Strategy**
   - Content-driven: Use flexible width with maxWidth constraints
   - Container-filler: Use exact user dimensions
   - Square: Use square containers to prevent distortion

## Debug and Validation

### Debug Logging Pattern
Add to all Visual Builder components:
```typescript
console.log('🎯 [WYSIWYG] ComponentName render:', {
  isInVisualBuilder: _isInVisualBuilder,
  positioningMode: _positioningMode,
  size: _size,
  category: getComponentSizingCategory(componentType),
  finalStyle: finalStyle
});
```

### Data Attributes for Testing
Add to containers:
```typescript
data-wysiwyg-padding={getCurrentBreakpoint().containerPadding}
data-wysiwyg-breakpoint={getCurrentBreakpoint().name}
data-wysiwyg-category={getComponentSizingCategory(componentType)}
```

### Manual Validation Steps
1. **Position Test**: Component at (x: 100, y: 50) appears at same location in both contexts
2. **Size Test**: Component width/height behavior matches between contexts
3. **Text Wrap Test**: Text breaks at same points in both Visual Builder and Profile
4. **Responsive Test**: Component behaves consistently across breakpoints

## Common Anti-Patterns

### ❌ Don't: Context-Specific Layout Styles
```typescript
// Bad - different layout behavior
style={{
  width: _isInVisualBuilder ? '200px' : 'fit-content'
}}
```

### ❌ Don't: Manual Coordinate Translation
```typescript
// Bad - manual offset calculations
const x = _isInVisualBuilder ? position.x : position.x + padding;
```

### ❌ Don't: Different Container Sizing Logic
```typescript
// Bad - different sizing approaches
if (_isInVisualBuilder) {
  containerStyle = { width: '200px', height: '150px' };
} else {
  containerStyle = { width: 'fit-content', maxWidth: '400px' };
}
```

## Best Practices

### ✅ Do: Use Shared Component Categories
```typescript
const category = getComponentSizingCategory(component.type);
if (category === 'content-driven') {
  // Apply content-driven sizing in both contexts
}
```

### ✅ Do: Consistent Container Logic
```typescript
// Same sizing logic used by both Visual Builder and Profile page
const containerStyle = getContainerStyleForCategory(category, userSize);
```

### ✅ Do: Visual-Only Differences
```typescript
// Only visual editing indicators should differ
className={`base-styles ${_isInVisualBuilder ? 'hover:outline hover:outline-gray-300' : ''}`}
```

### ✅ Do: Unified Grid System
```typescript
// Both contexts use same grid utilities
const position = gridToPixelCoordinates(column, row, canvasWidth, breakpoint);
const width = calculateSpanWidth(span, canvasWidth, breakpoint);
```

## Testing and Maintenance

### Automated Testing
- Add tests that compare component rendering between Visual Builder and Profile contexts
- Validate coordinate accuracy within 1px tolerance
- Test text wrapping consistency across different content lengths

### Manual QA Process
1. Create component in Visual Builder at specific coordinates
2. Publish template and verify component appears at same visual location
3. Test with different content lengths and container sizes
4. Verify responsive behavior across breakpoints

### Regression Prevention
- Use shared utilities for all coordinate calculations
- Avoid component-specific Visual Builder styling
- Follow component categorization patterns
- Add debug logging for suspicious behavior

## Component Development Workflow

1. **Categorize Component**: Determine if content-driven, container-filler, square, or auto-size
2. **Use Shared Utilities**: Import categorization and grid utilities
3. **Implement Consistent Styling**: Apply same layout logic in both contexts
4. **Add Debug Logging**: Include WYSIWYG validation logging
5. **Test Both Contexts**: Verify identical rendering in Visual Builder and Profile page
6. **Document Special Cases**: Note any unique requirements or constraints

Following these guidelines ensures new components maintain WYSIWYG accuracy and existing components remain consistent across updates.