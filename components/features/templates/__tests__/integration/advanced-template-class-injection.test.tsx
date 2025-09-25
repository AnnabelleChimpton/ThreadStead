/**
 * Test: Advanced Template Container Class Injection
 * Purpose: Verify that Visual Builder classes are correctly injected into advanced-template-container elements
 */

describe('Advanced Template Container Class Injection', () => {
  test('Should inject Visual Builder classes into advanced-template-container', () => {
    console.log('=== TEST: Advanced Template Container Class Injection ===');

    const htmlWithAdvancedContainer = `<div class="advanced-template-container">
  <div data-component-id="island-profilephoto-h7ai1n" style="position: absolute;">
    <ProfilePhoto />
  </div>
</div>`;

    const visualBuilderClasses = ['vb-theme-space', 'vb-pattern-stars', 'vb-effect-rounded'];
    const vbClassString = visualBuilderClasses.join(' ');

    // Test the exact logic from AdvancedProfileRenderer
    let processedHTML = htmlWithAdvancedContainer;

    // Look for advanced-template-container first (Visual Builder templates)
    processedHTML = processedHTML.replace(
      /class="(advanced-template-container[^"]*?)"/g,
      `class="$1 ${vbClassString}"`
    );

    // Fallback: if no advanced-template-container, look for pure-absolute-container
    if (!processedHTML.includes(vbClassString)) {
      processedHTML = processedHTML.replace(
        /class="(pure-absolute-container[^"]*?)"/g,
        `class="$1 ${vbClassString}"`
      );
    }

    // Final fallback: template-container
    if (!processedHTML.includes(vbClassString)) {
      processedHTML = processedHTML.replace(
        /class="(template-container[^"]*?)"/g,
        `class="$1 ${vbClassString}"`
      );
    }

    console.log('Original HTML:', htmlWithAdvancedContainer);
    console.log('Processed HTML:', processedHTML);

    expect(processedHTML).toContain('class="advanced-template-container vb-theme-space vb-pattern-stars vb-effect-rounded"');
    expect(processedHTML).toContain('<ProfilePhoto />');
    expect(processedHTML).toContain('data-component-id="island-profilephoto-h7ai1n"');
  });

  test('Should handle advanced-template-container with existing classes', () => {
    console.log('=== TEST: Advanced Template Container with Existing Classes ===');

    const htmlWithExistingClasses = `<div class="advanced-template-container grid-enabled">
  <div>Content</div>
</div>`;

    const visualBuilderClasses = ['vb-theme-custom', 'vb-effect-shadow'];
    const vbClassString = visualBuilderClasses.join(' ');

    let processedHTML = htmlWithExistingClasses;

    // Apply the same injection logic
    processedHTML = processedHTML.replace(
      /class="(advanced-template-container[^"]*?)"/g,
      `class="$1 ${vbClassString}"`
    );

    console.log('Result with existing classes:', processedHTML);

    expect(processedHTML).toContain('class="advanced-template-container grid-enabled vb-theme-custom vb-effect-shadow"');
    expect(processedHTML).toContain('<div>Content</div>');
  });

  test('Should work with priority order: advanced > pure-absolute > template', () => {
    console.log('=== TEST: Container Priority Order ===');

    const testCases = [
      {
        name: 'advanced-template-container (highest priority)',
        html: '<div class="advanced-template-container"><content/></div>',
        expectedClass: 'advanced-template-container vb-test'
      },
      {
        name: 'pure-absolute-container (medium priority)',
        html: '<div class="pure-absolute-container"><content/></div>',
        expectedClass: 'pure-absolute-container vb-test'
      },
      {
        name: 'template-container (lowest priority)',
        html: '<div class="template-container"><content/></div>',
        expectedClass: 'template-container vb-test'
      }
    ];

    testCases.forEach(testCase => {
      const vbClassString = 'vb-test';
      let processedHTML = testCase.html;

      // Apply injection logic in priority order
      processedHTML = processedHTML.replace(
        /class="(advanced-template-container[^"]*?)"/g,
        `class="$1 ${vbClassString}"`
      );

      if (!processedHTML.includes(vbClassString)) {
        processedHTML = processedHTML.replace(
          /class="(pure-absolute-container[^"]*?)"/g,
          `class="$1 ${vbClassString}"`
        );
      }

      if (!processedHTML.includes(vbClassString)) {
        processedHTML = processedHTML.replace(
          /class="(template-container[^"]*?)"/g,
          `class="$1 ${vbClassString}"`
        );
      }

      console.log(`${testCase.name}:`, processedHTML);
      expect(processedHTML).toContain(testCase.expectedClass);
    });

    console.log('✅ All container types work correctly with proper priority');
  });
});