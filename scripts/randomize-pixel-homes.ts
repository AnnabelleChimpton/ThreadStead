/**
 * Script to randomize pixel home templates and themes for all users (TypeScript)
 * Run before production release to give users interesting starting homes.
 *
 * Usage:
 *   ts-node scripts/randomize-pixel-homes.ts [options]
 *   # or:  node --loader ts-node/esm scripts/randomize-pixel-homes.ts [options]
 *
 * Options:
 *   --dry-run         Show what would be updated without making changes
 *   --batch-size=NUM  Number of users to process at once (default: 50)
 *   --users=id1,id2   Comma-separated list of specific user IDs to update
 */

import type { PrismaClient, User } from '@prisma/client';
// If you have a shared Prisma instance, keep using it:
import { db as prisma } from '../lib/config/database/connection';

type DB = PrismaClient;

type AtmosphereSky = 'sunny' | 'cloudy' | 'sunset' | 'night';
type AtmosphereWeather = 'clear' | 'light_rain' | 'light_snow';
type AtmosphereTime = 'morning' | 'midday' | 'evening' | 'night';

type WindowStyle = 'default' | 'round' | 'arched' | 'bay';
type DoorStyle = 'default' | 'arched' | 'double' | 'cottage';
type RoofTrim = 'default' | 'ornate' | 'scalloped' | 'gabled';

type HouseTemplate = 'cottage_v1' | 'townhouse_v1' | 'loft_v1' | 'cabin_v1';
type ColorPalette = 'thread_sage' | 'charcoal_nights' | 'pixel_petals' | 'crt_glow' | 'classic_linen';

interface RandomHomeConfig {
  houseTemplate: HouseTemplate;
  palette: ColorPalette;
  // Optional customizations
  windowStyle?: WindowStyle;
  doorStyle?: DoorStyle;
  roofTrim?: RoofTrim;
  houseTitle?: string;
  // Atmosphere
  atmosphereSky: AtmosphereSky;
  atmosphereWeather: AtmosphereWeather;
  atmosphereTimeOfDay: AtmosphereTime;
  // Flags
  seasonalOptIn: boolean;
}

const HOUSE_TEMPLATES = ['cottage_v1', 'townhouse_v1', 'loft_v1', 'cabin_v1'] as const;
const COLOR_PALETTES = ['thread_sage', 'charcoal_nights', 'pixel_petals', 'crt_glow', 'classic_linen'] as const;
const WINDOW_STYLES = ['default', 'round', 'arched', 'bay'] as const;
const DOOR_STYLES = ['default', 'arched', 'double', 'cottage'] as const;
const ROOF_TRIMS = ['default', 'ornate', 'scalloped', 'gabled'] as const;

const SKY_OPTIONS = ['sunny', 'cloudy', 'sunset', 'night'] as const;
const WEATHER_OPTIONS = ['clear', 'light_rain', 'light_snow'] as const;
const TIME_OPTIONS = ['morning', 'midday', 'evening', 'night'] as const;

const HOUSE_TITLES: readonly string[] = [
  'Cozy Corner', 'Pixel Paradise', 'Digital Den', 'Byte Bungalow', 'Code Cabin',
  'Thread Haven', 'Sage Sanctuary', 'Charcoal Cottage', 'Glow Grove', 'Linen Lodge',
  'Peaceful Place', 'Quiet Quarters', 'Happy Home', 'Sweet Spot', 'Comfort Castle',
  'Zen Zone', 'Calm Corner', 'Bright Bungalow', 'Warm Welcome', 'Safe Space',
  'Creative Corner', 'Inspiration Inn', 'Dream Dwelling', 'Wonder Works', 'Magic Manor',
  'Pixel Portal', 'Digital Doorway', 'Virtual Villa', 'Cyber Sanctuary', 'Tech Temple'
] as const;

