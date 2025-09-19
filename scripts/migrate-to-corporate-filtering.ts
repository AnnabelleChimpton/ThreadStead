/**
 * Migration script to safely apply corporate filtering schema and logic
 * Run with: npx tsx scripts/migrate-to-corporate-filtering.ts
 */

import { db } from '../lib/config/database/connection';

interface MigrationStats {
  totalProcessed: number;
  corporateProfilesFound: number;
  indieUpgrades: number;
  independentSites: number;
  errors: string[];
}

class CorporateFilteringMigration {
  private dryRun: boolean;

  constructor(dryRun: boolean = true) {
    this.dryRun = dryRun;
  }

  async runMigration(): Promise<MigrationStats> {
    console.log('🚀 Corporate Filtering Migration');
    console.log('================================\n');
    console.log(`Mode: ${this.dryRun ? '🔍 DRY RUN' : '💾 LIVE MIGRATION'}\n`);

    const stats: MigrationStats = {
      totalProcessed: 0,
      corporateProfilesFound: 0,
      indieUpgrades: 0,
      independentSites: 0,
      errors: []
    };

    try {
      // Step 1: Check if new columns exist
      await this.checkSchemaReady();

      // Step 2: Get sites that need classification
      const sitesToClassify = await this.getSitesNeedingClassification();
      stats.totalProcessed = sitesToClassify.length;

      console.log(`📊 Found ${sitesToClassify.length} sites to process\n`);

      // Step 3: Apply classifications in batches
      await this.processInBatches(sitesToClassify, stats);

      // Step 4: Summary
      this.printMigrationSummary(stats);

      return stats;

    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  }

  private async checkSchemaReady(): Promise<void> {
    console.log('🔍 Checking database schema...');

    try {
      // Try to query the new columns
      await db.indexedSite.findFirst({
        select: {
          indexingPurpose: true,
          platformType: true,
          extractedLinks: true,
          extractionCompleted: true,
          parentProfileUrl: true
        }
      });

      console.log('✅ Schema ready - new columns detected\n');
    } catch (error) {
      console.error('❌ Schema not ready. Please run the migration first:');
      console.error('npx prisma migrate deploy');
      throw new Error('Database schema not ready');
    }
  }

  private async getSitesNeedingClassification() {
    return await db.indexedSite.findMany({
      where: {
        OR: [
          { indexingPurpose: null },
          { platformType: null },
          { indexingPurpose: 'full_index', platformType: 'unknown' }
        ]
      },
      select: {
        id: true,
        url: true,
        title: true,
        communityScore: true,
        seedingScore: true,
        discoveryMethod: true
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  private async processInBatches(sites: any[], stats: MigrationStats): Promise<void> {
    const BATCH_SIZE = 50;
    const { domainClassifier } = await import('../lib/community-index/seeding/domain-classifier');

    for (let i = 0; i < sites.length; i += BATCH_SIZE) {
      const batch = sites.slice(i, i + BATCH_SIZE);
      console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(sites.length / BATCH_SIZE)}...`);

      for (const site of batch) {
        try {
          const classification = domainClassifier.classify(site.url);
          await this.applySiteClassification(site, classification, stats);
        } catch (error) {
          stats.errors.push(`Failed to process ${site.url}: ${error}`);
          console.error(`❌ Error processing ${site.title}: ${error}`);
        }
      }

      // Small delay between batches to avoid overwhelming the database
      if (i + BATCH_SIZE < sites.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  }

  private async applySiteClassification(site: any, classification: any, stats: MigrationStats): Promise<void> {
    const updates: any = {
      platformType: classification.platformType,
      indexingPurpose: classification.indexingPurpose
    };

    // Handle different platform types
    switch (classification.platformType) {
      case 'corporate_profile':
        updates.communityScore = -999; // Hide from search
        updates.crawlStatus = 'pending_extraction';
        stats.corporateProfilesFound++;
        console.log(`🔗 Corporate profile: ${site.title}`);
        break;

      case 'indie_platform':
        // Apply score bonus for indie platforms
        if (site.seedingScore && classification.scoreModifier > 1.0) {
          const bonus = Math.floor(site.seedingScore * (classification.scoreModifier - 1.0));
          updates.seedingScore = site.seedingScore + bonus;
          console.log(`🌟 Indie platform: ${site.title} (+${bonus} bonus)`);
        } else {
          console.log(`🌟 Indie platform: ${site.title}`);
        }
        stats.indieUpgrades++;
        break;

      case 'independent':
        // Apply bonus for independent sites
        if (site.seedingScore && classification.scoreModifier > 1.0) {
          const bonus = Math.floor(site.seedingScore * (classification.scoreModifier - 1.0));
          updates.seedingScore = site.seedingScore + bonus;
          console.log(`🏠 Independent site: ${site.title} (+${bonus} bonus)`);
        } else {
          console.log(`🏠 Independent site: ${site.title}`);
        }
        stats.independentSites++;
        break;

      case 'corporate_generic':
        updates.indexingPurpose = 'rejected';
        console.log(`❌ Corporate generic: ${site.title}`);
        break;

      default:
        updates.indexingPurpose = 'pending_review';
        console.log(`❓ Unknown: ${site.title}`);
    }

    // Apply the updates (if not dry run)
    if (!this.dryRun) {
      await db.indexedSite.update({
        where: { id: site.id },
        data: updates
      });
    }
  }

  private printMigrationSummary(stats: MigrationStats): void {
    console.log('\n📊 MIGRATION SUMMARY');
    console.log('=' .repeat(50));
    console.log(`Total sites processed: ${stats.totalProcessed}`);
    console.log(`Corporate profiles found: ${stats.corporateProfilesFound}`);
    console.log(`Indie platforms upgraded: ${stats.indieUpgrades}`);
    console.log(`Independent sites: ${stats.independentSites}`);
    console.log(`Errors: ${stats.errors.length}`);

    if (stats.errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      stats.errors.slice(0, 5).forEach(error => console.log(`  - ${error}`));
      if (stats.errors.length > 5) {
        console.log(`  ... and ${stats.errors.length - 5} more`);
      }
    }

    if (this.dryRun) {
      console.log('\n🔄 To apply these changes, run:');
      console.log('npx tsx scripts/migrate-to-corporate-filtering.ts --apply');
    } else {
      console.log('\n✅ Migration complete!');
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  const applyChanges = args.includes('--apply');

  console.log('🔧 Database Migration for Corporate Filtering\n');

  if (!applyChanges) {
    console.log('⚠️  Running in DRY RUN mode');
    console.log('   Add --apply flag to make actual changes\n');
  }

  try {
    const migration = new CorporateFilteringMigration(!applyChanges);
    await migration.runMigration();

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

if (require.main === module) {
  main();
}