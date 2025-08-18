-- CreateEnum
CREATE TYPE "public"."TemplateMode" AS ENUM ('default', 'enhanced', 'advanced');

-- AlterTable
ALTER TABLE "public"."Profile" ADD COLUMN     "templateMode" "public"."TemplateMode" NOT NULL DEFAULT 'default';
