-- Search Phase 1 (SEARCH_PLAN.md §2): Postgres full-text search + trigram
-- matching for posts, people and custom pages. Hand-written.
--
-- The search_tsv columns are kept up to date by triggers, not GENERATED
-- columns: Prisma reports generated columns as drift. schema.prisma declares
-- them as Unsupported("tsvector")? and declares every index below, so
-- `prisma migrate diff` against a migrated database is empty. The functions
-- and triggers are invisible to Prisma.
--
-- Safe to re-run: every statement is IF NOT EXISTS / OR REPLACE.
--
-- Needs pg_trgm and unaccent (standard contrib, "trusted" since Postgres 13,
-- so a database owner without superuser can create them).

CREATE EXTENSION IF NOT EXISTS pg_trgm SCHEMA public;
CREATE EXTENSION IF NOT EXISTS unaccent SCHEMA public;

-- unaccent() is only STABLE (it looks its dictionary up by search_path), so it
-- can't feed an index or a stored column directly. Pinning the dictionary by
-- schema makes it safe to declare IMMUTABLE.
CREATE OR REPLACE FUNCTION public.immutable_unaccent(text) RETURNS text
  LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
AS $$ SELECT public.unaccent('public.unaccent'::regdictionary, $1) $$;

-- HTML / markdown → one line of plain text: drops script/style blocks, tags,
-- markdown images, image-file remnants (`!IMG_0980.png`) and entities; keeps
-- link text. Mirrors toPlainText() in lib/search/excerpt.ts closely enough for
-- indexing ("href" and "nbsp" must not match every post).
-- The first quantifier in the script/style pattern is non-greedy on purpose:
-- in Postgres that makes the whole pattern non-greedy, so two <script> blocks
-- don't swallow the text between them.
CREATE OR REPLACE FUNCTION public.search_plain_text(input text) RETURNS text
  LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
