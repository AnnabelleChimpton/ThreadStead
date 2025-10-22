#!/usr/bin/env tsx
/**
 * Seed script to populate BlockedSite table with initial data
 *
 * This script migrates the hardcoded blocked sites lists from quality-filter.ts
 * and cleanup-corporate-exclusions.ts into the database.
 *
 * Usage:
 *   npx tsx scripts/seed-blocked-sites.ts
 *   npx tsx scripts/seed-blocked-sites.ts --force  # Overwrite existing entries
 */

import { db } from '@/lib/config/database/connection';

interface BlockedSiteData {
  domain: string;
  category: string;
  reason?: string;
}

// Comprehensive list of domains to block, organized by category
const BLOCKED_SITES: BlockedSiteData[] = [
  // Social Media Giants
  { domain: 'facebook.com', category: 'social_media', reason: 'Large corporate social media platform antithetical to indie web values' },
  { domain: 'twitter.com', category: 'social_media', reason: 'Large corporate social media platform antithetical to indie web values' },
  { domain: 'x.com', category: 'social_media', reason: 'Large corporate social media platform antithetical to indie web values' },
  { domain: 'instagram.com', category: 'social_media', reason: 'Large corporate social media platform antithetical to indie web values' },
  { domain: 'tiktok.com', category: 'social_media', reason: 'Large corporate social media platform antithetical to indie web values' },
  { domain: 'reddit.com', category: 'social_media', reason: 'Large corporate social media platform antithetical to indie web values' },
  { domain: 'pinterest.com', category: 'social_media', reason: 'Large corporate social media platform antithetical to indie web values' },
  { domain: 'linkedin.com', category: 'social_media', reason: 'Large corporate social media platform antithetical to indie web values' },
  { domain: 'snapchat.com', category: 'social_media', reason: 'Large corporate social media platform antithetical to indie web values' },
  { domain: 'threads.net', category: 'social_media', reason: 'Large corporate social media platform antithetical to indie web values' },
  { domain: 'bsky.app', category: 'social_media', reason: 'Large corporate social media platform antithetical to indie web values' },

  // Google/Alphabet Properties
  { domain: 'google.com', category: 'big_tech', reason: 'Major tech corporation antithetical to indie web values' },
  { domain: 'youtube.com', category: 'big_tech', reason: 'Major tech corporation antithetical to indie web values' },
  { domain: 'gmail.com', category: 'big_tech', reason: 'Major tech corporation antithetical to indie web values' },
  { domain: 'googleblog.com', category: 'big_tech', reason: 'Major tech corporation antithetical to indie web values' },
  { domain: 'googleadservices.com', category: 'big_tech', reason: 'Major tech corporation antithetical to indie web values' },
  { domain: 'googlesyndication.com', category: 'big_tech', reason: 'Major tech corporation antithetical to indie web values' },
  { domain: 'doubleclick.net', category: 'big_tech', reason: 'Major tech corporation antithetical to indie web values' },
  { domain: 'googleusercontent.com', category: 'big_tech', reason: 'Major tech corporation antithetical to indie web values' },
  { domain: 'gstatic.com', category: 'big_tech', reason: 'Major tech corporation antithetical to indie web values' },
  { domain: 'googleapis.com', category: 'big_tech', reason: 'Major tech corporation antithetical to indie web values' },

  // Other Big Tech
  { domain: 'microsoft.com', category: 'big_tech', reason: 'Major tech corporation antithetical to indie web values' },
  { domain: 'apple.com', category: 'big_tech', reason: 'Major tech corporation antithetical to indie web values' },
  { domain: 'adobe.com', category: 'big_tech', reason: 'Major tech corporation antithetical to indie web values' },
  { domain: 'amazon.com', category: 'big_tech', reason: 'Major tech corporation antithetical to indie web values' },

  // E-commerce Giants
  { domain: 'ebay.com', category: 'ecommerce', reason: 'Large corporate e-commerce platform' },
  { domain: 'walmart.com', category: 'ecommerce', reason: 'Large corporate e-commerce platform' },
  { domain: 'target.com', category: 'ecommerce', reason: 'Large corporate e-commerce platform' },
  { domain: 'alibaba.com', category: 'ecommerce', reason: 'Large corporate e-commerce platform' },

  // Wikipedia/Wikimedia (institutional knowledge bases, not indie)
  { domain: 'wikipedia.org', category: 'knowledge_base', reason: 'Institutional knowledge base, not indie web content' },
  { domain: 'wikimedia.org', category: 'knowledge_base', reason: 'Institutional knowledge base, not indie web content' },
  { domain: 'wikidata.org', category: 'knowledge_base', reason: 'Institutional knowledge base, not indie web content' },
  { domain: 'wikiquote.org', category: 'knowledge_base', reason: 'Institutional knowledge base, not indie web content' },
  { domain: 'wiktionary.org', category: 'knowledge_base', reason: 'Institutional knowledge base, not indie web content' },
  { domain: 'wikinews.org', category: 'knowledge_base', reason: 'Institutional knowledge base, not indie web content' },
  { domain: 'commons.wikimedia.org', category: 'knowledge_base', reason: 'Institutional knowledge base, not indie web content' },
  { domain: 'meta.wikimedia.org', category: 'knowledge_base', reason: 'Institutional knowledge base, not indie web content' },

  // Major News/Media Corporations
  { domain: 'cnn.com', category: 'news_media', reason: 'Corporate news media outlet' },
  { domain: 'bbc.com', category: 'news_media', reason: 'Corporate news media outlet' },
  { domain: 'nytimes.com', category: 'news_media', reason: 'Corporate news media outlet' },
  { domain: 'washingtonpost.com', category: 'news_media', reason: 'Corporate news media outlet' },
  { domain: 'theguardian.com', category: 'news_media', reason: 'Corporate news media outlet' },
  { domain: 'reuters.com', category: 'news_media', reason: 'Corporate news media outlet' },
  { domain: 'ap.org', category: 'news_media', reason: 'Corporate news media outlet' },
  { domain: 'wsj.com', category: 'news_media', reason: 'Corporate news media outlet' },
  { domain: 'npr.org', category: 'news_media', reason: 'Corporate news media outlet' },
  { domain: 'cbs.com', category: 'news_media', reason: 'Corporate news media outlet' },
  { domain: 'nbc.com', category: 'news_media', reason: 'Corporate news media outlet' },
  { domain: 'abc.com', category: 'news_media', reason: 'Corporate news media outlet' },
  { domain: 'fox.com', category: 'news_media', reason: 'Corporate news media outlet' },
  { domain: 'foxnews.com', category: 'news_media', reason: 'Corporate news media outlet' },
  { domain: 'msnbc.com', category: 'news_media', reason: 'Corporate news media outlet' },
  { domain: 'bloomberg.com', category: 'news_media', reason: 'Corporate news media outlet' },

  // Stack Exchange Network (corporate Q&A platforms)
  { domain: 'stackoverflow.com', category: 'knowledge_base', reason: 'Corporate Q&A platform' },
  { domain: 'stackexchange.com', category: 'knowledge_base', reason: 'Corporate Q&A platform' },
  { domain: 'serverfault.com', category: 'knowledge_base', reason: 'Corporate Q&A platform' },
  { domain: 'superuser.com', category: 'knowledge_base', reason: 'Corporate Q&A platform' },
  { domain: 'askubuntu.com', category: 'knowledge_base', reason: 'Corporate Q&A platform' },
  { domain: 'mathoverflow.net', category: 'knowledge_base', reason: 'Corporate Q&A platform' },

  // Major Streaming/Entertainment Platforms
  { domain: 'netflix.com', category: 'entertainment', reason: 'Corporate streaming platform' },
  { domain: 'hulu.com', category: 'entertainment', reason: 'Corporate streaming platform' },
  { domain: 'disneyplus.com', category: 'entertainment', reason: 'Corporate streaming platform' },
  { domain: 'hbomax.com', category: 'entertainment', reason: 'Corporate streaming platform' },
  { domain: 'paramount.com', category: 'entertainment', reason: 'Corporate streaming platform' },
  { domain: 'peacocktv.com', category: 'entertainment', reason: 'Corporate streaming platform' },
  { domain: 'crunchyroll.com', category: 'entertainment', reason: 'Corporate streaming platform' },
  { domain: 'twitch.tv', category: 'entertainment', reason: 'Corporate streaming platform' },
  { domain: 'imdb.com', category: 'entertainment', reason: 'Corporate entertainment database' },
];

