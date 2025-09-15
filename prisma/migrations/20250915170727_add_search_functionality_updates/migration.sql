-- CreateEnum
CREATE TYPE "public"."NewsType" AS ENUM ('announcement', 'feature', 'maintenance', 'community');

-- CreateEnum
CREATE TYPE "public"."NewsPriority" AS ENUM ('high', 'medium', 'low');

-- AlterTable
ALTER TABLE "public"."CustomPage" ADD COLUMN     "isLandingPage" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "public"."UserHomeConfig" ALTER COLUMN "windowStyle" DROP NOT NULL,
ALTER COLUMN "doorStyle" DROP NOT NULL,
ALTER COLUMN "roofTrim" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."UserHomeDecoration" ALTER COLUMN "size" DROP NOT NULL;

-- CreateTable
CREATE TABLE "public"."SiteNews" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "content" TEXT,
    "url" TEXT,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "type" "public"."NewsType" NOT NULL DEFAULT 'announcement',
    "priority" "public"."NewsPriority" NOT NULL DEFAULT 'medium',
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "SiteNews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SiteNews_publishedAt_idx" ON "public"."SiteNews"("publishedAt");

-- CreateIndex
CREATE INDEX "SiteNews_type_idx" ON "public"."SiteNews"("type");

-- CreateIndex
CREATE INDEX "SiteNews_priority_idx" ON "public"."SiteNews"("priority");

-- CreateIndex
CREATE INDEX "SiteNews_isPublished_idx" ON "public"."SiteNews"("isPublished");

-- CreateIndex
CREATE INDEX "SiteNews_createdBy_idx" ON "public"."SiteNews"("createdBy");

-- CreateIndex
CREATE INDEX "CustomPage_isLandingPage_idx" ON "public"."CustomPage"("isLandingPage");

-- AddForeignKey
ALTER TABLE "public"."SiteNews" ADD CONSTRAINT "SiteNews_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
