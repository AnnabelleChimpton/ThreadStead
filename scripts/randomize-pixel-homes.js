/**
 * Script to randomize pixel home templates and themes for all users
 * Run this before production release to give users interesting starting homes
 *
 * Usage:
 * node scripts/randomize-pixel-homes.js [options]
 *
 * Options:
 * --dry-run    Show what would be updated without making changes
 * --batch-size Number of users to process at once (default: 50)
 * --users      Comma-separated list of specific user IDs to update
 */

const { db: prisma } = require('../lib/config/database/connection');

// Available templates and palettes
const HOUSE_TEMPLATES = ['cottage_v1', 'townhouse_v1', 'loft_v1', 'cabin_v1'];
const COLOR_PALETTES = ['thread_sage', 'charcoal_nights', 'pixel_petals', 'crt_glow', 'classic_linen'];
const WINDOW_STYLES = ['default', 'round', 'arched', 'bay'];
const DOOR_STYLES = ['default', 'arched', 'double', 'cottage'];
const ROOF_TRIMS = ['default', 'ornate', 'scalloped', 'gabled'];

// Atmospheric variations
const SKY_OPTIONS = ['sunny', 'cloudy', 'sunset', 'night'];
const WEATHER_OPTIONS = ['clear', 'light_rain', 'light_snow'];
const TIME_OPTIONS = ['morning', 'midday', 'evening', 'night'];

// Inspirational house titles for variety
const HOUSE_TITLES = [
  'Cozy Corner', 'Pixel Paradise', 'Digital Den', 'Byte Bungalow', 'Code Cabin',
  'Thread Haven', 'Sage Sanctuary', 'Charcoal Cottage', 'Glow Grove', 'Linen Lodge',
  'Peaceful Place', 'Quiet Quarters', 'Happy Home', 'Sweet Spot', 'Comfort Castle',
  'Zen Zone', 'Calm Corner', 'Bright Bungalow', 'Warm Welcome', 'Safe Space',
  'Creative Corner', 'Inspiration Inn', 'Dream Dwelling', 'Wonder Works', 'Magic Manor',
  'Pixel Portal', 'Digital Doorway', 'Virtual Villa', 'Cyber Sanctuary', 'Tech Temple'
];

/**
 * Generate random home configuration
 */
function generateRandomHomeConfig() {
  const template = HOUSE_TEMPLATES[Math.floor(Math.random() * HOUSE_TEMPLATES.length)];
  const palette = COLOR_PALETTES[Math.floor(Math.random() * COLOR_PALETTES.length)];

  // 70% chance of customizations for variety
  const hasCustomizations = Math.random() < 0.7;

  let customizations = {};
  if (hasCustomizations) {
    // 50% chance of each customization type
    if (Math.random() < 0.5) {
      customizations.windowStyle = WINDOW_STYLES[Math.floor(Math.random() * WINDOW_STYLES.length)];
    }
    if (Math.random() < 0.5) {
      customizations.doorStyle = DOOR_STYLES[Math.floor(Math.random() * DOOR_STYLES.length)];
    }
    if (Math.random() < 0.5) {
      customizations.roofTrim = ROOF_TRIMS[Math.floor(Math.random() * ROOF_TRIMS.length)];
    }

    // 30% chance of a house title
    if (Math.random() < 0.3) {
      customizations.houseTitle = HOUSE_TITLES[Math.floor(Math.random() * HOUSE_TITLES.length)];
    }
  }

  // Random atmosphere (80% chance of non-default)
  const hasAtmosphere = Math.random() < 0.8;
  let atmosphere = {
    sky: 'sunny',
    weather: 'clear',
    timeOfDay: 'midday'
  };

  if (hasAtmosphere) {
    atmosphere.sky = SKY_OPTIONS[Math.floor(Math.random() * SKY_OPTIONS.length)];
    atmosphere.weather = WEATHER_OPTIONS[Math.floor(Math.random() * WEATHER_OPTIONS.length)];
    atmosphere.timeOfDay = TIME_OPTIONS[Math.floor(Math.random() * TIME_OPTIONS.length)];
  }

  return {
    houseTemplate: template,
    palette: palette,
    ...customizations,
    atmosphereSky: atmosphere.sky,
    atmosphereWeather: atmosphere.weather,
    atmosphereTimeOfDay: atmosphere.timeOfDay,
    seasonalOptIn: Math.random() < 0.6, // 60% opt into seasonal changes
  };
}

