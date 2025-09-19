/**
 * Verification script to check the health of corporate profile cleanup
 * Run with: npx tsx scripts/verify-corporate-cleanup.ts
 */

import { db } from '../lib/config/database/connection';
import { corporatePlatforms } from '../lib/community-index/seeding/corporate-platforms';

interface HealthCheck {
  totalIndexedSites: number;
  searchableSites: number;
  corporateProfilesInSearch: number;
  corporateProfilesForExtraction: number;
  indiePlatforms: number;
  independentSites: number;
  pendingReview: number;
  topIndiePlatforms: Array<{ platform: string; count: number; avgScore: number }>;
  suspiciousEntries: Array<{ id: string; url: string; title: string; reason: string }>;
  health: 'excellent' | 'good' | 'needs_attention' | 'critical';
}

async function runHealthCheck(): Promise<HealthCheck> {
  console.log('🏥 Corporate Filtering Health Check');
  console.log('===================================\n');

  const healthCheck: HealthCheck = {
    totalIndexedSites: 0,
    searchableSites: 0,
    corporateProfilesInSearch: 0,
    corporateProfilesForExtraction: 0,
    indiePlatforms: 0,
    independentSites: 0,
    pendingReview: 0,
    topIndiePlatforms: [],
    suspiciousEntries: [],
    health: 'excellent'
  };

  // Get overall stats
  const [
    totalSites,
    searchableSites,
    corporateInSearch,
    corporateForExtraction,
    indiePlatforms,
    independentSites,
    pendingReview
  ] = await Promise.all([
    db.indexedSite.count(),
    db.indexedSite.count({ where: { indexingPurpose: 'full_index' } }),
    db.indexedSite.count({
      where: {
        platformType: 'corporate_profile',
        indexingPurpose: 'full_index' // These shouldn't exist!
      }
    }),
    db.indexedSite.count({
      where: {
        platformType: 'corporate_profile',
        indexingPurpose: 'link_extraction'
      }
    }),
    db.indexedSite.count({ where: { platformType: 'indie_platform' } }),
    db.indexedSite.count({ where: { platformType: 'independent' } }),
    db.indexedSite.count({ where: { indexingPurpose: 'pending_review' } })
  ]);

  healthCheck.totalIndexedSites = totalSites;
  healthCheck.searchableSites = searchableSites;
  healthCheck.corporateProfilesInSearch = corporateInSearch;
  healthCheck.corporateProfilesForExtraction = corporateForExtraction;
  healthCheck.indiePlatforms = indiePlatforms;
  healthCheck.independentSites = independentSites;
  healthCheck.pendingReview = pendingReview;

  // Get top indie platforms
  const platformStats = await db.indexedSite.groupBy({
    by: ['url'],
    where: { platformType: 'indie_platform', indexingPurpose: 'full_index' },
    _count: { url: true },
    _avg: { seedingScore: true }
  });

  // Extract platform names and aggregate
  const platformCounts = new Map<string, { count: number; totalScore: number; avgScore: number }>();

  for (const stat of platformStats) {
    const domain = extractPlatform(stat.url);
    if (domain) {
      const existing = platformCounts.get(domain) || { count: 0, totalScore: 0, avgScore: 0 };
      existing.count += stat._count.url;
      existing.totalScore += (stat._avg.seedingScore || 0) * stat._count.url;
      existing.avgScore = existing.totalScore / existing.count;
      platformCounts.set(domain, existing);
    }
  }

  healthCheck.topIndiePlatforms = Array.from(platformCounts.entries())
    .map(([platform, stats]) => ({
      platform,
      count: stats.count,
      avgScore: Math.round(stats.avgScore)
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Look for suspicious entries - ONLY things that shouldn't be searchable
  const suspiciousEntries = await db.indexedSite.findMany({
    where: {
      OR: [
        // Corporate profiles that are still searchable (BAD!)
        {
          platformType: 'corporate_profile',
          indexingPurpose: 'full_index'
        },
        // Corporate content with positive scores that's still searchable (BAD!)
        {
          AND: [
            { communityScore: { gt: 0 } },
            { indexingPurpose: 'full_index' }, // Only flag if it's actually searchable
            {
              OR: [
                { url: { contains: 'youtube.com' } },
                { url: { contains: 'twitter.com' } },
                { url: { contains: 'instagram.com' } },
                { url: { contains: 'facebook.com' } },
                { url: { contains: 'linkedin.com' } },
                { url: { contains: 'tiktok.com' } }
              ]
            }
          ]
        },
        // Entries that should have been classified but weren't
        {
          AND: [
            { platformType: null },
            { communityScore: { gt: 0 } },
            {
              OR: [
                { url: { contains: 'youtube.com' } },
                { url: { contains: 'twitter.com' } },
                { url: { contains: 'instagram.com' } }
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
      indexingPurpose: true
    },
    take: 20
  });

  healthCheck.suspiciousEntries = suspiciousEntries.map(entry => ({
    id: entry.id,
    url: entry.url,
    title: entry.title,
    reason: entry.platformType === 'corporate_profile' && entry.indexingPurpose === 'full_index'
      ? 'Corporate profile in search index'
      : `High score (${entry.communityScore}) on corporate domain`
  }));

  // Determine overall health
  if (healthCheck.corporateProfilesInSearch > 0) {
    healthCheck.health = 'critical';
  } else if (healthCheck.suspiciousEntries.length > 5) {
    healthCheck.health = 'needs_attention';
  } else if (healthCheck.corporateProfilesForExtraction > 0 && healthCheck.indiePlatforms > 0) {
    healthCheck.health = 'good';
  } else {
    healthCheck.health = 'excellent';
  }

  return healthCheck;
}

function extractPlatform(url: string): string | null {
  try {
    const domain = new URL(url).hostname.toLowerCase();

    // Extract the main platform name
    if (domain.includes('neocities.org')) return 'neocities.org';
    if (domain.includes('github.io')) return 'github.io';
    if (domain.includes('netlify.app')) return 'netlify.app';
    if (domain.includes('vercel.app')) return 'vercel.app';
    if (domain.includes('bearblog.dev')) return 'bearblog.dev';
    if (domain.includes('omg.lol')) return 'omg.lol';
    if (domain.includes('tilde.')) return 'tilde.*';
    if (domain.includes('micro.blog')) return 'micro.blog';

    return null;
  } catch {
    return null;
  }
}

function printHealthReport(healthCheck: HealthCheck): void {
  console.log('📊 OVERALL STATISTICS');
  console.log('-' .repeat(50));
  console.log(`Total indexed sites: ${healthCheck.totalIndexedSites.toLocaleString()}`);
  console.log(`Searchable sites: ${healthCheck.searchableSites.toLocaleString()}`);
  console.log(`Indie platforms: ${healthCheck.indiePlatforms.toLocaleString()}`);
  console.log(`Independent sites: ${healthCheck.independentSites.toLocaleString()}`);
  console.log(`Corporate (for extraction): ${healthCheck.corporateProfilesForExtraction.toLocaleString()}`);
  console.log(`Pending review: ${healthCheck.pendingReview.toLocaleString()}`);

  console.log('\n🎯 HEALTH STATUS');
  console.log('-' .repeat(50));

  const healthEmoji = {
    excellent: '🟢',
    good: '🟡',
    needs_attention: '🟠',
    critical: '🔴'
  }[healthCheck.health];

  console.log(`Overall health: ${healthEmoji} ${healthCheck.health.toUpperCase()}`);

  if (healthCheck.corporateProfilesInSearch > 0) {
    console.log(`🚨 CRITICAL: ${healthCheck.corporateProfilesInSearch} corporate profiles found in search index!`);
  } else {
    console.log('✅ No corporate profiles in search index');
  }

  console.log('\n🌟 TOP INDIE PLATFORMS');
  console.log('-' .repeat(50));
  healthCheck.topIndiePlatforms.forEach((platform, i) => {
    console.log(`${i + 1}. ${platform.platform}: ${platform.count} sites (avg score: ${platform.avgScore})`);
  });

  if (healthCheck.suspiciousEntries.length > 0) {
    console.log('\n⚠️  SUSPICIOUS ENTRIES');
    console.log('-' .repeat(50));
    healthCheck.suspiciousEntries.slice(0, 5).forEach(entry => {
      console.log(`❗ ${entry.title}`);
      console.log(`   URL: ${entry.url}`);
      console.log(`   Reason: ${entry.reason}`);
      console.log('');
    });

    if (healthCheck.suspiciousEntries.length > 5) {
      console.log(`... and ${healthCheck.suspiciousEntries.length - 5} more suspicious entries`);
    }
  } else {
    console.log('\n✅ No suspicious entries found');
  }

  console.log('\n🎉 RECOMMENDATIONS');
  console.log('-' .repeat(50));

  if (healthCheck.health === 'critical') {
    console.log('🚨 Run cleanup script immediately:');
    console.log('   npx tsx scripts/audit-and-cleanup-corporate-profiles.ts --apply');
  } else if (healthCheck.health === 'needs_attention') {
    console.log('⚠️  Review suspicious entries and consider running cleanup');
  } else if (healthCheck.health === 'good') {
    console.log('👍 System is working well, minor cleanup may be beneficial');
  } else {
    console.log('🎯 System is healthy! Corporate filtering is working perfectly.');
  }
}

async function main() {
  try {
    const healthCheck = await runHealthCheck();
    printHealthReport(healthCheck);
  } catch (error) {
    console.error('❌ Health check failed:', error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

if (require.main === module) {
  main();
}