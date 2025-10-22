#!/usr/bin/env tsx
/**
 * Manual setup script for BlockedSite table
 * Runs SQL directly using Prisma to create table and seed initial data
 */

import { db } from '@/lib/config/database/connection';

async function setupBlockedSitesTable() {
  console.log('🚀 Setting up BlockedSite table...\n');

  try {
    // Step 1: Create the table
    console.log('1️⃣ Creating BlockedSite table...');
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "BlockedSite" (
          "id" TEXT NOT NULL,
          "domain" TEXT NOT NULL,
          "category" TEXT NOT NULL,
          "reason" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

          CONSTRAINT "BlockedSite_pkey" PRIMARY KEY ("id")
      )
    `);
    console.log('   ✅ Table created\n');

    // Step 2: Create indexes
    console.log('2️⃣ Creating indexes...');
    await db.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "BlockedSite_domain_key" ON "BlockedSite"("domain")
    `);
    await db.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "BlockedSite_category_idx" ON "BlockedSite"("category")
    `);
    await db.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "BlockedSite_domain_idx" ON "BlockedSite"("domain")
    `);
    console.log('   ✅ Indexes created\n');

    // Step 3: Insert data
    console.log('3️⃣ Inserting blocked sites data...');

    const blockedSites = [
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

      // Wikipedia/Wikimedia
      { domain: 'wikipedia.org', category: 'knowledge_base', reason: 'Institutional knowledge base, not indie web content' },
      { domain: 'wikimedia.org', category: 'knowledge_base', reason: 'Institutional knowledge base, not indie web content' },
      { domain: 'wikidata.org', category: 'knowledge_base', reason: 'Institutional knowledge base, not indie web content' },
      { domain: 'wikiquote.org', category: 'knowledge_base', reason: 'Institutional knowledge base, not indie web content' },
      { domain: 'wiktionary.org', category: 'knowledge_base', reason: 'Institutional knowledge base, not indie web content' },
      { domain: 'wikinews.org', category: 'knowledge_base', reason: 'Institutional knowledge base, not indie web content' },
      { domain: 'commons.wikimedia.org', category: 'knowledge_base', reason: 'Institutional knowledge base, not indie web content' },
      { domain: 'meta.wikimedia.org', category: 'knowledge_base', reason: 'Institutional knowledge base, not indie web content' },

      // Major News/Media
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

      // Stack Exchange Network
      { domain: 'stackoverflow.com', category: 'knowledge_base', reason: 'Corporate Q&A platform' },
      { domain: 'stackexchange.com', category: 'knowledge_base', reason: 'Corporate Q&A platform' },
      { domain: 'serverfault.com', category: 'knowledge_base', reason: 'Corporate Q&A platform' },
      { domain: 'superuser.com', category: 'knowledge_base', reason: 'Corporate Q&A platform' },
      { domain: 'askubuntu.com', category: 'knowledge_base', reason: 'Corporate Q&A platform' },
      { domain: 'mathoverflow.net', category: 'knowledge_base', reason: 'Corporate Q&A platform' },

      // Entertainment Platforms
      { domain: 'netflix.com', category: 'entertainment', reason: 'Corporate streaming platform' },
      { domain: 'hulu.com', category: 'entertainment', reason: 'Corporate streaming platform' },
      { domain: 'disneyplus.com', category: 'entertainment', reason: 'Corporate streaming platform' },
      { domain: 'hbomax.com', category: 'entertainment', reason: 'Corporate streaming platform' },
      { domain: 'paramount.com', category: 'entertainment', reason: 'Corporate streaming platform' },
      { domain: 'peacocktv.com', category: 'entertainment', reason: 'Corporate streaming platform' },
      { domain: 'crunchyroll.com', category: 'entertainment', reason: 'Corporate streaming platform' },
      { domain: 'twitch.tv', category: 'entertainment', reason: 'Corporate streaming platform' },
      { domain: 'imdb.com', category: 'entertainment', reason: 'Corporate entertainment database' }
    ];

    let inserted = 0;
    let skipped = 0;

    for (const site of blockedSites) {
      try {
        // Generate a random UUID-like ID
        const id = `bs_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;

        await db.$executeRawUnsafe(
          `INSERT INTO "BlockedSite" ("id", "domain", "category", "reason", "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
           ON CONFLICT ("domain") DO NOTHING`,
          id,
          site.domain,
          site.category,
          site.reason
        );

        // Check if it was actually inserted
        const result = await db.$queryRawUnsafe<[{ count: bigint }]>(
          `SELECT COUNT(*) as count FROM "BlockedSite" WHERE "domain" = $1`,
          site.domain
        );

        if (result[0].count > 0n) {
          inserted++;
          console.log(`   ✅ ${site.domain}`);
        } else {
          skipped++;
        }
      } catch (error) {
        console.log(`   ⏭️  ${site.domain} (already exists)`);
        skipped++;
      }
    }

    console.log(`\n   Inserted: ${inserted}, Skipped: ${skipped}\n`);

    // Step 4: Verify
    console.log('4️⃣ Verifying data...');
    const categoryCounts = await db.$queryRawUnsafe<Array<{ category: string; count: bigint }>>(
      `SELECT category, COUNT(*) as count FROM "BlockedSite" GROUP BY category ORDER BY category`
    );

    console.log('\n   📊 Blocked Sites by Category:');
    for (const row of categoryCounts) {
      console.log(`      ${row.category.padEnd(20)} ${row.count}`);
    }

    const total = await db.$queryRawUnsafe<[{ count: bigint }]>(
      `SELECT COUNT(*) as count FROM "BlockedSite"`
    );
    console.log(`\n   Total blocked sites: ${total[0].count}`);

    console.log('\n✨ Setup complete!');
    console.log('\nNext steps:');
    console.log('  1. Visit /admin/crawler');
    console.log('  2. Scroll to "🚫 Blocked Sites Management" section');
    console.log('  3. Try adding/removing sites or preview cleanup\n');

  } catch (error) {
    console.error('❌ Setup failed:', error);
    throw error;
  } finally {
    await db.$disconnect();
  }
}

if (require.main === module) {
  setupBlockedSitesTable();
}
