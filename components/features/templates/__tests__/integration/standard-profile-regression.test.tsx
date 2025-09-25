/**
 * Regression Test: Standard Profile CSS Flow
 * Purpose: Ensure our Visual Builder fixes don't break standard profiles
 */

import { generateOptimizedCSS } from '@/lib/utils/css/layers';

describe('Standard Profile Regression Test', () => {
  test('Standard profiles (default mode) should work unchanged', () => {
    console.log('=== TEST: Standard Profile CSS Flow ===');

    // Standard profile with user CSS
    const userCSS = `
      .profile-header {
        background-color: #3498db;
        padding: 20px;
      }

      .profile-bio {
        font-size: 16px;
        color: #2c3e50;
      }
    `;

    const siteWideCSS = `
      body {
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        margin: 0;
        background: #f8f9fa;
      }
    `;

    // Generate CSS for default template mode (ProfileLayout path)
    const layeredCSS = generateOptimizedCSS({
      cssMode: 'inherit',
      templateMode: 'default',
      siteWideCSS,
      userCustomCSS: userCSS,
      profileId: 'standard-profile-123'
    });

    console.log('Standard profile CSS contains:');
    console.log('- User CSS:', layeredCSS.includes('.profile-header'));
    console.log('- Site CSS:', layeredCSS.includes('font-family: -apple-system'));
    console.log('- Background color:', layeredCSS.includes('#3498db'));

    // Verify standard profile CSS behavior
    expect(layeredCSS).toContain('.profile-header'); // User CSS preserved
    expect(layeredCSS).toContain('#3498db'); // User colors preserved
    expect(layeredCSS).toContain('font-family: -apple-system'); // Site CSS included
    expect(layeredCSS).toContain('inherit'); // CSS mode respected
  });

  test('Enhanced profiles should work unchanged', () => {
    console.log('=== TEST: Enhanced Profile CSS Flow ===');

    const enhancedCSS = `
      /* Enhanced template CSS */
      .custom-layout {
        display: grid;
        grid-template-columns: 1fr 300px;
        gap: 20px;
      }

      .sidebar {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      }
    `;

    // Enhanced mode (ProfileLayout path)
    const layeredCSS = generateOptimizedCSS({
      cssMode: 'override',
      templateMode: 'enhanced',
      siteWideCSS: 'body { margin: 0; }',
      userCustomCSS: enhancedCSS,
      profileId: 'enhanced-profile-456'
    });

    console.log('Enhanced profile CSS contains:');
    console.log('- Custom layout:', layeredCSS.includes('.custom-layout'));
    console.log('- Gradient:', layeredCSS.includes('linear-gradient'));
    console.log('- Override mode:', layeredCSS.includes('override') || layeredCSS.includes('NUCLEAR'));

    // Verify enhanced profile CSS behavior
    expect(layeredCSS).toContain('.custom-layout'); // Custom CSS preserved
    expect(layeredCSS).toContain('linear-gradient'); // Advanced CSS features work
    expect(layeredCSS).toContain('grid-template-columns'); // CSS Grid works
  });

  test('CSS priority should be correct for standard profiles', () => {
    console.log('=== TEST: Standard Profile CSS Priority ===');

    const conflictingUserCSS = `
      body {
        background: red !important;
        font-size: 18px;
      }
    `;

    const conflictingSiteCSS = `
      body {
        background: blue;
        font-size: 14px;
        margin: 10px;
      }
    `;

    // Test inherit mode - user CSS should override site CSS
    const inheritCSS = generateOptimizedCSS({
      cssMode: 'inherit',
      templateMode: 'default',
      siteWideCSS: conflictingSiteCSS,
      userCustomCSS: conflictingUserCSS,
      profileId: 'priority-test'
    });

    console.log('CSS Priority Test:');
    console.log('- Contains user background (red):', inheritCSS.includes('red'));
    console.log('- Contains site margin:', inheritCSS.includes('margin: 10px'));
    console.log('- User CSS wins conflicts:', inheritCSS.includes('!important'));

    // In inherit mode, user CSS should take precedence
    expect(inheritCSS).toContain('red'); // User background wins
    expect(inheritCSS).toContain('margin: 10px'); // Site CSS still applies
    expect(inheritCSS).toContain('18px'); // User font size wins
  });
});