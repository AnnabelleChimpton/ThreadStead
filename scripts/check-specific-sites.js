const { PrismaClient } = require('@prisma/client');

async function checkSpecificSites() {
  const db = new PrismaClient();

  try {
    const testUrls = [
      'https://rachsmith.com/',
      'https://tracydurnell.com/',
      'https://manuelmoreale.com/',
      'https://tomcritchlow.com/2018/02/23/small-b-blogging/',
      'https://maggieappleton.com/'
    ];

    console.log('🔍 Checking specific high-scoring sites from recent tests:\n');

    for (const url of testUrls) {
      const inIndexed = await db.indexedSite.findUnique({
        where: { url },
        select: { discoveryMethod: true, title: true, communityScore: true, discoveredAt: true }
      });

      const inDiscovered = await db.discoveredSite.findUnique({
        where: { url },
        select: { qualityScore: true, reviewStatus: true, promotedToIndex: true }
      });

      if (inIndexed) {
        console.log(`✅ ${url}`);
        console.log(`   IN IndexedSite: ${inIndexed.discoveryMethod} (score: ${inIndexed.communityScore}, discovered: ${inIndexed.discoveredAt})`);
      } else if (inDiscovered) {
        console.log(`📋 ${url}`);
        console.log(`   IN DiscoveredSite: score ${inDiscovered.qualityScore}, status ${inDiscovered.reviewStatus}`);
      } else {
        console.log(`❓ ${url}`);
        console.log(`   NOT FOUND in either table`);
      }
    }

    // Check total crawler promoted sites
    const totalCrawlerPromoted = await db.indexedSite.count({
      where: { discoveryMethod: 'crawler_auto_submit' }
    });

    console.log(`\n🤖 Total sites auto-promoted by crawler: ${totalCrawlerPromoted}`);

  } catch (error) {
    console.error('💥 Check failed:', error);
  } finally {
    await db.$disconnect();
  }
}

checkSpecificSites();