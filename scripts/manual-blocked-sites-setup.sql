-- Manual Database Setup for BlockedSite Table
-- Run this directly in your PostgreSQL database

-- Create the BlockedSite table
CREATE TABLE IF NOT EXISTS "BlockedSite" (
    "id" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlockedSite_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE UNIQUE INDEX IF NOT EXISTS "BlockedSite_domain_key" ON "BlockedSite"("domain");
CREATE INDEX IF NOT EXISTS "BlockedSite_category_idx" ON "BlockedSite"("category");
CREATE INDEX IF NOT EXISTS "BlockedSite_domain_idx" ON "BlockedSite"("domain");

-- Insert initial blocked sites data
INSERT INTO "BlockedSite" ("id", "domain", "category", "reason") VALUES
-- Social Media Giants
(gen_random_uuid()::text, 'facebook.com', 'social_media', 'Large corporate social media platform antithetical to indie web values'),
(gen_random_uuid()::text, 'twitter.com', 'social_media', 'Large corporate social media platform antithetical to indie web values'),
(gen_random_uuid()::text, 'x.com', 'social_media', 'Large corporate social media platform antithetical to indie web values'),
(gen_random_uuid()::text, 'instagram.com', 'social_media', 'Large corporate social media platform antithetical to indie web values'),
(gen_random_uuid()::text, 'tiktok.com', 'social_media', 'Large corporate social media platform antithetical to indie web values'),
(gen_random_uuid()::text, 'reddit.com', 'social_media', 'Large corporate social media platform antithetical to indie web values'),
(gen_random_uuid()::text, 'pinterest.com', 'social_media', 'Large corporate social media platform antithetical to indie web values'),
(gen_random_uuid()::text, 'linkedin.com', 'social_media', 'Large corporate social media platform antithetical to indie web values'),
(gen_random_uuid()::text, 'snapchat.com', 'social_media', 'Large corporate social media platform antithetical to indie web values'),
(gen_random_uuid()::text, 'threads.net', 'social_media', 'Large corporate social media platform antithetical to indie web values'),
(gen_random_uuid()::text, 'bsky.app', 'social_media', 'Large corporate social media platform antithetical to indie web values'),

-- Google/Alphabet Properties
(gen_random_uuid()::text, 'google.com', 'big_tech', 'Major tech corporation antithetical to indie web values'),
(gen_random_uuid()::text, 'youtube.com', 'big_tech', 'Major tech corporation antithetical to indie web values'),
(gen_random_uuid()::text, 'gmail.com', 'big_tech', 'Major tech corporation antithetical to indie web values'),
(gen_random_uuid()::text, 'googleblog.com', 'big_tech', 'Major tech corporation antithetical to indie web values'),
(gen_random_uuid()::text, 'googleadservices.com', 'big_tech', 'Major tech corporation antithetical to indie web values'),
(gen_random_uuid()::text, 'googlesyndication.com', 'big_tech', 'Major tech corporation antithetical to indie web values'),
(gen_random_uuid()::text, 'doubleclick.net', 'big_tech', 'Major tech corporation antithetical to indie web values'),
(gen_random_uuid()::text, 'googleusercontent.com', 'big_tech', 'Major tech corporation antithetical to indie web values'),
(gen_random_uuid()::text, 'gstatic.com', 'big_tech', 'Major tech corporation antithetical to indie web values'),
(gen_random_uuid()::text, 'googleapis.com', 'big_tech', 'Major tech corporation antithetical to indie web values'),

-- Other Big Tech
(gen_random_uuid()::text, 'microsoft.com', 'big_tech', 'Major tech corporation antithetical to indie web values'),
(gen_random_uuid()::text, 'apple.com', 'big_tech', 'Major tech corporation antithetical to indie web values'),
(gen_random_uuid()::text, 'adobe.com', 'big_tech', 'Major tech corporation antithetical to indie web values'),
(gen_random_uuid()::text, 'amazon.com', 'big_tech', 'Major tech corporation antithetical to indie web values'),

-- E-commerce Giants
(gen_random_uuid()::text, 'ebay.com', 'ecommerce', 'Large corporate e-commerce platform'),
(gen_random_uuid()::text, 'walmart.com', 'ecommerce', 'Large corporate e-commerce platform'),
(gen_random_uuid()::text, 'target.com', 'ecommerce', 'Large corporate e-commerce platform'),
(gen_random_uuid()::text, 'alibaba.com', 'ecommerce', 'Large corporate e-commerce platform'),

-- Wikipedia/Wikimedia
(gen_random_uuid()::text, 'wikipedia.org', 'knowledge_base', 'Institutional knowledge base, not indie web content'),
(gen_random_uuid()::text, 'wikimedia.org', 'knowledge_base', 'Institutional knowledge base, not indie web content'),
(gen_random_uuid()::text, 'wikidata.org', 'knowledge_base', 'Institutional knowledge base, not indie web content'),
(gen_random_uuid()::text, 'wikiquote.org', 'knowledge_base', 'Institutional knowledge base, not indie web content'),
(gen_random_uuid()::text, 'wiktionary.org', 'knowledge_base', 'Institutional knowledge base, not indie web content'),
(gen_random_uuid()::text, 'wikinews.org', 'knowledge_base', 'Institutional knowledge base, not indie web content'),
(gen_random_uuid()::text, 'commons.wikimedia.org', 'knowledge_base', 'Institutional knowledge base, not indie web content'),
(gen_random_uuid()::text, 'meta.wikimedia.org', 'knowledge_base', 'Institutional knowledge base, not indie web content'),

-- Major News/Media
(gen_random_uuid()::text, 'cnn.com', 'news_media', 'Corporate news media outlet'),
(gen_random_uuid()::text, 'bbc.com', 'news_media', 'Corporate news media outlet'),
(gen_random_uuid()::text, 'nytimes.com', 'news_media', 'Corporate news media outlet'),
(gen_random_uuid()::text, 'washingtonpost.com', 'news_media', 'Corporate news media outlet'),
(gen_random_uuid()::text, 'theguardian.com', 'news_media', 'Corporate news media outlet'),
(gen_random_uuid()::text, 'reuters.com', 'news_media', 'Corporate news media outlet'),
(gen_random_uuid()::text, 'ap.org', 'news_media', 'Corporate news media outlet'),
(gen_random_uuid()::text, 'wsj.com', 'news_media', 'Corporate news media outlet'),
(gen_random_uuid()::text, 'npr.org', 'news_media', 'Corporate news media outlet'),
(gen_random_uuid()::text, 'cbs.com', 'news_media', 'Corporate news media outlet'),
(gen_random_uuid()::text, 'nbc.com', 'news_media', 'Corporate news media outlet'),
(gen_random_uuid()::text, 'abc.com', 'news_media', 'Corporate news media outlet'),
(gen_random_uuid()::text, 'fox.com', 'news_media', 'Corporate news media outlet'),
(gen_random_uuid()::text, 'foxnews.com', 'news_media', 'Corporate news media outlet'),
(gen_random_uuid()::text, 'msnbc.com', 'news_media', 'Corporate news media outlet'),
(gen_random_uuid()::text, 'bloomberg.com', 'news_media', 'Corporate news media outlet'),

-- Stack Exchange Network
(gen_random_uuid()::text, 'stackoverflow.com', 'knowledge_base', 'Corporate Q&A platform'),
(gen_random_uuid()::text, 'stackexchange.com', 'knowledge_base', 'Corporate Q&A platform'),
(gen_random_uuid()::text, 'serverfault.com', 'knowledge_base', 'Corporate Q&A platform'),
(gen_random_uuid()::text, 'superuser.com', 'knowledge_base', 'Corporate Q&A platform'),
(gen_random_uuid()::text, 'askubuntu.com', 'knowledge_base', 'Corporate Q&A platform'),
(gen_random_uuid()::text, 'mathoverflow.net', 'knowledge_base', 'Corporate Q&A platform'),

-- Entertainment Platforms
(gen_random_uuid()::text, 'netflix.com', 'entertainment', 'Corporate streaming platform'),
(gen_random_uuid()::text, 'hulu.com', 'entertainment', 'Corporate streaming platform'),
(gen_random_uuid()::text, 'disneyplus.com', 'entertainment', 'Corporate streaming platform'),
(gen_random_uuid()::text, 'hbomax.com', 'entertainment', 'Corporate streaming platform'),
(gen_random_uuid()::text, 'paramount.com', 'entertainment', 'Corporate streaming platform'),
(gen_random_uuid()::text, 'peacocktv.com', 'entertainment', 'Corporate streaming platform'),
(gen_random_uuid()::text, 'crunchyroll.com', 'entertainment', 'Corporate streaming platform'),
(gen_random_uuid()::text, 'twitch.tv', 'entertainment', 'Corporate streaming platform'),
(gen_random_uuid()::text, 'imdb.com', 'entertainment', 'Corporate entertainment database')

-- Handle conflicts if data already exists
ON CONFLICT ("domain") DO NOTHING;

-- Verify the data was inserted
SELECT
    category,
    COUNT(*) as count
FROM "BlockedSite"
GROUP BY category
ORDER BY category;

-- Show total count
SELECT COUNT(*) as total_blocked_sites FROM "BlockedSite";
