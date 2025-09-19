#!/usr/bin/env tsx
/**
 * Database Cleanup Script for Corporate/Non-Indie Domain Exclusions
 *
 * This script identifies and removes Wikipedia, Google, major news media,
 * and other corporate sites that don't align with the indieweb philosophy.
 *
 * Usage:
 *   # Dry run (see what would be changed)
 *   npx tsx scripts/cleanup-corporate-exclusions.ts
 *
 *   # Actually perform the cleanup
 *   npx tsx scripts/cleanup-corporate-exclusions.ts --execute
 */

import { db } from '@/lib/config/database/connection';

interface CleanupReport {
  totalScanned: number;
  excludedSites: {
    url: string;
    title: string;
    reason: string;
    currentStatus: string;
  }[];
  summary: {
    [category: string]: number;
  };
  wouldBeUpdated: number;
  wouldBeDeleted: number;
}

// Comprehensive list of domains to exclude from indie web index
const EXCLUDED_DOMAINS = [
  // Wikipedia/Wikimedia (institutional knowledge bases, not indie)
  'wikipedia.org', 'wikimedia.org', 'wikidata.org', 'wikiquote.org',
  'wiktionary.org', 'wikinews.org', 'commons.wikimedia.org', 'meta.wikimedia.org',

  // Google/Alphabet Properties
  'google.com', 'youtube.com', 'gmail.com', 'googleblog.com',
  'googleadservices.com', 'googlesyndication.com', 'doubleclick.net',
  'googleusercontent.com', 'gstatic.com', 'googleapis.com',

  // Social Media Giants
  'facebook.com', 'twitter.com', 'x.com', 'instagram.com', 'tiktok.com',
  'reddit.com', 'pinterest.com', 'linkedin.com', 'snapchat.com',

  // Other Big Tech
  'microsoft.com', 'apple.com', 'adobe.com', 'amazon.com',

  // E-commerce Giants
  'ebay.com', 'walmart.com', 'target.com', 'alibaba.com',

  // Major News/Media Corporations
  'cnn.com', 'bbc.com', 'nytimes.com', 'washingtonpost.com', 'theguardian.com',
  'reuters.com', 'ap.org', 'wsj.com', 'npr.org', 'cbs.com', 'nbc.com',
  'abc.com', 'fox.com', 'foxnews.com', 'msnbc.com', 'bloomberg.com',

  // Stack Exchange Network (corporate Q&A platforms)
  'stackoverflow.com', 'stackexchange.com', 'serverfault.com',
  'superuser.com', 'askubuntu.com', 'mathoverflow.net',

  // Major Streaming/Entertainment Platforms
  'netflix.com', 'hulu.com', 'disneyplus.com', 'hbomax.com',
  'paramount.com', 'peacocktv.com', 'crunchyroll.com', 'twitch.tv'
];

// Categorize excluded domains for better reporting
const DOMAIN_CATEGORIES = {
  'Wikipedia/Wikimedia': ['wikipedia.org', 'wikimedia.org', 'wikidata.org', 'wikiquote.org', 'wiktionary.org', 'wikinews.org', 'commons.wikimedia.org', 'meta.wikimedia.org'],
  'Google/Alphabet': ['google.com', 'youtube.com', 'gmail.com', 'googleblog.com', 'googleadservices.com', 'googlesyndication.com', 'doubleclick.net', 'googleusercontent.com', 'gstatic.com', 'googleapis.com'],
  'Social Media': ['facebook.com', 'twitter.com', 'x.com', 'instagram.com', 'tiktok.com', 'reddit.com', 'pinterest.com', 'linkedin.com', 'snapchat.com'],
  'Big Tech': ['microsoft.com', 'apple.com', 'adobe.com', 'amazon.com'],
  'E-commerce': ['ebay.com', 'walmart.com', 'target.com', 'alibaba.com'],
  'News/Media': ['cnn.com', 'bbc.com', 'nytimes.com', 'washingtonpost.com', 'theguardian.com', 'reuters.com', 'ap.org', 'wsj.com', 'npr.org', 'cbs.com', 'nbc.com', 'abc.com', 'fox.com', 'foxnews.com', 'msnbc.com', 'bloomberg.com'],
  'Stack Exchange': ['stackoverflow.com', 'stackexchange.com', 'serverfault.com', 'superuser.com', 'askubuntu.com', 'mathoverflow.net'],
  'Entertainment': ['netflix.com', 'hulu.com', 'disneyplus.com', 'hbomax.com', 'paramount.com', 'peacocktv.com', 'crunchyroll.com', 'twitch.tv']
};

function categorizeUrl(url: string): string {
  const urlLower = url.toLowerCase();

  for (const [category, domains] of Object.entries(DOMAIN_CATEGORIES)) {
    if (domains.some(domain => urlLower.includes(domain))) {
      return category;
    }
  }

  return 'Other Corporate';
}

function shouldExclude(url: string): boolean {
  const urlLower = url.toLowerCase();
  return EXCLUDED_DOMAINS.some(domain => urlLower.includes(domain));
}

