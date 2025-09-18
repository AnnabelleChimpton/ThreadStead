const { PrismaClient } = require('@prisma/client');

async function checkAutoPromotion() {
  const db = new PrismaClient();

  try {
    console.log('🔍 CHECKING AUTO-PROMOTION RESULTS\n');

    // Check for sites in IndexedSite with crawler_auto_submit method
    const crawlerPromoted = await db.indexedSite.findMany({
      where: { discoveryMethod: 'crawler_auto_submit' },
      orderBy: { discoveredAt: 'desc' },
      select: {
        url: true,
        title: true,
        communityScore: true,
        discoveredAt: true,
        discoveryMethod: true
      }
    });

    console.log(`🤖 Sites auto-promoted by crawler: ${crawlerPromoted.length}`);
    if (crawlerPromoted.length > 0) {
      crawlerPromoted.forEach(site => {
        console.log(`   ✅ ${site.url} - ${site.title} (score: ${site.communityScore}, promoted: ${site.discoveredAt})`);
      });
    }

    // Check recent DiscoveredSite entries
    const recentDiscovered = await db.discoveredSite.findMany({
      orderBy: { discoveredAt: 'desc' },
      take: 10,
      select: {
        url: true,
        title: true,
        qualityScore: true,
        reviewStatus: true,
        discoveredAt: true,
        promotedToIndex: true
      }
    });

    console.log(`\n🆕 Recent DiscoveredSite entries: ${recentDiscovered.length}`);
    recentDiscovered.forEach(site => {
      const promoted = site.promotedToIndex ? '✅ PROMOTED' : '⏳ PENDING';
      console.log(`   ${promoted} ${site.url} (score: ${site.qualityScore}, status: ${site.reviewStatus})`);
    });

    // Check specifically for high-scoring sites that should have been auto-promoted
    const highScorers = await db.discoveredSite.findMany({
      where: {
        qualityScore: { gte: 75 },
        promotedToIndex: false
      },
      select: {
        url: true,
        title: true,
        qualityScore: true,
        reviewStatus: true,
        discoveredAt: true
      }
    });

    console.log(`\n⚠️ High-scoring sites (≥75) NOT auto-promoted: ${highScorers.length}`);
    if (highScorers.length > 0) {
      console.log('These should have been auto-promoted to IndexedSite:');
      highScorers.forEach(site => {
        console.log(`   ❌ ${site.url} (score: ${site.qualityScore}) - ${site.title}`);
      });
    }

    // Check for the specific high-scoring sites from our test
    const testSites = [
      'https://bytecellar.com/',
      'https://thejaymo.net/',
      'https://blakewatson.com/'
    ];

    console.log(`\n🧪 Checking test sites status:`);
    for (const url of testSites) {
      const inIndexed = await db.indexedSite.findUnique({
        where: { url },
        select: { discoveryMethod: true, title: true, discoveredAt: true }
      });

      const inDiscovered = await db.discoveredSite.findUnique({
        where: { url },
        select: { qualityScore: true, reviewStatus: true, promotedToIndex: true }
      });

      if (inIndexed) {
        console.log(`   ✅ ${url}: IN IndexedSite (method: ${inIndexed.discoveryMethod})`);
      } else if (inDiscovered) {
        console.log(`   🆕 ${url}: IN DiscoveredSite (score: ${inDiscovered.qualityScore}, promoted: ${inDiscovered.promotedToIndex})`);
      } else {
        console.log(`   ❓ ${url}: NOT FOUND in either table`);
      }
    }

  } catch (error) {
    console.error('💥 Check failed:', error);
  } finally {
    await db.$disconnect();
  }
}

checkAutoPromotion();