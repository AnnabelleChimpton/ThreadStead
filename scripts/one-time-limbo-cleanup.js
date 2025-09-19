/**
 * One-time cleanup script for existing limbo sites
 * Auto-approves all current limbo sites before switching to binary system
 */

const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function oneTimeLimboCleanup() {
  try {
    console.log('🧹 ONE-TIME LIMBO CLEANUP');
    console.log('==========================\n');

    // Find all existing limbo sites
    const limboSites = await db.indexedSite.findMany({
      where: {
        discoveryMethod: 'api_seeding',
        communityValidated: false,
        seedingScore: {
          gt: 30  // Everything above auto-reject threshold
        }
      },
      select: {
        id: true,
        title: true,
        url: true,
        seedingScore: true,
        discoveredAt: true,
        siteType: true
      },
      orderBy: {
        seedingScore: 'desc'
      }
    });

    console.log(`Found ${limboSites.length} limbo sites to clean up`);

    if (limboSites.length === 0) {
      console.log('✅ No limbo sites found! System is already clean.');
      return;
    }

    // Show what we're about to approve
    console.log('\n📋 Sites to be auto-approved:');
    console.log('================================');
    limboSites.forEach((site, i) => {
      const age = Math.floor((Date.now() - new Date(site.discoveredAt).getTime()) / (1000 * 60 * 60 * 24));
      console.log(`${i+1}. [Score: ${site.seedingScore}] ${site.title}`);
      console.log(`   Type: ${site.siteType}`);
      console.log(`   Age: ${age} days`);
      console.log(`   URL: ${site.url}\n`);
    });

    // Confirm before proceeding
    console.log('🚀 Auto-approving all limbo sites...\n');

    // Auto-approve all limbo sites using the same logic as auto-validation
    const result = await db.indexedSite.updateMany({
      where: {
        discoveryMethod: 'api_seeding',
        communityValidated: false,
        seedingScore: {
          gt: 30
        }
      },
      data: {
        communityValidated: true,
        communityScore: 40, // Give them a reasonable community score
        validationVotes: 0,
        autoValidated: true,
        autoValidatedAt: new Date(),
        autoValidationScore: 40
      }
    });

    console.log(`✅ Successfully auto-approved ${result.count} limbo sites`);
    console.log('🎉 Limbo cleanup complete! System now ready for binary validation.');

    // Verify cleanup
    const remainingLimbo = await db.indexedSite.count({
      where: {
        discoveryMethod: 'api_seeding',
        communityValidated: false
      }
    });

    console.log(`\n📊 Final status: ${remainingLimbo} unvalidated sites remaining`);

    if (remainingLimbo > 0) {
      console.log('ℹ️ Remaining sites should only be score ≤30 (will be auto-rejected on next crawler run)');
    }

  } catch (error) {
    console.error('❌ Cleanup error:', error);
  } finally {
    await db.$disconnect();
  }
}

console.log('⚠️  This script will auto-approve ALL existing limbo sites (score > 30)');
console.log('   This is a one-time cleanup before switching to binary validation.');
console.log('   Press Ctrl+C to cancel, or wait 3 seconds to proceed...\n');

// Give user 3 seconds to cancel
setTimeout(() => {
  oneTimeLimboCleanup();
}, 3000);