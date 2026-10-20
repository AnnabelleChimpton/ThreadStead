-- The "default" layout used to ignore a page's own CSS; "enhanced" showed it.
-- They're now one standard layout that shows it. Pages left on "default"
-- with CSS saved (5 on prod, 2026-10-19) would suddenly change look, so that
-- CSS goes into their History, where they can load it back, and is cleared.
-- Re-runnable: a second run finds nothing left to move.
INSERT INTO "ProfileTemplateRevision"
  ("id", "userId", "customTemplate", "customCSS", "cssMode", "templateMode", "hideNavigation", "trigger", "createdAt")
SELECT 'layoutmerge_' || md5(p."userId"), p."userId", p."customTemplate", p."customCSS", p."cssMode", p."templateMode",
       p."hideNavigation", 'layout-merge', now()
FROM "Profile" p
WHERE p."templateMode" = 'default' AND coalesce(trim(p."customCSS"), '') <> ''
ON CONFLICT ("id") DO NOTHING;

UPDATE "Profile"
SET "customCSS" = NULL
WHERE "templateMode" = 'default' AND coalesce(trim("customCSS"), '') <> '';
