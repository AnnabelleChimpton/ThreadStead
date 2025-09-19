/**
 * Targeted cleanup for suspicious entries found in health check
 * Specifically handles YouTube videos and Twitter profiles with scores > 0
 * Run with: npx tsx scripts/cleanup-suspicious-entries.ts
 */

import { db } from '../lib/config/database/connection';
import { domainClassifier } from '../lib/community-index/seeding/domain-classifier';

interface SuspiciousEntry {
  id: string;
  url: string;
  title: string;
  communityScore: number;
  reason: string;
  action: 'mark_for_extraction' | 'reject' | 'keep';
}

class SuspiciousEntryCleanup {
  private dryRun: boolean;

  constructor(dryRun: boolean = true) {
    this.dryRun = dryRun;
  }

  async findAndCleanupSuspiciousEntries(): Promise<void> {
    console.log('🕵️ Suspicious Entry Cleanup Tool');
    console.log('=================================\n');
    console.log(`Mode: ${this.dryRun ? '🔍 DRY RUN' : '💾 LIVE CLEANUP'}\n`);

    // Find entries that match the suspicious patterns from health check
    const suspiciousEntries = await db.indexedSite.findMany({
      where: {
        OR: [
          // YouTube videos/channels with positive scores
          {
            AND: [
              { url: { contains: 'youtube.com' } },
              { communityScore: { gt: 0 } },
              { indexingPurpose: { not: 'link_extraction' } }
            ]
          },
          // Twitter profiles with positive scores
          {
            AND: [
              { url: { contains: 'twitter.com' } },
              { communityScore: { gt: 0 } },
              { indexingPurpose: { not: 'link_extraction' } }
            ]
          },
          // X.com profiles with positive scores
          {
            AND: [
              { url: { contains: 'x.com' } },
              { communityScore: { gt: 0 } },
              { indexingPurpose: { not: 'link_extraction' } }
            ]
          },
          // Instagram with positive scores
          {
            AND: [
              { url: { contains: 'instagram.com' } },
              { communityScore: { gt: 0 } },
              { indexingPurpose: { not: 'link_extraction' } }
            ]
          },
          // TikTok with positive scores
          {
            AND: [
              { url: { contains: 'tiktok.com' } },
              { communityScore: { gt: 0 } },
              { indexingPurpose: { not: 'link_extraction' } }
            ]
          },
          // Facebook with positive scores
          {
            AND: [
              { url: { contains: 'facebook.com' } },
              { communityScore: { gt: 0 } },
              { indexingPurpose: { not: 'link_extraction' } }
            ]
          },
          // LinkedIn with positive scores
          {
            AND: [
              { url: { contains: 'linkedin.com' } },
              { communityScore: { gt: 0 } },
              { indexingPurpose: { not: 'link_extraction' } }
            ]
          }
        ]
      },
      select: {
        id: true,
        url: true,
        title: true,
        communityScore: true,
        indexingPurpose: true,
        platformType: true,
        createdAt: true
      },
      orderBy: { communityScore: 'desc' }
    });

    console.log(`Found ${suspiciousEntries.length} suspicious entries to review:\n`);

    const toProcess: SuspiciousEntry[] = [];

    for (const entry of suspiciousEntries) {
      const classification = domainClassifier.classify(entry.url);
      let action: SuspiciousEntry['action'] = 'keep';
      let reason = '';

      if (classification.platformType === 'corporate_profile') {
        action = 'mark_for_extraction';
        reason = 'Corporate profile should be used for link extraction only';
      } else if (classification.platformType === 'corporate_generic') {
        action = 'reject';
        reason = 'Corporate non-profile content should be rejected';
      } else {
        action = 'keep';
        reason = 'Edge case - may be legitimate content';
      }

      toProcess.push({
        id: entry.id,
        url: entry.url,
        title: entry.title,
        communityScore: entry.communityScore || 0,
        reason,
        action
      });

      console.log(`🔍 ${entry.title}`);
      console.log(`   URL: ${entry.url}`);
      console.log(`   Score: ${entry.communityScore}`);
      console.log(`   Current Status: ${entry.indexingPurpose || 'full_index'}`);
      console.log(`   Recommended Action: ${action} - ${reason}`);
      console.log('');
    }

    // Summary
    const actionCounts = toProcess.reduce((acc, entry) => {
      acc[entry.action] = (acc[entry.action] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('📊 CLEANUP SUMMARY');
    console.log('==================');
    console.log(`Total entries to process: ${toProcess.length}`);
    console.log(`Mark for extraction: ${actionCounts.mark_for_extraction || 0}`);
    console.log(`Reject: ${actionCounts.reject || 0}`);
    console.log(`Keep (edge cases): ${actionCounts.keep || 0}`);

    if (this.dryRun) {
      console.log('\n🔄 To apply these changes, run:');
      console.log('npx tsx scripts/cleanup-suspicious-entries.ts --apply');
      return;
    }

    // Apply the changes
    console.log('\n💾 Applying cleanup changes...\n');

    let updatedCount = 0;

    for (const entry of toProcess) {
      try {
        if (entry.action === 'mark_for_extraction') {
          await db.indexedSite.update({
            where: { id: entry.id },
            data: {
              indexingPurpose: 'link_extraction',
              platformType: 'corporate_profile',
              communityScore: -999, // Hide from search
              crawlStatus: 'pending_extraction'
            }
          });
          console.log(`✅ Marked for extraction: ${entry.title}`);
          updatedCount++;

        } else if (entry.action === 'reject') {
          await db.indexedSite.update({
            where: { id: entry.id },
            data: {
              indexingPurpose: 'rejected',
              platformType: 'corporate_generic',
              communityScore: -999 // Hide from search
            }
          });
          console.log(`❌ Rejected: ${entry.title}`);
          updatedCount++;

        } else {
          console.log(`👀 Kept for review: ${entry.title}`);
        }

      } catch (error) {
        console.error(`💥 Failed to update ${entry.title}:`, error);
      }
    }

    console.log(`\n🎉 Cleanup complete! Updated ${updatedCount} entries.`);

    // Run health check again to see improvement
    console.log('\n🏥 Running post-cleanup health check...');
    await this.runQuickHealthCheck();
  }

  private async runQuickHealthCheck(): Promise<void> {
    const [
      corporateInSearch,
      corporateForExtraction,
      totalSearchable
    ] = await Promise.all([
      db.indexedSite.count({
        where: {
          platformType: 'corporate_profile',
          indexingPurpose: 'full_index'
        }
      }),
      db.indexedSite.count({
        where: {
          platformType: 'corporate_profile',
          indexingPurpose: 'link_extraction'
        }
      }),
      db.indexedSite.count({
        where: { indexingPurpose: 'full_index' }
      })
    ]);

    console.log('📊 POST-CLEANUP HEALTH:');
    console.log(`   Searchable sites: ${totalSearchable}`);
    console.log(`   Corporate in search: ${corporateInSearch} ${corporateInSearch === 0 ? '✅' : '❌'}`);
    console.log(`   Corporate for extraction: ${corporateForExtraction}`);

    if (corporateInSearch === 0) {
      console.log('\n🎯 Perfect! No corporate profiles in search results.');
    } else {
      console.log('\n⚠️  Still some corporate content in search - may need manual review.');
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  const applyChanges = args.includes('--apply');

  try {
    const cleanup = new SuspiciousEntryCleanup(!applyChanges);
    await cleanup.findAndCleanupSuspiciousEntries();

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