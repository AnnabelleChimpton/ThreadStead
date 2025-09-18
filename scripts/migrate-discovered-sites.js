/**
 * One-time migration script to promote high-quality DiscoveredSites to IndexedSite
 * This fixes sites that were auto-approved but never promoted due to the bug
 */

const { PrismaClient } = require('@prisma/client');

async function migrateDiscoveredSites() {
  const db = new PrismaClient();

  try {
    console.log('🔍 Finding high-quality discovered sites to promote...');

    // Find all discovered sites that should have been auto-validated
    const highQualitySites = await db.discoveredSite.findMany({
      where: {
        OR: [
          { reviewStatus: 'approved' }, // Sites that were marked approved
          { qualityScore: { gte: 75 } }  // Sites with high quality scores
        ],
        promotedToIndex: false // Not already promoted
      },
      orderBy: { qualityScore: 'desc' }
    });

    console.log(`📊 Found ${highQualitySites.length} sites to promote`);

    if (highQualitySites.length === 0) {
      console.log('✅ No sites need promotion - all caught up!');
      return;
    }

    let promoted = 0;
    let skipped = 0;
    let errors = 0;

    for (const site of highQualitySites) {
      try {
        // Check if URL already exists in IndexedSite
        const existing = await db.indexedSite.findUnique({
          where: { url: site.url }
        });

        if (existing) {
          console.log(`⏭️  Skipping ${site.url} - already in main index`);

          // Mark as promoted in DiscoveredSite
          await db.discoveredSite.update({
            where: { id: site.id },
            data: {
              promotedToIndex: true,
              promotedAt: new Date(),
              indexedSiteId: existing.id
            }
          });

          skipped++;
          continue;
        }

        // Promote to IndexedSite
        const indexedSite = await db.indexedSite.create({
          data: {
            url: site.url,
            title: site.title,
            description: site.description || 'Auto-discovered during crawling',
            discoveryMethod: site.discoveryMethod,
            discoveryContext: site.discoveryContext || 'Migrated from discovered sites',
            siteType: site.suggestedCategory,
            communityValidated: true, // Auto-validated based on quality score
            communityScore: Math.floor(site.qualityScore / 10), // Convert 0-100 to 0-10 scale
            validationVotes: 1, // Initial vote from crawler validation
            extractedKeywords: site.extractedKeywords || [],
            detectedLanguage: site.detectedLanguage,
            contentSample: site.contentSample,
            lastCrawled: site.lastCrawled || new Date(),
            crawlStatus: site.crawlStatus || 'success',
            sslEnabled: site.sslEnabled || site.url.startsWith('https://'),
            responseTimeMs: site.responseTimeMs || 0,
            outboundLinks: site.outboundLinks || [],
            discoveredAt: site.discoveredAt,
          }
        });

        // Mark as promoted in DiscoveredSite
        await db.discoveredSite.update({
          where: { id: site.id },
          data: {
            promotedToIndex: true,
            promotedAt: new Date(),
            indexedSiteId: indexedSite.id
          }
        });

        console.log(`✅ Promoted: ${site.title} (${site.url}) [Score: ${site.qualityScore}]`);
        promoted++;

      } catch (error) {
        console.error(`❌ Error promoting ${site.url}:`, error.message);
        errors++;
      }
    }

    console.log(`\n🎉 Migration complete!`);
    console.log(`📈 Promoted: ${promoted} sites`);
    console.log(`⏭️  Skipped: ${skipped} sites (already existed)`);
    console.log(`❌ Errors: ${errors} sites`);

    if (promoted > 0) {
      console.log(`\n💡 Your analytics should now show ${promoted} additional sites!`);
      console.log(`   Check your /community-index/analytics page to see the updated counts.`);
    }

  } catch (error) {
    console.error('💥 Migration failed:', error);
  } finally {
    await db.$disconnect();
  }
}

// Run the migration
console.log('🚀 Starting discovered sites migration...');
migrateDiscoveredSites().catch(console.error);