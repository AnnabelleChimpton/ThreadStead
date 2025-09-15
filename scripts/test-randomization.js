/**
 * Test script to verify the randomization function works correctly
 * Run this to see sample outputs before running the full migration
 */

const { generateRandomHomeConfig } = require('./randomize-pixel-homes.js');

console.log('🏠 Pixel Home Randomization Test');
console.log('=================================');
console.log('Generating 10 sample configurations...\n');

for (let i = 1; i <= 10; i++) {
  const config = generateRandomHomeConfig();

  console.log(`Sample ${i}:`);
  console.log(`  Template: ${config.houseTemplate}`);
  console.log(`  Palette: ${config.palette}`);
  console.log(`  Window: ${config.windowStyle || 'default'}`);
  console.log(`  Door: ${config.doorStyle || 'default'}`);
  console.log(`  Roof: ${config.roofTrim || 'default'}`);
  console.log(`  Atmosphere: ${config.atmosphereSky}/${config.atmosphereWeather}/${config.atmosphereTimeOfDay}`);
  console.log(`  Title: ${config.houseTitle || 'none'}`);
  console.log(`  Seasonal: ${config.seasonalOptIn ? 'yes' : 'no'}`);
  console.log('');
}

console.log('✅ Test complete! Configurations look good.');
console.log('💡 Ready to run: node scripts/randomize-pixel-homes.js --dry-run');