#!/usr/bin/env tsx
/**
 * Cleanup script to re-evaluate existing indexed sites with new quality standards
 *
 * This script applies the updated quality filter (50-point threshold, multi-indicator requirement)
 * to existing sites in the database and marks low-quality ones as rejected.
 *
 * Usage:
 *   npx tsx scripts/cleanup-low-quality-sites.ts              # Dry run (preview only)
 *   npx tsx scripts/cleanup-low-quality-sites.ts --execute    # Actually perform cleanup
 *   npx tsx scripts/cleanup-low-quality-sites.ts --execute --batch=100  # Process in batches
 */

import { db } from '@/lib/config/database/connection';
import { SeedingFilter } from '@/lib/community-index/seeding/quality-filter';

interface CleanupReport {
  totalScanned: number;
  passedQuality: number;
  failedQuality: number;
  alreadyRejected: number;
  sitesMarkedForRemoval: Array<{
    id: string;
    url: string;
    title: string;
    currentScore: number;
    newScore: number;
    reasons: string[];
  }>;
  breakdown: {
    [reason: string]: number;
  };
}

async function evaluateExistingSites(
  execute: boolean = false,
  batchSize: number = 50
): Promise<CleanupReport> {
  console.log('🔍 Re-evaluating indexed sites with new quality standards...\n');

  const filter = new SeedingFilter();

  const report: CleanupReport = {
    totalScanned: 0,
    passedQuality: 0,
    failedQuality: 0,
    alreadyRejected: 0,
    sitesMarkedForRemoval: [],
    breakdown: {}
  };

  // Get all indexed sites that aren't already rejected
  const allSites = await db.indexedSite.findMany({
    where: {
      OR: [
        { indexingPurpose: 'full_index' },
        { indexingPurpose: 'pending_review' },
        { indexingPurpose: null }
      ]
    },
    select: {
      id: true,
      url: true,
      title: true,
      description: true,
      seedingScore: true,
      seedingReasons: true,
      communityScore: true,
      indexingPurpose: true,
      platformType: true,
      sslEnabled: true
    },
    orderBy: {
      discoveredAt: 'desc'
    }
  });

  console.log(`📊 Found ${allSites.length} sites to evaluate\n`);

  // Process in batches to avoid memory issues
  for (let i = 0; i < allSites.length; i += batchSize) {
    const batch = allSites.slice(i, i + batchSize);

    console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(allSites.length / batchSize)}...`);

    for (const site of batch) {
      report.totalScanned++;

      try {
        // Re-evaluate with new quality filter
        const evaluation = await filter.evaluateSite({
          url: site.url,
          title: site.title,
          snippet: site.description || '',
          engine: 'searxng', // Using searxng as placeholder for manual re-evaluation
          position: 0
        });

        // Check if site passes new quality standards
        if (evaluation.shouldSeed && evaluation.score >= 50) {
          report.passedQuality++;
          console.log(`  ✅ ${site.title} (score: ${evaluation.score})`);
        } else {
          report.failedQuality++;

          // Track reasons for failure
          const mainReason = evaluation.shouldSeed
            ? 'low_score'
            : evaluation.reasons.includes('spam_indicators')
              ? 'spam'
              : evaluation.reasons.includes('commercial')
                ? 'commercial'
                : 'quality_threshold';

          report.breakdown[mainReason] = (report.breakdown[mainReason] || 0) + 1;

          report.sitesMarkedForRemoval.push({
            id: site.id,
            url: site.url,
            title: site.title,
            currentScore: site.seedingScore || site.communityScore || 0,
            newScore: evaluation.score,
            reasons: evaluation.reasons
          });

          console.log(`  ❌ ${site.title} (score: ${evaluation.score}, reason: ${mainReason})`);
        }
      } catch (error) {
        console.error(`  ⚠️  Error evaluating ${site.url}:`, error);
      }
    }

    // Small delay between batches to avoid overwhelming the system
    if (i + batchSize < allSites.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  // Execute cleanup if requested
  if (execute && report.sitesMarkedForRemoval.length > 0) {
    console.log('\n🧹 Executing cleanup...');

    const siteIds = report.sitesMarkedForRemoval.map(s => s.id);

    // Mark sites as rejected
    await db.indexedSite.updateMany({
      where: {
        id: { in: siteIds }
      },
      data: {
        indexingPurpose: 'rejected',
        communityScore: -999,
        communityValidated: false,
        crawlStatus: 'rejected'
      }
    });

    console.log(`✅ Marked ${siteIds.length} sites as rejected`);
  }

  return report;
}

function printReport(report: CleanupReport, execute: boolean) {
  console.log('\n' + '='.repeat(60));
  console.log('📋 CLEANUP REPORT');
  console.log('='.repeat(60));
  console.log(`\nTotal sites scanned: ${report.totalScanned}`);
  console.log(`✅ Passed quality check: ${report.passedQuality} (${Math.round(report.passedQuality / report.totalScanned * 100)}%)`);
  console.log(`❌ Failed quality check: ${report.failedQuality} (${Math.round(report.failedQuality / report.totalScanned * 100)}%)`);

  if (Object.keys(report.breakdown).length > 0) {
    console.log('\n📊 Failure breakdown:');
    for (const [reason, count] of Object.entries(report.breakdown)) {
      console.log(`   ${reason}: ${count} sites`);
    }
  }

  if (report.sitesMarkedForRemoval.length > 0) {
    console.log(`\n🗑️  Sites marked for removal: ${report.sitesMarkedForRemoval.length}`);

    console.log('\nSample of removed sites (first 10):');
    for (const site of report.sitesMarkedForRemoval.slice(0, 10)) {
      console.log(`\n   ${site.title}`);
      console.log(`   URL: ${site.url}`);
      console.log(`   Score: ${site.currentScore} → ${site.newScore}`);
      console.log(`   Reasons: ${site.reasons.slice(0, 3).join(', ')}`);
    }

    if (report.sitesMarkedForRemoval.length > 10) {
      console.log(`\n   ... and ${report.sitesMarkedForRemoval.length - 10} more sites`);
    }
  }

  console.log('\n' + '='.repeat(60));

  if (!execute) {
    console.log('\n⚠️  DRY RUN MODE - No changes were made');
    console.log('   Run with --execute flag to perform actual cleanup');
    console.log('   Example: npx tsx scripts/cleanup-low-quality-sites.ts --execute');
  } else {
    console.log('\n✨ Cleanup completed successfully!');
    console.log(`   ${report.failedQuality} sites have been marked as rejected`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const execute = args.includes('--execute');
  const batchArg = args.find(arg => arg.startsWith('--batch='));
  const batchSize = batchArg ? parseInt(batchArg.split('=')[1]) : 50;

  try {
    console.log('🧹 Low-Quality Sites Cleanup Script');
    console.log('====================================\n');

    if (execute) {
      console.log('⚠️  EXECUTE MODE - Changes will be made to the database');
      console.log('   Sites failing quality check will be marked as rejected\n');
    } else {
      console.log('🔍 DRY RUN MODE - No changes will be made');
      console.log('   This will show you what would be cleaned up\n');
    }

    console.log(`Quality Standards:`);
    console.log(`  • Minimum score: 50 points (raised from 20)`);
    console.log(`  • Requires 2+ different indicator types`);
    console.log(`  • Enhanced spam/junk detection\n`);

    const report = await evaluateExistingSites(execute, batchSize);
    printReport(report, execute);

    if (!execute && report.failedQuality > 0) {
      console.log('\n💡 Next Steps:');
      console.log('   1. Review the sites marked for removal above');
      console.log('   2. If satisfied, run with --execute to perform cleanup');
      console.log('   3. Monitor your index quality after cleanup');
    }

  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

if (require.main === module) {
  main();
}

export { evaluateExistingSites };