function pick<T extends readonly any[]>(arr: T): T[number] {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateRandomHomeConfig(): RandomHomeConfig {
  const template = pick(HOUSE_TEMPLATES);
  const palette = pick(COLOR_PALETTES);

  const hasCustomizations = Math.random() < 0.7;
  const customizations: Partial<RandomHomeConfig> = {};

  if (hasCustomizations) {
    if (Math.random() < 0.5) customizations.windowStyle = pick(WINDOW_STYLES);
    if (Math.random() < 0.5) customizations.doorStyle = pick(DOOR_STYLES);
    if (Math.random() < 0.5) customizations.roofTrim = pick(ROOF_TRIMS);
    if (Math.random() < 0.3)  customizations.houseTitle = pick(HOUSE_TITLES);
  }

  const hasAtmosphere = Math.random() < 0.8;

  const atmosphere = {
    sky: hasAtmosphere ? pick(SKY_OPTIONS) : 'sunny',
    weather: hasAtmosphere ? pick(WEATHER_OPTIONS) : 'clear',
    timeOfDay: hasAtmosphere ? pick(TIME_OPTIONS) : 'midday'
  } as const;

  return {
    houseTemplate: template,
    palette,
    ...customizations,
    atmosphereSky: atmosphere.sky,
    atmosphereWeather: atmosphere.weather,
    atmosphereTimeOfDay: atmosphere.timeOfDay,
    seasonalOptIn: Math.random() < 0.6
  };
}

export async function updateUserHome(db: DB, userId: string, config: RandomHomeConfig, dryRun = false): Promise<void> {
  if (dryRun) {
    console.log(`[DRY RUN] Would update user ${userId} with:`, {
      template: config.houseTemplate,
      palette: config.palette,
      windowStyle: config.windowStyle ?? 'default',
      doorStyle: config.doorStyle ?? 'default',
      roofTrim: config.roofTrim ?? 'default',
      atmosphere: `${config.atmosphereSky}/${config.atmosphereWeather}/${config.atmosphereTimeOfDay}`,
      title: config.houseTitle ?? 'none'
    });
    return;
  }

  await db.userHomeConfig.upsert({
    where: { userId },
    create: {
      userId,
      ...config
    },
    update: config
  });
}

interface CLIOptions {
  dryRun: boolean;
  batchSize: number;
  specificUsers?: string[];
}

function parseArgs(argv: string[]): CLIOptions {
  const dryRun = argv.includes('--dry-run');
  const batchSize = parseInt(argv.find(a => a.startsWith('--batch-size='))?.split('=')[1] ?? '', 10) || 50;
  const usersArg = argv.find(a => a.startsWith('--users='))?.split('=')[1];
  const specificUsers = usersArg ? usersArg.split(',').map(s => s.trim()).filter(Boolean) : undefined;
  return { dryRun, batchSize, specificUsers };
}

export async function main() {
  const args = parseArgs(process.argv.slice(2));
  console.log('🏠 Pixel Home Randomization Script (TS)');
  console.log('=====================================');
  console.log(`Mode: ${args.dryRun ? 'DRY RUN' : 'LIVE UPDATE'}`);
  console.log(`Batch size: ${args.batchSize}`);

  try {
    let users: Pick<User, 'id' | 'primaryHandle'>[] = [];

    if (args.specificUsers?.length) {
      console.log(`Targeting specific users: ${args.specificUsers.join(', ')}`);
      users = await (prisma as DB).user.findMany({
        where: { id: { in: args.specificUsers } },
        select: { id: true, primaryHandle: true }
      });
    } else {
      console.log('Finding all users...');
      users = await (prisma as DB).user.findMany({
        select: { id: true, primaryHandle: true }
      });
    }

    console.log(`Found ${users.length} users to process`);
    if (users.length === 0) {
      console.log('No users found. Exiting.');
      return;
    }

    let processed = 0;
    let updated = 0;

    for (let i = 0; i < users.length; i += args.batchSize) {
      const batch = users.slice(i, i + args.batchSize);
      console.log(`\nProcessing batch ${Math.floor(i / args.batchSize) + 1}/${Math.ceil(users.length / args.batchSize)} (${batch.length} users)...`);

      const results = await Promise.all(batch.map(async (user) => {
        try {
          const config = generateRandomHomeConfig();
          await updateUserHome(prisma as DB, user.id, config, args.dryRun);
          console.log(`✅ ${user.primaryHandle ?? user.id}: ${config.houseTemplate}/${config.palette}${config.houseTitle ? ` - "${config.houseTitle}"` : ''}`);
          return true;
        } catch (err: any) {
          console.error(`❌ Error updating user ${user.primaryHandle ?? user.id}:`, err?.message ?? err);
          return false;
        }
      }));

      const batchUpdated = results.filter(Boolean).length;
      processed += batch.length;
      updated += batchUpdated;
      console.log(`Batch complete: ${batchUpdated}/${batch.length} successful`);

      if (i + args.batchSize < users.length) {
        await new Promise(res => setTimeout(res, 100));
      }
    }

    console.log('\n🎉 Randomization Complete!');
    console.log('============================');
    console.log(`Total users processed: ${processed}`);
    console.log(`Successfully updated: ${updated}`);
    console.log(`Failed: ${processed - updated}`);

    if (args.dryRun) {
      console.log('\n💡 This was a dry run. Remove --dry-run to actually update the database.');
      console.log('Example: ts-node scripts/randomize-pixel-homes.ts');
    }
  } catch (error) {
    console.error('💥 Script failed:', error);
    process.exit(1);
  } finally {
    // If using a shared/singleton Prisma instance, do not disconnect here
    // await (prisma as DB).$disconnect();
  }
}

// Run if called directly (CommonJS execution)
if (typeof require !== 'undefined' && require.main === module) {
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  main().catch(console.error);
}
