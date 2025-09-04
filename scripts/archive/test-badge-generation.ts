import { generateThreadRingBadge, validateBadgeContent } from '../lib/badge-generator';
import { BADGE_TEMPLATES, getBadgeTemplate } from '../lib/threadring-badges';

async function testBadgeGeneration() {
  console.log('🔍 Testing Badge Generation Logic\n');
  console.log('=====================================\n');

  // Test 1: Default badge generation
  console.log('Test 1: Default badge generation');
  const defaultBadge = await generateThreadRingBadge('Test Ring', 'test-ring');
  console.log('Default badge:', {
    title: defaultBadge.title,
    backgroundColor: defaultBadge.backgroundColor,
    textColor: defaultBadge.textColor,
    templateId: defaultBadge.templateId,
    isGenerated: defaultBadge.isGenerated
  });
  console.log('---\n');

  // Test 2: Badge with specific template
  console.log('Test 2: Badge with template (retro_green)');
  const templateBadge = await generateThreadRingBadge('Template Test', 'template-test', {
    templateId: 'retro_green'
  });
  console.log('Template badge:', {
    title: templateBadge.title,
    backgroundColor: templateBadge.backgroundColor,
    textColor: templateBadge.textColor,
    templateId: templateBadge.templateId,
    isGenerated: templateBadge.isGenerated
  });
  console.log('---\n');

  // Test 3: Badge with custom colors
  console.log('Test 3: Badge with custom colors');
  const customColorBadge = await generateThreadRingBadge('Custom Color', 'custom-color', {
    backgroundColor: '#FF6B6B',
    textColor: '#FFFFFF'
  });
  console.log('Custom color badge:', {
    title: customColorBadge.title,
    backgroundColor: customColorBadge.backgroundColor,
    textColor: customColorBadge.textColor,
    templateId: customColorBadge.templateId,
    isGenerated: customColorBadge.isGenerated
  });
  console.log('---\n');

  // Test 4: Badge with subtitle
  console.log('Test 4: Badge with subtitle');
  const subtitleBadge = await generateThreadRingBadge('With Subtitle', 'with-subtitle', {
    subtitle: 'A test ring',
    templateId: 'neon_pink'
  });
  console.log('Subtitle badge:', {
    title: subtitleBadge.title,
    subtitle: subtitleBadge.subtitle,
    backgroundColor: subtitleBadge.backgroundColor,
    textColor: subtitleBadge.textColor,
    templateId: subtitleBadge.templateId,
    isGenerated: subtitleBadge.isGenerated
  });
  console.log('---\n');

  // Test 5: List all available templates
  console.log('Test 5: Available badge templates');
  console.log('Templates:', BADGE_TEMPLATES.map(t => ({
    id: t.id,
    name: t.name,
    backgroundColor: t.backgroundColor,
    textColor: t.textColor
  })));
  console.log('---\n');

  // Test 6: Get specific template
  console.log('Test 6: Get specific template (cyber_teal)');
  const template = getBadgeTemplate('cyber_teal');
  console.log('Cyber teal template:', template);
  console.log('---\n');

  // Test 7: Validate badge content
  console.log('Test 7: Badge content validation');
  const validation1 = validateBadgeContent('Valid Title', 'Valid Subtitle');
  console.log('Valid content:', validation1);
  
  const validation2 = validateBadgeContent('This is a very long title that should fail validation', 'This is also a very long subtitle that should fail');
  console.log('Invalid content:', validation2);
  console.log('---\n');

  console.log('✅ Badge generation tests complete!');
}

// Run the tests
testBadgeGeneration().catch(console.error);