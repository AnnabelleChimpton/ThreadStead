/**
 * Cleanup legacy corporate entries that have null platformType/indexingPurpose
 * These are entries from before the corporate filtering system was implemented
 * Run with: npx tsx scripts/cleanup-legacy-corporate-entries.ts
 */

import { db } from '../lib/config/database/connection';
import { domainClassifier } from '../lib/community-index/seeding/domain-classifier';

async function cleanupLegacyCorporateEntries() {
  console.log('🧹 Legacy Corporate Entry Cleanup');
  console.log('=================================\n');

  const dryRun = !process.argv.includes('--apply');
  console.log(`Mode: ${dryRun ? '🔍 DRY RUN' : '💾 LIVE CLEANUP'}\n`);

  // Find all entries that might be corporate but haven't been classified yet
  const legacyEntries = await db.indexedSite.findMany({
    where: {
      OR: [
        // Entries with null platformType (legacy)
        { platformType: null },
        // Entries with null indexingPurpose (legacy)
        { indexingPurpose: null },
        // Corporate domains that somehow have positive scores and aren't marked for extraction
        {
          AND: [
            {
              OR: [
                { url: { contains: 'youtube.com' } },
                { url: { contains: 'twitter.com' } },
                { url: { contains: 'x.com' } },
                { url: { contains: 'instagram.com' } },
                { url: { contains: 'facebook.com' } },
                { url: { contains: 'linkedin.com' } },
                { url: { contains: 'tiktok.com' } },
                { url: { contains: 'reddit.com' } }
              ]
            },
            { communityScore: { gt: 0 } },
            {
              OR: [
                { indexingPurpose: { not: 'link_extraction' } },
                { indexingPurpose: null }
              ]
            }
          ]
        }
      ]
    },
    select: {
      id: true,
      url: true,
      title: true,
      communityScore: true,
      platformType: true,
      indexingPurpose: true,
      crawlStatus: true,
      createdAt: true
    },
    orderBy: { communityScore: 'desc' }
  });

  console.log(`Found ${legacyEntries.length} legacy entries to process:\n`);

  let corporateCount = 0;
  let indieCount = 0;
  let unknownCount = 0;

  for (const entry of legacyEntries) {
    const classification = domainClassifier.classify(entry.url);

    console.log(`🔍 ${entry.title}`);
    console.log(`   URL: ${entry.url}`);
    console.log(`   Current Score: ${entry.communityScore}`);
    console.log(`   Current Platform: ${entry.platformType || 'null'}`);
    console.log(`   Current Purpose: ${entry.indexingPurpose || 'null'}`);
    console.log(`   Classification: ${classification.platformType} -> ${classification.indexingPurpose}`);

    if (!dryRun) {
      try {
        if (classification.platformType === 'corporate_profile') {
          // Mark for link extraction
          await db.indexedSite.update({
            where: { id: entry.id },
            data: {
              platformType: 'corporate_profile',
              indexingPurpose: 'link_extraction',
              communityScore: -999, // Hide from search
              crawlStatus: 'pending_extraction'
            }
          });
          console.log(`   ✅ Marked for link extraction`);
          corporateCount++;

        } else if (classification.platformType === 'corporate_generic') {
          // Reject corporate non-profile content
          await db.indexedSite.update({
            where: { id: entry.id },
            data: {
              platformType: 'corporate_generic',
              indexingPurpose: 'rejected',
              communityScore: -999 // Hide from search
            }
          });
          console.log(`   ❌ Rejected corporate content`);
          corporateCount++;

        } else if (classification.platformType === 'indie_platform') {
          // Update indie platform with proper classification and bonus
          const currentScore = entry.communityScore || 0;
          const bonusScore = Math.floor(currentScore * (classification.scoreModifier - 1.0));

          await db.indexedSite.update({
            where: { id: entry.id },
            data: {
              platformType: 'indie_platform',
              indexingPurpose: 'full_index',
              communityScore: currentScore + bonusScore
            }
          });
          console.log(`   🌟 Updated indie platform (+${bonusScore} bonus)`);
          indieCount++;

        } else if (classification.platformType === 'independent') {
          // Update independent site with bonus
          const currentScore = entry.communityScore || 0;
          const bonusScore = Math.floor(currentScore * (classification.scoreModifier - 1.0));

          await db.indexedSite.update({
            where: { id: entry.id },
            data: {
              platformType: 'independent',
              indexingPurpose: 'full_index',
              communityScore: currentScore + bonusScore
            }
          });
          console.log(`   🏠 Updated independent site (+${bonusScore} bonus)`);
          indieCount++;

        } else {
          // Unknown - mark for review
          await db.indexedSite.update({
            where: { id: entry.id },
            data: {
              platformType: 'unknown',
              indexingPurpose: 'pending_review'
            }
          });
          console.log(`   ❓ Marked for manual review`);
          unknownCount++;
        }

      } catch (error) {
        console.error(`   💥 Failed to update: ${error}`);
      }
    } else {
      // Dry run - just show what would happen
      if (classification.platformType === 'corporate_profile') {
        console.log(`   → Would mark for link extraction`);
        corporateCount++;
      } else if (classification.platformType === 'corporate_generic') {
        console.log(`   → Would reject corporate content`);
        corporateCount++;
      } else if (classification.platformType === 'indie_platform') {
        console.log(`   → Would update as indie platform`);
        indieCount++;
      } else if (classification.platformType === 'independent') {
        console.log(`   → Would update as independent site`);
        indieCount++;
      } else {
        console.log(`   → Would mark for review`);
        unknownCount++;
      }
    }

    console.log('');
  }

  // Summary
  console.log('📊 CLEANUP SUMMARY');
  console.log('==================');
  console.log(`Total processed: ${legacyEntries.length}`);
  console.log(`Corporate (extraction/reject): ${corporateCount}`);
  console.log(`Indie platforms/independent: ${indieCount}`);
  console.log(`Unknown (needs review): ${unknownCount}`);

  if (dryRun) {
    console.log('\n🔄 To apply these changes, run:');
    console.log('npx tsx scripts/cleanup-legacy-corporate-entries.ts --apply');
  } else {
    console.log('\n✅ Cleanup complete!');

    // Quick health check
    const corporateInSearch = await db.indexedSite.count({
      where: {
        OR: [
          {
            AND: [
              { url: { contains: 'youtube.com' } },
              { communityScore: { gt: 0 } },
              { indexingPurpose: { not: 'link_extraction' } }
            ]
          },
          {
            AND: [
              { url: { contains: 'twitter.com' } },
              { communityScore: { gt: 0 } },
              { indexingPurpose: { not: 'link_extraction' } }
            ]
          }
        ]
      }
    });

    console.log(`\n🎯 Remaining suspicious entries: ${corporateInSearch}`);
    if (corporateInSearch === 0) {
      console.log('🎉 Perfect! All corporate content cleaned up!');
    }
  }
}

cleanupLegacyCorporateEntries()
  .catch(console.error)
  .finally(() => db.$disconnect());