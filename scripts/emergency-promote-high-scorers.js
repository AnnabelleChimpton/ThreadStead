/**
 * Emergency migration for high-scoring sites that should have been auto-promoted
 * Run this after deploying the fixed crawler logic
 */

const { PrismaClient } = require('@prisma/client');

async function emergencyPromoteHighScorers() {
  const db = new PrismaClient();

  try {
    console.log('🚨 EMERGENCY PROMOTION FOR HIGH-SCORING SITES\n');

    // Find sites in DiscoveredSite that scored 70+ but weren't promoted
    const highScorers = await db.discoveredSite.findMany({
      where: {
        qualityScore: { gte: 70 },
        promotedToIndex: false
      },
      orderBy: { qualityScore: 'desc' },
      select: {
        id: true,
        url: true,
        title: true,
        description: true,
        qualityScore: true,
        qualityReasons: true,
        suggestedCategory: true,
        extractedKeywords: true,
        detectedLanguage: true,
        contentSample: true,
        lastCrawled: true,
        crawlStatus: true,
        sslEnabled: true,
        responseTimeMs: true,
        outboundLinks: true,
        discoveredAt: true
      }
    });

    console.log(`📊 Found ${highScorers.length} high-scoring sites to promote`);

    if (highScorers.length === 0) {
      console.log('✅ No high-scoring sites need promotion');
      return;
    }

    let promoted = 0;
    let errors = 0;

    for (const site of highScorers) {
      try {
        console.log(`\n🔄 Processing: ${site.url} (${site.qualityScore} points)`);

        // Check if URL already exists in IndexedSite
        const existing = await db.indexedSite.findUnique({
          where: { url: site.url }
        });

        if (existing) {
          console.log(`   ⏭️ Already in IndexedSite, marking as promoted`);

          // Just mark as promoted in DiscoveredSite
          await db.discoveredSite.update({
            where: { id: site.id },
            data: {
              promotedToIndex: true,
              promotedAt: new Date(),
              indexedSiteId: existing.id
            }
          });

          promoted++;
          continue;
        }

        // Determine auto-validation (same logic as fixed crawler)
        const shouldAutoValidate = site.qualityScore >= 70;
        const initialCommunityScore = shouldAutoValidate ? Math.floor(site.qualityScore / 10) : 0;

        // Create IndexedSite record (EXACT SAME AS FIXED CRAWLER)
        const indexedSite = await db.indexedSite.create({
          data: {
            url: site.url,
            title: site.title || 'Untitled',
            description: site.description || 'Auto-discovered during crawling',
            discoveryMethod: 'crawler_auto_submit',
            discoveryContext: 'Auto-discovered and validated by crawler',
            siteType: site.suggestedCategory || 'personal_blog',

            // Quality scoring fields (match fixed crawler)
            seedingScore: site.qualityScore,
            seedingReasons: site.qualityReasons || [],

            // Community validation
            communityValidated: shouldAutoValidate,
            communityScore: initialCommunityScore,
            validationVotes: shouldAutoValidate ? 1 : 0,

            // Content fields
            extractedKeywords: site.extractedKeywords || [],
            detectedLanguage: site.detectedLanguage || 'en',
            contentSample: site.contentSample,

            // Crawl status
            lastCrawled: site.lastCrawled || new Date(),
            crawlStatus: site.crawlStatus || 'success',
            sslEnabled: site.sslEnabled || site.url.startsWith('https://'),
            responseTimeMs: site.responseTimeMs || 0,
            outboundLinks: site.outboundLinks || [],

            // Discovery timestamp
            discoveredAt: site.discoveredAt || new Date(),
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

        console.log(`   ✅ PROMOTED to IndexedSite (score: ${initialCommunityScore}/10, auto-validated: ${shouldAutoValidate})`);
        promoted++;

      } catch (error) {
        console.error(`   ❌ Error promoting ${site.url}:`, error.message);
        errors++;
      }
    }

    console.log(`\n🎉 Emergency promotion complete!`);
    console.log(`📈 Promoted: ${promoted} sites`);
    console.log(`❌ Errors: ${errors} sites`);

    if (promoted > 0) {
      console.log(`\n💡 ${promoted} high-quality sites have been added to your search index!`);
      console.log(`   Check your analytics to see the updated counts.`);
      console.log(`\n🚀 Deploy the fixed crawler-worker.ts to prevent this from happening again.`);
    }

  } catch (error) {
    console.error('💥 Emergency promotion failed:', error);
  } finally {
    await db.$disconnect();
  }
}

console.log('🚨 Starting emergency promotion for high-scoring sites...');
emergencyPromoteHighScorers().catch(console.error);