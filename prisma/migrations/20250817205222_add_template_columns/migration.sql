-- AlterTable - Safe for production (handles existing columns)
ALTER TABLE "public"."Profile" 
ADD COLUMN IF NOT EXISTS "customTemplate" TEXT,
ADD COLUMN IF NOT EXISTS "customTemplateAst" TEXT,
ADD COLUMN IF NOT EXISTS "hideNavigation" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "templateEnabled" BOOLEAN NOT NULL DEFAULT false;
