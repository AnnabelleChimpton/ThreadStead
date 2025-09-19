-- Add auto-validation fields to IndexedSite for Phase 2 architecture
-- Separates human vs crawler validation queues

-- Add auto-validation tracking fields
ALTER TABLE "IndexedSite" ADD COLUMN "autoValidated" BOOLEAN;
ALTER TABLE "IndexedSite" ADD COLUMN "autoValidatedAt" TIMESTAMP(3);
ALTER TABLE "IndexedSite" ADD COLUMN "autoValidationScore" INTEGER;

-- Add comments for documentation
COMMENT ON COLUMN "IndexedSite"."autoValidated" IS 'Was this site auto-validated by the system (vs community validated)?';
COMMENT ON COLUMN "IndexedSite"."autoValidatedAt" IS 'Timestamp when auto-validation occurred';
COMMENT ON COLUMN "IndexedSite"."autoValidationScore" IS 'Final quality score used for auto-validation decision';

-- Create index for auto-validation queries
CREATE INDEX "IndexedSite_autoValidated_discoveryMethod_idx" ON "IndexedSite"("autoValidated", "discoveryMethod");
CREATE INDEX "IndexedSite_autoValidationScore_idx" ON "IndexedSite"("autoValidationScore") WHERE "autoValidationScore" IS NOT NULL;