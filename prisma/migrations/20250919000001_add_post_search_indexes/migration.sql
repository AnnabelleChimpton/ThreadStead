-- Add search performance indexes for Post content fields
-- These indexes will improve performance when searching through post content

-- Add indexes for text search on content fields
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Post_bodyText_gin_idx" ON "public"."Post" USING gin(to_tsvector('english', coalesce("bodyText", '')));
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Post_bodyMarkdown_gin_idx" ON "public"."Post" USING gin(to_tsvector('english', coalesce("bodyMarkdown", '')));
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Post_bodyHtml_gin_idx" ON "public"."Post" USING gin(to_tsvector('english', coalesce("bodyHtml", '')));
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Post_title_gin_idx" ON "public"."Post" USING gin(to_tsvector('english', coalesce("title", '')));

-- Add composite index for visibility and creation date for public post queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Post_visibility_createdAt_idx" ON "public"."Post"("visibility", "createdAt" DESC);

-- Add index for tags array search
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Post_tags_gin_idx" ON "public"."Post" USING gin("tags");