async function scanIndexedSites(): Promise<CleanupReport> {
  console.log('🔍 Scanning IndexedSite table for corporate/non-indie domains...');

  // Get all indexed sites
  const allSites = await db.indexedSite.findMany({
    select: {
      id: true,
      url: true,
      title: true,
      crawlStatus: true,
      communityValidated: true,
      communityScore: true,
      indexingPurpose: true,
      platformType: true
    }
  });

  console.log(`📊 Total sites in database: ${allSites.length}`);

  const excludedSites: CleanupReport['excludedSites'] = [];
  const summary: CleanupReport['summary'] = {};

  for (const site of allSites) {
    if (shouldExclude(site.url)) {
      const category = categorizeUrl(site.url);
      const reason = `${category} domain - not aligned with indieweb philosophy`;

      excludedSites.push({
        url: site.url,
        title: site.title,
        reason,
        currentStatus: `crawlStatus: ${site.crawlStatus}, communityValidated: ${site.communityValidated}, score: ${site.communityScore}`
      });

      summary[category] = (summary[category] || 0) + 1;
    }
  }

  return {
    totalScanned: allSites.length,
    excludedSites,
    summary,
    wouldBeUpdated: excludedSites.length,
    wouldBeDeleted: 0 // We'll update rather than delete
  };
}

async function scanCrawlQueue(): Promise<{ found: number; urls: string[] }> {
  console.log('🔍 Scanning CrawlQueue for corporate/non-indie domains...');

  const queueItems = await db.crawlQueue.findMany({
    select: {
      url: true,
      status: true,
      priority: true
    }
  });

  const excludedUrls: string[] = [];

  for (const item of queueItems) {
    if (shouldExclude(item.url)) {
      excludedUrls.push(item.url);
    }
  }

  return {
    found: excludedUrls.length,
    urls: excludedUrls
  };
}

async function performCleanup(execute: boolean = false): Promise<CleanupReport> {
  const report = await scanIndexedSites();
  const queueReport = await scanCrawlQueue();

  console.log('\n📋 CLEANUP REPORT');
  console.log('==================');
  console.log(`Total sites scanned: ${report.totalScanned}`);
  console.log(`Sites to be excluded: ${report.excludedSites.length}`);
  console.log(`Crawl queue items to remove: ${queueReport.found}`);

  console.log('\n📊 Breakdown by category:');
  for (const [category, count] of Object.entries(report.summary)) {
    console.log(`  ${category}: ${count} sites`);
  }

  if (report.excludedSites.length > 0) {
    console.log('\n🚫 Sites to be excluded:');
    for (const site of report.excludedSites.slice(0, 10)) { // Show first 10
      console.log(`  • ${site.url}`);
      console.log(`    ${site.title}`);
      console.log(`    Reason: ${site.reason}`);
      console.log(`    Current: ${site.currentStatus}`);
      console.log('');
    }

    if (report.excludedSites.length > 10) {
      console.log(`  ... and ${report.excludedSites.length - 10} more sites`);
    }
  }

  if (queueReport.found > 0) {
    console.log('\n🗑️ Crawl queue items to remove:');
    for (const url of queueReport.urls.slice(0, 5)) { // Show first 5
      console.log(`  • ${url}`);
    }
    if (queueReport.urls.length > 5) {
      console.log(`  ... and ${queueReport.urls.length - 5} more URLs`);
    }
  }

  if (!execute) {
    console.log('\n⚠️  DRY RUN MODE - No changes made');
    console.log('   Run with --execute flag to perform actual cleanup');
    return report;
  }

  // Perform actual cleanup
  console.log('\n🚀 Performing cleanup...');

  if (report.excludedSites.length > 0) {
    // Update IndexedSite records
    const updatePromises = report.excludedSites.map(site =>
      db.indexedSite.updateMany({
        where: { url: site.url },
        data: {
          crawlStatus: 'rejected',
          communityValidated: false,
          communityScore: -999, // Ensure it never shows in search
          indexingPurpose: 'rejected',
          platformType: 'corporate_generic'
        }
      })
    );

    await Promise.all(updatePromises);
    console.log(`✅ Updated ${report.excludedSites.length} IndexedSite records`);
  }

  if (queueReport.found > 0) {
    // Remove from CrawlQueue
    await db.crawlQueue.deleteMany({
      where: {
        url: {
          in: queueReport.urls
        }
      }
    });
    console.log(`✅ Removed ${queueReport.found} items from CrawlQueue`);
  }

  console.log('\n🎉 Cleanup completed successfully!');
  return report;
}

async function main() {
  const args = process.argv.slice(2);
  const execute = args.includes('--execute');

  try {
    console.log('🧹 Corporate Domain Cleanup Script');
    console.log('===================================');

    if (execute) {
      console.log('⚠️  EXECUTE MODE - Changes will be made to the database');
    } else {
      console.log('🔍 DRY RUN MODE - No changes will be made');
    }

    const report = await performCleanup(execute);

    if (execute) {
      console.log('\n✨ Cleanup completed! Your indieweb index is now more focused on indie content.');
    } else {
      console.log('\n💡 To perform the actual cleanup, run:');
      console.log('   npx tsx scripts/cleanup-corporate-exclusions.ts --execute');
    }

  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

if (require.main === module) {
  main();
}

export { performCleanup, shouldExclude, categorizeUrl };