/**
 * Update a single user's home config
 */
async function updateUserHome(userId, config, dryRun = false) {
  if (dryRun) {
    console.log(`[DRY RUN] Would update user ${userId} with:`, {
      template: config.houseTemplate,
      palette: config.palette,
      windowStyle: config.windowStyle || 'default',
      doorStyle: config.doorStyle || 'default',
      roofTrim: config.roofTrim || 'default',
      atmosphere: `${config.atmosphereSky}/${config.atmosphereWeather}/${config.atmosphereTimeOfDay}`,
      title: config.houseTitle || 'none'
    });
    return;
  }

  await prisma.userHomeConfig.upsert({
    where: { userId },
    create: {
      userId,
      ...config
    },
    update: config
  });
}

/**
 * Main execution function
 */
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const batchSize = parseInt(args.find(arg => arg.startsWith('--batch-size='))?.split('=')[1]) || 50;
  const specificUsers = args.find(arg => arg.startsWith('--users='))?.split('=')[1]?.split(',');

  console.log('🏠 Pixel Home Randomization Script');
  console.log('=====================================');
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE UPDATE'}`);
  console.log(`Batch size: ${batchSize}`);

  try {
    let users;
    if (specificUsers) {
      console.log(`Targeting specific users: ${specificUsers.join(', ')}`);
      users = await prisma.user.findMany({
        where: { id: { in: specificUsers } },
        select: { id: true, primaryHandle: true }
      });
    } else {
      console.log('Finding all users...');
      users = await prisma.user.findMany({
        select: { id: true, primaryHandle: true }
      });
    }

    console.log(`Found ${users.length} users to process`);

    if (users.length === 0) {
      console.log('No users found. Exiting.');
      return;
    }

    // Process in batches
    let processed = 0;
    let updated = 0;

    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);
      console.log(`\nProcessing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(users.length / batchSize)} (${batch.length} users)...`);

      const promises = batch.map(async (user) => {
        try {
          const config = generateRandomHomeConfig();
          await updateUserHome(user.id, config, dryRun);

          console.log(`✅ ${user.primaryHandle || user.id}: ${config.houseTemplate}/${config.palette}${config.houseTitle ? ` - "${config.houseTitle}"` : ''}`);
          return true;
        } catch (error) {
          console.error(`❌ Error updating user ${user.primaryHandle || user.id}:`, error.message);
          return false;
        }
      });

      const results = await Promise.all(promises);
      const batchUpdated = results.filter(Boolean).length;

      processed += batch.length;
      updated += batchUpdated;

      console.log(`Batch complete: ${batchUpdated}/${batch.length} successful`);

      // Small delay between batches to be nice to the database
      if (i + batchSize < users.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log('\n🎉 Randomization Complete!');
    console.log('============================');
    console.log(`Total users processed: ${processed}`);
    console.log(`Successfully updated: ${updated}`);
    console.log(`Failed: ${processed - updated}`);

    if (dryRun) {
      console.log('\n💡 This was a dry run. Add --live to actually update the database.');
      console.log('Example: node scripts/randomize-pixel-homes.js');
    }

  } catch (error) {
    console.error('💥 Script failed:', error);
    process.exit(1);
  } finally {
    // Note: We don't disconnect the singleton prisma instance
  }
}

// Export the randomization function for use in other scripts
module.exports = { generateRandomHomeConfig, updateUserHome };

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}