/**
 * Debug Test: Incomplete CSS Handling
 * Purpose: Test what happens when CSS has :root variables but missing theme classes
 */

import { extractVisualBuilderClasses } from '@/lib/utils/css/visual-builder-class-extractor';
import { generateOptimizedCSS } from '@/lib/utils/css/layers';

describe('Incomplete CSS Debug', () => {
  test('What happens with only :root variables (no theme classes)', () => {
    console.log('=== DEBUG: Incomplete CSS (user\'s actual scenario) ===');

    // This mimics what the user is seeing - only :root variables, no theme classes
    const incompleteCSS = `
:root {
  --global-bg-color: #0a0e27;
  --vb-bg-type: pattern;
  --vb-pattern-type: stars;
  --vb-pattern-primary: #ffffff;
  --vb-pattern-size: 1;
  --vb-pattern-opacity: 0.8;
  --vb-pattern-secondary: #ffd700;
  --vb-pattern-animated: true;
  --global-font-family: "Roboto", sans-serif;
  --global-base-font-size: 16px;
  --global-typography-scale: 1.333;
  --global-container-padding: 24px;
  --global-section-spacing: 32px;
  --vb-theme: space;
  --vb-border-radius: 8px;
  --vb-box-shadow: 0 0 50px rgba(100, 149, 237, 0.2);
  --vb-animation: zoom;
}`;

    console.log('Incomplete CSS (user\'s scenario):');
    console.log(incompleteCSS);

    // Try to extract VB classes from incomplete CSS
    const extractedClasses = extractVisualBuilderClasses(incompleteCSS);
    console.log('\nExtracted VB classes from incomplete CSS:', extractedClasses);

    // This should be empty because there are no .vb-* class definitions
    expect(extractedClasses).toEqual([]);

    console.log('\n❌ PROBLEM IDENTIFIED: CSS has variables but no class definitions!');
    console.log('The HTML elements need classes like "vb-theme-space" but they don\'t exist in the CSS.');

    // Test what happens when we pass this through optimization
    const optimizedCSS = generateOptimizedCSS({
      cssMode: 'override',
      templateMode: 'advanced',
      siteWideCSS: '',
      userCustomCSS: incompleteCSS,
      profileId: 'test-profile'
    });

    console.log('\nOptimized incomplete CSS:');
    console.log(optimizedCSS);

    // Check if optimization adds any theme classes
    const hasThemeClasses = optimizedCSS.includes('.vb-theme-space');
    console.log('\nOptimized CSS contains theme classes:', hasThemeClasses);

    if (!hasThemeClasses) {
      console.log('❌ CONFIRMED: CSS optimization cannot create missing theme classes!');
      console.log('The theme classes must be present in the original CSS to work.');
    }
  });

  test('Compare complete vs incomplete CSS', () => {
    console.log('\n=== COMPARISON: Complete vs Incomplete CSS ===');

    // Complete CSS (what should be saved)
    const completeCSS = `
:root {
  --global-bg-color: #0a0e27;
  --vb-theme: space;
}

.vb-theme-space {
  background-color: var(--global-bg-color);
  font-family: var(--global-font-family);
}

.vb-pattern-stars {
  background-image: url("data:image/svg+xml...");
}`;

    // Incomplete CSS (what user actually has)
    const incompleteCSS = `
:root {
  --global-bg-color: #0a0e27;
  --vb-theme: space;
}`;

    console.log('COMPLETE CSS classes:', extractVisualBuilderClasses(completeCSS));
    console.log('INCOMPLETE CSS classes:', extractVisualBuilderClasses(incompleteCSS));

    const completeClasses = extractVisualBuilderClasses(completeCSS);
    const incompleteClasses = extractVisualBuilderClasses(incompleteCSS);

    expect(completeClasses.length).toBeGreaterThan(0);
    expect(incompleteClasses.length).toBe(0);

    console.log('\n✅ DIAGNOSIS: User\'s CSS is missing the theme class definitions!');
    console.log('The CSS needs both :root variables AND .vb-theme-* class definitions to work.');
  });

  test('Simulate the fix needed', () => {
    console.log('\n=== SIMULATION: What user needs ===');

    // Current incomplete CSS
    const currentCSS = `
:root {
  --global-bg-color: #0a0e27;
  --vb-bg-type: pattern;
  --vb-pattern-type: stars;
  --vb-theme: space;
}`;

    // What needs to be added
    const missingCSS = `
.vb-theme-space {
  background-color: var(--global-bg-color);
  font-family: var(--global-font-family);
  font-size: var(--global-base-font-size);
  padding: var(--global-container-padding);
}

.vb-pattern-stars {
  background-image: url("data:image/svg+xml;base64,...");
}`;

    const completeCSS = currentCSS + missingCSS;

    console.log('Current CSS classes:', extractVisualBuilderClasses(currentCSS));
    console.log('Complete CSS classes:', extractVisualBuilderClasses(completeCSS));

    const optimizedComplete = generateOptimizedCSS({
      cssMode: 'override',
      templateMode: 'advanced',
      siteWideCSS: '',
      userCustomCSS: completeCSS,
      profileId: 'test-profile'
    });

    console.log('\nOptimized complete CSS contains theme classes:', optimizedComplete.includes('.vb-theme-space'));

    console.log('\n🎯 SOLUTION: User needs the complete CSS with theme class definitions!');
    console.log('The issue is that only the :root variables were saved, not the theme classes.');
  });
});