async function seedBlockedSites(force: boolean = false): Promise<void> {
  console.log('🌱 Seeding BlockedSite table...\n');

  let created = 0;
  let skipped = 0;
  let updated = 0;

  for (const site of BLOCKED_SITES) {
    try {
      const existing = await db.blockedSite.findUnique({
        where: { domain: site.domain }
      });

      if (existing && !force) {
        console.log(`⏭️  Skipping ${site.domain} (already exists)`);
        skipped++;
        continue;
      }

      if (existing && force) {
        await db.blockedSite.update({
          where: { domain: site.domain },
          data: {
            category: site.category,
            reason: site.reason
          }
        });
        console.log(`✏️  Updated ${site.domain} (${site.category})`);
        updated++;
      } else {
        await db.blockedSite.create({
          data: {
            domain: site.domain,
            category: site.category,
            reason: site.reason
          }
        });
        console.log(`✅ Created ${site.domain} (${site.category})`);
        created++;
      }
    } catch (error) {
      console.error(`❌ Error processing ${site.domain}:`, error);
    }
  }

  console.log('\n📊 Summary:');
  console.log(`  Created: ${created}`);
  console.log(`  Updated: ${updated}`);
  console.log(`  Skipped: ${skipped}`);
  console.log(`  Total: ${BLOCKED_SITES.length}`);
}

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes('--force');

  try {
    console.log('🧹 BlockedSite Table Seeding Script');
    console.log('=====================================\n');

    if (force) {
      console.log('⚠️  FORCE MODE - Existing entries will be updated');
    } else {
      console.log('📝 Normal mode - Existing entries will be skipped');
      console.log('   Use --force to update existing entries\n');
    }

    await seedBlockedSites(force);

    console.log('\n✨ Seeding complete!');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

if (require.main === module) {
  main();
}

export { seedBlockedSites, BLOCKED_SITES };
