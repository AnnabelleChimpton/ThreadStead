/**
 * Production cleanup script for validation queue
 * Removes crawler spam and reorganizes for Phase 2 architecture
 */

import { db } from '@/lib/config/database/connection';

async function cleanupValidationQueue() {
  console.log('🧹 CLEANING UP VALIDATION QUEUE');
  console.log('================================\n');

  const startTime = Date.now();

  try {
    // 1. Analyze current queue state
    console.log('1️⃣ Analyzing current queue state...');

    const queueStats = await db.indexedSite.groupBy({
      by: ['discoveryMethod'],
      where: {
        communityValidated: false
      },
      _count: {
        discoveryMethod: true
      }
    });

    console.log('   Current validation queue by discovery method:');
    queueStats.forEach(stat => {
      console.log(`      ${stat.discoveryMethod}: ${stat._count.discoveryMethod} sites`);
    });

    // 2. Count crawler submissions that need cleanup
    const crawlerSubmissions = await db.indexedSite.count({
      where: {
        discoveryMethod: 'crawler_auto_submit',
        communityValidated: false
      }
    });

    console.log(`\n   🤖 Found ${crawlerSubmissions} crawler submissions in human validation queue`);

    // 3. Migrate crawler submissions to Phase 2 auto-validation
    if (crawlerSubmissions > 0) {
      console.log('\n2️⃣ Migrating crawler submissions to Phase 2...');

      // Update discovery method to api_seeding for Phase 2 processing
      const migrated = await db.indexedSite.updateMany({
        where: {
          discoveryMethod: 'crawler_auto_submit',
          communityValidated: false
        },
        data: {
          discoveryMethod: 'api_seeding'
        }
      });

      console.log(`   ✅ Migrated ${migrated.count} crawler submissions to Phase 2 (api_seeding)`);
    }

    // 4. Run auto-validation on migrated sites
    console.log('\n3️⃣ Running auto-validation on migrated sites...');

    try {
      const response = await fetch('http://localhost:3000/api/community-index/auto-validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ force: false }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`   📊 Auto-validation results:`);
        console.log(`      Approved: ${result.results.approved}`);
        console.log(`      Rejected: ${result.results.rejected}`);
        console.log(`      Skipped: ${result.results.skipped}`);
      } else {
        console.log(`   ❌ Auto-validation API failed: ${response.status}`);
        console.log('   Note: Run this manually later when dev server is running');
      }
    } catch (error) {
      console.log(`   ❌ Auto-validation request failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.log('   Note: Run auto-validation manually later when dev server is running');
    }

    // 5. Remove obvious spam/low quality sites
    console.log('\n4️⃣ Removing obvious spam and low quality sites...');

    // Remove sites with obviously spammy patterns
    const spamPatterns = [
      '%casino%',
      '%gambling%',
      '%porn%',
      '%xxx%',
      '%bitcoin%',
      '%crypto%',
      '%loan%',
      '%pharmacy%',
      '%viagra%',
      '%pills%'
    ];

    let totalSpamRemoved = 0;
    for (const pattern of spamPatterns) {
      const spamRemoved = await db.indexedSite.deleteMany({
        where: {
          OR: [
            { title: { contains: pattern.replace(/%/g, ''), mode: 'insensitive' } },
            { description: { contains: pattern.replace(/%/g, ''), mode: 'insensitive' } },
            { url: { contains: pattern.replace(/%/g, ''), mode: 'insensitive' } }
          ],
          discoveryMethod: 'api_seeding', // Only clean up crawler submissions
          communityValidated: false
        }
      });
      totalSpamRemoved += spamRemoved.count;
    }

    if (totalSpamRemoved > 0) {
      console.log(`   🗑️ Removed ${totalSpamRemoved} obvious spam sites`);
    } else {
      console.log(`   ✅ No obvious spam found`);
    }

    // 6. Remove very low quality sites (quality score < 20)
    const lowQualityRemoved = await db.indexedSite.deleteMany({
      where: {
        discoveryMethod: 'api_seeding',
        communityValidated: false,
        seedingScore: { lt: 20 }
      }
    });

    if (lowQualityRemoved.count > 0) {
      console.log(`   🗑️ Removed ${lowQualityRemoved.count} very low quality sites (score < 20)`);
    }

    // 7. Final queue analysis
    console.log('\n5️⃣ Final queue analysis...');

    const finalStats = await Promise.all([
      db.indexedSite.count({
        where: {
          discoveryMethod: { in: ['user_bookmark', 'manual_submit'] },
          communityValidated: false
        }
      }),
      db.indexedSite.count({
        where: {
          discoveryMethod: 'api_seeding',
          communityValidated: false,
          OR: [
            { autoValidated: null },
            { autoValidated: false }
          ]
        }
      }),
      db.indexedSite.count({
        where: {
          discoveryMethod: 'api_seeding',
          autoValidated: true
        }
      })
    ]);

    console.log(`   👥 Human validation queue: ${finalStats[0]} sites`);
    console.log(`   🤖 Pending auto-validation: ${finalStats[1]} sites`);
    console.log(`   ✅ Auto-approved sites: ${finalStats[2]} sites`);

    // 8. Summary and recommendations
    console.log('\n🎯 CLEANUP SUMMARY');
    console.log('==================');
    console.log(`   Duration: ${Date.now() - startTime}ms`);
    console.log(`   Crawler submissions migrated: ${crawlerSubmissions}`);
    console.log(`   Spam sites removed: ${totalSpamRemoved}`);
    console.log(`   Low quality sites removed: ${lowQualityRemoved.count}`);
    console.log(`   Human validation queue size: ${finalStats[0]}`);

    console.log('\n📋 Next Steps:');
    if (finalStats[1] > 0) {
      console.log(`   • Run auto-validation when dev server is available to process ${finalStats[1]} pending sites`);
    }
    if (finalStats[0] > 50) {
      console.log(`   • Consider manual review of human validation queue (${finalStats[0]} sites)`);
    }
    console.log('   • Monitor auto-validation results and adjust thresholds if needed');
    console.log('   • Phase 2 architecture is now active - crawler spam should not return');

    return {
      crawlerMigrated: crawlerSubmissions,
      spamRemoved: totalSpamRemoved,
      lowQualityRemoved: lowQualityRemoved.count,
      humanQueue: finalStats[0],
      autoValidationPending: finalStats[1]
    };

  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    throw error;
  } finally {
    await db.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  cleanupValidationQueue()
    .then(results => {
      console.log(`\nCleanup completed successfully!`);
      process.exit(0);
    })
    .catch(error => {
      console.error('Cleanup error:', error);
      process.exit(1);
    });
}

export default cleanupValidationQueue;