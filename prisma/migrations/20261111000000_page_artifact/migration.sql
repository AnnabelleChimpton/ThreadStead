-- A page of your own HTML stores what it renders from as text
-- (lib/templates/rendering/page-artifact.ts): the page tree, its components
-- and its head, without the parse tree "compiledTemplate" kept. As jsonb,
-- that AST made a page nested ~57 levels deep fail to save (Prisma's
-- recursion limit), and every visit read 3-11x the page's source.
-- "compiledTemplate" stays for pages not yet recompiled (scripts/recompile-pages.ts).
-- Re-runnable.

ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "pageArtifact" TEXT;
