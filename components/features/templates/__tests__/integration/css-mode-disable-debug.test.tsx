/**
 * Debug Test: CSS Mode Disable Issue
 * Purpose: Test what happens with CSS mode "disable" - user's exact scenario
 */

import { generateOptimizedCSS } from '@/lib/utils/css/layers';

describe('CSS Mode Disable Debug', () => {
  test('CSS mode disable should preserve Visual Builder theme classes', () => {
    console.log('=== DEBUG: CSS Mode Disable (user\'s exact scenario) ===');

    // User's exact CSS from the API request
    const userCSS = `/* Visual Builder Generated CSS */
/* Visual Builder Generated CSS */
/* CSS Custom Properties for easy editing */
/* CSS Classes for styling */

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
  --vb-box-shadow: 0 0 50px rgba(100,149,237,0.2);
  --vb-animation: zoom;
}

.vb-theme-space {
  background-color: var(--global-bg-color);
  font-family: var(--global-font-family);
  font-size: var(--global-base-font-size);
  text-shadow: 0 0 20px rgba(100,149,237,0.5);
  padding: var(--global-container-padding);
}

.vb-theme-space {
  --vb-typography-scale: 1.333;
}

.vb-pattern-stars {
  background-image: url("data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%0A%20%20%20%20%20%20%20%20%3Cpolygon%20points%3D%2220%2C10%2024%2C18%2030%2C14%2026%2C22%2032%2C30%2020%2C24%208%2C30%2014%2C22%2010%2C14%2016%2C18%22%0A%20%20%20%20%20%20%20%20%20%20fill%3D%22%23ffffff%22%20opacity%3D%220.8%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Cpolygon%20points%3D%2240%2C30%2042%2C33%2045%2C32%2043%2C35%2046%2C38%2040%2C36%2034%2C38%2037%2C35%2035%2C32%2038%2C33%22%0A%20%20%20%20%20%20%20%20%20%20fill%3D%22%23ffd700%22%20opacity%3D%220.48%22%2F%3E%0A%20%20%20%20%20%20%3C%2Fsvg%3E");
  background-repeat: repeat;
  background-size: 40px 40px;
  --vb-pattern-primary-color: #ffffff;
  --vb-pattern-size: 1;
  --vb-pattern-opacity: 0.8;
  --vb-pattern-secondary-color: #ffd700;
}

.vb-pattern-stars-animated {
  animation: vb-twinkle 3s ease-in-out infinite;
}

@keyframes vb-twinkle {
  0%, 100%: opacity: 0.8;
  50%: opacity: 0.24;
}

.vb-effect-rounded {
  border-radius: 8px;
}

.vb-effect-shadow {
  box-shadow: 0 0 50px rgba(100,149,237,0.2);
}

.vb-effect-zoom {
  animation: vb-zoom-in 0.6s ease-out;
  transform: scale(0.95);
}`;

    console.log('Input CSS contains:');
    console.log('- :root variables:', userCSS.includes(':root'));
    console.log('- .vb-theme-space:', userCSS.includes('.vb-theme-space'));
    console.log('- .vb-pattern-stars:', userCSS.includes('.vb-pattern-stars'));
    console.log('- @keyframes:', userCSS.includes('@keyframes'));

    // Test with CSS mode "disable" (user's exact scenario)
    const optimizedCSS = generateOptimizedCSS({
      cssMode: 'disable',
      templateMode: 'advanced',
      siteWideCSS: '',
      userCustomCSS: userCSS,
      profileId: 'profile-123'
    });

    console.log('\nOptimized CSS (first 500 chars):');
    console.log(optimizedCSS.substring(0, 500));

    console.log('\nOptimized CSS contains:');
    console.log('- :root variables:', optimizedCSS.includes(':root'));
    console.log('- .vb-theme-space:', optimizedCSS.includes('.vb-theme-space'));
    console.log('- .vb-pattern-stars:', optimizedCSS.includes('.vb-pattern-stars'));
    console.log('- @keyframes:', optimizedCSS.includes('@keyframes'));
    console.log('- background-color: var(:', optimizedCSS.includes('background-color: var('));

    // Check if CSS is being truncated
    console.log(`\nCSS Length Analysis:`);
    console.log(`- Input CSS length: ${userCSS.length} chars`);
    console.log(`- Output CSS length: ${optimizedCSS.length} chars`);

    if (optimizedCSS.length < userCSS.length * 0.8) {
      console.warn('⚠️ WARNING: Output CSS is significantly shorter - possible truncation!');
    }

    // Critical assertions
    expect(optimizedCSS).toContain(':root');
    expect(optimizedCSS).toContain('--global-bg-color: #0a0e27');

    // The critical test - theme classes should be preserved
    if (!optimizedCSS.includes('.vb-theme-space')) {
      console.error('❌ PROBLEM FOUND: CSS mode "disable" is stripping theme classes!');
      console.error('This is why the user sees :root variables but no theme classes.');

      // Look for patterns in the optimized CSS
      const hasAnyClassDefinition = optimizedCSS.includes('.vb-');
      const hasOnlyVariables = optimizedCSS.includes('--global-bg-color') && !hasAnyClassDefinition;

      if (hasOnlyVariables) {
        console.error('❌ CONFIRMED: Only CSS variables preserved, all class definitions lost!');
      }
    } else {
      console.log('✅ SUCCESS: Theme classes preserved in disable mode');
    }

    expect(optimizedCSS).toContain('.vb-theme-space');
  });

  test('Compare disable vs override mode', () => {
    console.log('\n=== COMPARISON: Disable vs Override Mode ===');

    const testCSS = `
:root {
  --global-bg-color: #0a0e27;
}

.vb-theme-space {
  background-color: var(--global-bg-color);
}`;

    // Test disable mode
    const disableResult = generateOptimizedCSS({
      cssMode: 'disable',
      templateMode: 'advanced',
      siteWideCSS: '',
      userCustomCSS: testCSS,
      profileId: 'test-profile'
    });

    // Test override mode
    const overrideResult = generateOptimizedCSS({
      cssMode: 'override',
      templateMode: 'advanced',
      siteWideCSS: '',
      userCustomCSS: testCSS,
      profileId: 'test-profile'
    });

    console.log('DISABLE mode preserves .vb-theme-space:', disableResult.includes('.vb-theme-space'));
    console.log('OVERRIDE mode preserves .vb-theme-space:', overrideResult.includes('.vb-theme-space'));

    const disableHasClasses = disableResult.includes('.vb-theme-space');
    const overrideHasClasses = overrideResult.includes('.vb-theme-space');

    if (overrideHasClasses && !disableHasClasses) {
      console.error('❌ PROBLEM: Override mode works but disable mode doesn\'t!');
      console.error('This confirms the issue is specific to CSS mode "disable"');
    } else if (disableHasClasses && overrideHasClasses) {
      console.log('✅ Both modes preserve theme classes correctly');
    }

    expect(disableResult).toContain('.vb-theme-space');
    expect(overrideResult).toContain('.vb-theme-space');
  });
});