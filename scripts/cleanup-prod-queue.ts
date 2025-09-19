/**
 * Production cleanup script - safe to run without dev server
 * Migrates crawler spam to Phase 2 and removes obvious junk
 */

import { db } from '@/lib/config/database/connection';

async function cleanupProdQueue() {
  console.log('🧹 PRODUCTION QUEUE CLEANUP');
  console.log('===========================\n');

  try {
    // 1. Check current state
    console.log('1️⃣ Current validation queue state...');

    const [crawlerSpam, humanSubmissions, totalUnvalidated] = await Promise.all([
      db.indexedSite.count({
        where: {
          discoveryMethod: 'crawler_auto_submit',
          communityValidated: false
        }
      }),
      db.indexedSite.count({
        where: {
          discoveryMethod: { in: ['user_bookmark', 'manual_submit'] },
          communityValidated: false
        }
      }),
      db.indexedSite.count({
        where: { communityValidated: false }
      })
    ]);

    console.log(`   🤖 Crawler spam in human queue: ${crawlerSpam}`);
    console.log(`   👥 Legitimate human submissions: ${humanSubmissions}`);
    console.log(`   📊 Total unvalidated: ${totalUnvalidated}`);

    // 2. Migrate crawler submissions to Phase 2
    if (crawlerSpam > 0) {
      console.log(`\n2️⃣ Migrating ${crawlerSpam} crawler submissions to Phase 2...`);

      const migrated = await db.indexedSite.updateMany({
        where: {
          discoveryMethod: 'crawler_auto_submit',
          communityValidated: false
        },
        data: {
          discoveryMethod: 'api_seeding' // Phase 2 auto-validation will handle these
        }
      });

      console.log(`   ✅ Migrated ${migrated.count} sites to api_seeding`);
    }

    // 3. Auto-approve obvious high quality sites (manual Phase 2 logic)
    console.log('\n3️⃣ Auto-approving obvious high quality sites...');

    const autoApproved = await db.indexedSite.updateMany({
      where: {
        discoveryMethod: 'api_seeding',
        communityValidated: false,
        seedingScore: { gte: 75 }
      },
      data: {
        communityValidated: true,
        autoValidated: true,
        autoValidatedAt: new Date(),
        communityScore: 10
      }
    });

    console.log(`   ✅ Auto-approved ${autoApproved.count} high quality sites`);

    // 4. Auto-reject obvious low quality/spam sites
    console.log('\n4️⃣ Removing obvious spam and low quality sites...');

    const spamRemoved = await db.indexedSite.deleteMany({
      where: {
        discoveryMethod: 'api_seeding',
        communityValidated: false,
        OR: [
          // Very low quality scores
          { seedingScore: { lte: 30 } },
          // Obvious spam patterns
          { title: { contains: 'casino', mode: 'insensitive' } },
          { title: { contains: 'gambling', mode: 'insensitive' } },
          { title: { contains: 'porn', mode: 'insensitive' } },
          { title: { contains: 'xxx', mode: 'insensitive' } },
          { title: { contains: 'viagra', mode: 'insensitive' } },
          { title: { contains: 'loan', mode: 'insensitive' } },
          { title: { contains: 'pharmacy', mode: 'insensitive' } },
          { url: { contains: 'casino', mode: 'insensitive' } },
          { url: { contains: 'gambling', mode: 'insensitive' } },
          { url: { contains: 'porn', mode: 'insensitive' } }
        ]
      }
    });

    console.log(`   🗑️ Removed ${spamRemoved.count} spam/low quality sites`);

    // 5. Final state check
    console.log('\n5️⃣ Final queue state...');

    const [finalHuman, finalAuto, autoApprovedTotal] = await Promise.all([
      db.indexedSite.count({
        where: {
          discoveryMethod: { in: ['user_bookmark', 'manual_submit'] },
          communityValidated: false
        }
      }),
      db.indexedSite.count({
        where: {
          discoveryMethod: 'api_seeding',
          communityValidated: false
        }
      }),
      db.indexedSite.count({
        where: {
          discoveryMethod: 'api_seeding',
          autoValidated: true
        }
      })
    ]);

    console.log(`   👥 Human validation queue: ${finalHuman} sites`);
    console.log(`   🤖 Auto-validation pending: ${finalAuto} sites`);
    console.log(`   ✅ Auto-approved total: ${autoApprovedTotal} sites`);

    console.log('\n🎯 CLEANUP COMPLETE!');
    console.log('====================');
    console.log(`✅ Migrated ${crawlerSpam} crawler submissions to Phase 2`);
    console.log(`✅ Auto-approved ${autoApproved.count} high quality sites`);
    console.log(`✅ Removed ${spamRemoved.count} spam/low quality sites`);
    console.log(`✅ Human validation queue cleaned: ${finalHuman} legitimate submissions remain`);

    console.log('\n📋 Production is now clean:');
    console.log('• Human submissions go to community validation');
    console.log('• Crawler submissions go to auto-validation');
    console.log('• No more crawler spam clogging human queue!');

    return {
      crawlerMigrated: crawlerSpam,
      autoApproved: autoApproved.count,
      spamRemoved: spamRemoved.count,
      humanQueueSize: finalHuman
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
  cleanupProdQueue()
    .then(() => {
      console.log('\n🚀 Production cleanup successful!');
      process.exit(0);
    })
    .catch(error => {
      console.error('Cleanup error:', error);
      process.exit(1);
    });
}

export default cleanupProdQueue;