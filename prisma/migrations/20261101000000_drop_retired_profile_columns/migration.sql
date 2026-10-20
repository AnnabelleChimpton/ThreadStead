-- Columns nothing reads or writes since a84265f and dee222c (deployed
-- 2026-10-19): two duplicate copies of the compiled template, and two flags
-- that layout and site styles replaced (lib/domain/profile/layout.ts).
-- Dropped a release later on purpose: deploy.sh migrates before it builds,
-- so the old code was still running while the new one built.
ALTER TABLE "Profile" DROP COLUMN IF EXISTS "customTemplateAst";
ALTER TABLE "Profile" DROP COLUMN IF EXISTS "templateIslands";
ALTER TABLE "Profile" DROP COLUMN IF EXISTS "templateEnabled";
ALTER TABLE "Profile" DROP COLUMN IF EXISTS "includeSiteCSS";