AS $$
  SELECT btrim(regexp_replace(
    regexp_replace(
      replace(replace(replace(replace(replace(replace(replace(
        regexp_replace(
          regexp_replace(
            regexp_replace(
              regexp_replace(
                regexp_replace(input, '<(script|style)[^>]*?>.*?</\1[^>]*>', ' ', 'gi'),
              '<[^>]*>', ' ', 'g'),
            '!\[[^]]*\]\([^)]*\)', ' ', 'g'),
          '!?[^[:space:]]+\.(png|jpe?g|gif|webp|avif|bmp|svg|heic)\M', ' ', 'gi'),
        '\[([^]]+)\]\([^)]+\)', '\1', 'g'),
      '&nbsp;', ' '), '&amp;', '&'), '&lt;', '<'), '&gt;', '>'), '&quot;', '"'), '&#39;', ''''), '&apos;', ''''),
    '&#?[[:alnum:]]+;', ' ', 'g'),
  '[[:space:]]+', ' ', 'g'))
$$;

-- ---------------------------------------------------------------- Post ----
-- title (A) + tags (B) + plain bodyText (C), english config (stems plurals
-- etc.; the query side uses the same config). bodyText is null on posts
-- written as HTML/markdown, which left them unsearchable: derive it on write.
-- The app's update route sets bodyText to null whenever the body changes
-- format, so a derived value is never left stale.
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "search_tsv" tsvector;

CREATE OR REPLACE FUNCTION public.post_search_tsv_update() RETURNS trigger
  LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW."bodyText" IS NULL AND COALESCE(NEW."bodyHtml", NEW."bodyMarkdown") IS NOT NULL THEN
    NEW."bodyText" := NULLIF(public.search_plain_text(COALESCE(NEW."bodyHtml", NEW."bodyMarkdown")), '');
  END IF;
  NEW."search_tsv" :=
       setweight(to_tsvector('english', public.immutable_unaccent(COALESCE(NEW."title", ''))), 'A')
    || setweight(to_tsvector('english', public.immutable_unaccent(COALESCE(array_to_string(NEW."tags", ' '), ''))), 'B')
    || setweight(to_tsvector('english', public.immutable_unaccent(left(public.search_plain_text(COALESCE(NEW."bodyText", '')), 500000))), 'C');
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS "Post_search_tsv_trigger" ON "Post";
CREATE TRIGGER "Post_search_tsv_trigger"
  BEFORE INSERT OR UPDATE OF "title", "tags", "bodyText", "bodyHtml", "bodyMarkdown" ON "Post"
  FOR EACH ROW EXECUTE FUNCTION public.post_search_tsv_update();

-- Backfill (also fills bodyText where it was null). Post.updatedAt has no
-- DB default/trigger, so this doesn't touch it.
UPDATE "Post" SET "title" = "title";

CREATE INDEX IF NOT EXISTS "Post_search_tsv_idx" ON "Post" USING GIN ("search_tsv");
CREATE INDEX IF NOT EXISTS "Post_title_trgm_idx" ON "Post" USING GIN ("title" gin_trgm_ops);

-- ------------------------------------------------------------- Profile ----
-- displayName (A) + bio (B), `simple` config so names aren't stemmed.
ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "search_tsv" tsvector;

CREATE OR REPLACE FUNCTION public.profile_search_tsv_update() RETURNS trigger
  LANGUAGE plpgsql
AS $$
BEGIN
  NEW."search_tsv" :=
       setweight(to_tsvector('simple', public.immutable_unaccent(COALESCE(NEW."displayName", ''))), 'A')
    || setweight(to_tsvector('simple', public.immutable_unaccent(public.search_plain_text(COALESCE(NEW."bio", '')))), 'B');
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS "Profile_search_tsv_trigger" ON "Profile";
CREATE TRIGGER "Profile_search_tsv_trigger"
  BEFORE INSERT OR UPDATE OF "displayName", "bio" ON "Profile"
  FOR EACH ROW EXECUTE FUNCTION public.profile_search_tsv_update();

UPDATE "Profile" SET "displayName" = "displayName";

CREATE INDEX IF NOT EXISTS "Profile_search_tsv_idx" ON "Profile" USING GIN ("search_tsv");
CREATE INDEX IF NOT EXISTS "Profile_displayName_trgm_idx" ON "Profile" USING GIN ("displayName" gin_trgm_ops);

-- -------------------------------------------------------------- Handle ----
CREATE INDEX IF NOT EXISTS "Handle_handle_trgm_idx" ON "Handle" USING GIN ("handle" gin_trgm_ops);

-- ---------------------------------------------------------- CustomPage ----
-- title (A) + plain content (C), english. Null while unpublished, so a draft
-- can't match even if a query forgets the published filter.
ALTER TABLE "CustomPage" ADD COLUMN IF NOT EXISTS "search_tsv" tsvector;

CREATE OR REPLACE FUNCTION public.custom_page_search_tsv_update() RETURNS trigger
  LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW."published" THEN
    NEW."search_tsv" :=
         setweight(to_tsvector('english', public.immutable_unaccent(COALESCE(NEW."title", ''))), 'A')
      || setweight(to_tsvector('english', public.immutable_unaccent(left(public.search_plain_text(COALESCE(NEW."content", '')), 500000))), 'C');
  ELSE
    NEW."search_tsv" := NULL;
  END IF;
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS "CustomPage_search_tsv_trigger" ON "CustomPage";
CREATE TRIGGER "CustomPage_search_tsv_trigger"
  BEFORE INSERT OR UPDATE OF "title", "content", "published" ON "CustomPage"
  FOR EACH ROW EXECUTE FUNCTION public.custom_page_search_tsv_update();

UPDATE "CustomPage" SET "title" = "title";

CREATE INDEX IF NOT EXISTS "CustomPage_search_tsv_idx" ON "CustomPage" USING GIN ("search_tsv");
