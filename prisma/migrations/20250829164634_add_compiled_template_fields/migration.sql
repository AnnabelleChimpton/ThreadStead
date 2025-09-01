-- AlterTable
ALTER TABLE "public"."Profile" ADD COLUMN     "compiledTemplate" JSONB,
ADD COLUMN     "templateCompiledAt" TIMESTAMP(3),
ADD COLUMN     "templateIslands" JSONB;
