#!/usr/bin/env tsx
/**
 * Seed script to populate BlockedSite table with initial data
 *
 * This script migrates the hardcoded blocked sites lists from quality-filter.ts
 * and cleanup-corporate-exclusions.ts into the database.
 *
 * Usage:
 *   npx tsx scripts/seed-blocked-sites.ts
 *   npx tsx scripts/seed-blocked-sites.ts --force  # Overwrite existing entries
 */

import { db } from '@/lib/config/database/connection';
import { DEFAULT_BLOCKED_SITES, type BlockedSiteData } from '@/lib/indie-index/blocklist';


// The list lives in lib/indie-index/blocklist.ts (the Indie Index uses it
// as a baseline even when this table is empty).
const BLOCKED_SITES: BlockedSiteData[] = DEFAULT_BLOCKED_SITES;

async function seedBlockedSites(force: boolean = false): Promise<void> {
  console.log('🌱 Seeding BlockedSite table...\n');

  let created = 0;
  let skipped = 0;
  let updated = 0;

  for (const site of BLOCKED_SITES) {
    try {
      const existing = await db.blockedSite.findUnique({
        where: { domain: site.domain }
      });

      if (existing && !force) {
        console.log(`⏭️  Skipping ${site.domain} (already exists)`);
        skipped++;
        continue;
      }

      if (existing && force) {
        await db.blockedSite.update({
          where: { domain: site.domain },
          data: {
            category: site.category,
            reason: site.reason
          }
        });
        console.log(`✏️  Updated ${site.domain} (${site.category})`);
        updated++;
      } else {
        await db.blockedSite.create({
          data: {
            domain: site.domain,
            category: site.category,
            reason: site.reason
          }
        });
        console.log(`✅ Created ${site.domain} (${site.category})`);
        created++;
      }
    } catch (error) {
      console.error(`❌ Error processing ${site.domain}:`, error);
    }
  }

  console.log('\n📊 Summary:');
  console.log(`  Created: ${created}`);
  console.log(`  Updated: ${updated}`);
  console.log(`  Skipped: ${skipped}`);
  console.log(`  Total: ${BLOCKED_SITES.length}`);
}

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes('--force');

  try {
    console.log('🧹 BlockedSite Table Seeding Script');
    console.log('=====================================\n');

    if (force) {
      console.log('⚠️  FORCE MODE - Existing entries will be updated');
    } else {
      console.log('📝 Normal mode - Existing entries will be skipped');
      console.log('   Use --force to update existing entries\n');
    }

    await seedBlockedSites(force);

    console.log('\n✨ Seeding complete!');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

if (require.main === module) {
  main();
}

export { seedBlockedSites, BLOCKED_SITES };
