-- AlterTable
ALTER TABLE "public"."CustomPage" ADD COLUMN     "hideNavbar" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isHomepage" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "CustomPage_isHomepage_idx" ON "public"."CustomPage"("isHomepage");
