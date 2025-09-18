const { PrismaClient } = require('@prisma/client');

async function checkDiscoveredSites() {
  const db = new PrismaClient();

  try {
    // Check total discovered sites
    const totalDiscovered = await db.discoveredSite.count();
    console.log(`📊 Total DiscoveredSite records: ${totalDiscovered}`);

    if (totalDiscovered === 0) {
      console.log('❌ No discovered sites found - the crawler may not have run yet or there\'s a table issue');
      return;
    }

    // Check by review status
    const statusCounts = await db.discoveredSite.groupBy({
      by: ['reviewStatus'],
      _count: true
    });
    console.log('\n📋 Review Status Breakdown:');
    statusCounts.forEach(status => {
      console.log(`   ${status.reviewStatus}: ${status._count} sites`);
    });

    // Check quality score distribution
    const highQualitySites = await db.discoveredSite.count({
      where: { qualityScore: { gte: 75 } }
    });
    console.log(`\n⭐ Sites with quality score >= 75: ${highQualitySites}`);

    // Check approved sites
    const approvedSites = await db.discoveredSite.count({
      where: { reviewStatus: 'approved' }
    });
    console.log(`✅ Approved sites: ${approvedSites}`);

    // Check promotion status
    const promotedSites = await db.discoveredSite.count({
      where: { promotedToIndex: true }
    });
    console.log(`🚀 Already promoted sites: ${promotedSites}`);

    // Show sites that SHOULD be promoted
    const shouldPromote = await db.discoveredSite.findMany({
      where: {
        OR: [
          { reviewStatus: 'approved' },
          { qualityScore: { gte: 75 } }
        ],
        promotedToIndex: false
      },
      select: {
        id: true,
        url: true,
        title: true,
        qualityScore: true,
        reviewStatus: true,
        promotedToIndex: true
      }
    });

    console.log(`\n🎯 Sites that should be promoted: ${shouldPromote.length}`);
    if (shouldPromote.length > 0) {
      console.log('\nDetails:');
      shouldPromote.slice(0, 5).forEach(site => {
        console.log(`   ${site.url} (Score: ${site.qualityScore}, Status: ${site.reviewStatus})`);
      });
      if (shouldPromote.length > 5) {
        console.log(`   ... and ${shouldPromote.length - 5} more`);
      }
    }

    // Check IndexedSite count for comparison
    const indexedCount = await db.indexedSite.count();
    console.log(`\n📈 Total IndexedSite records: ${indexedCount}`);

  } catch (error) {
    console.error('💥 Error checking discovered sites:', error);
  } finally {
    await db.$disconnect();
  }
}

checkDiscoveredSites();