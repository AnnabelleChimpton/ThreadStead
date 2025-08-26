-- AlterTable
ALTER TABLE "public"."CustomPage" ADD COLUMN     "navDropdown" TEXT;

-- CreateIndex
CREATE INDEX "CustomPage_navDropdown_idx" ON "public"."CustomPage"("navDropdown");
