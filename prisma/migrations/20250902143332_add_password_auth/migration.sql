-- CreateEnum
CREATE TYPE "public"."AuthMethod" AS ENUM ('SEED_PHRASE', 'PASSWORD');

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "authMethod" "public"."AuthMethod" NOT NULL DEFAULT 'SEED_PHRASE',
ADD COLUMN     "encryptedSeedPhrase" TEXT,
ADD COLUMN     "passwordHash" TEXT;
