-- CreateEnum
CREATE TYPE "public"."ConsentType" AS ENUM ('ESSENTIAL', 'ANALYTICS', 'MARKETING', 'PREFERENCES');

-- CreateEnum
CREATE TYPE "public"."ConsentAction" AS ENUM ('GRANTED', 'WITHDRAWN', 'UPDATED', 'EXPIRED');

-- CreateTable
CREATE TABLE "public"."UserConsent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "public"."ConsentType" NOT NULL,
    "granted" BOOLEAN NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "withdrawnAt" TIMESTAMP(3),
    "version" TEXT NOT NULL DEFAULT '1.0',

    CONSTRAINT "UserConsent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ConsentLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "public"."ConsentType" NOT NULL,
    "action" "public"."ConsentAction" NOT NULL,
    "granted" BOOLEAN,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "version" TEXT NOT NULL DEFAULT '1.0',

    CONSTRAINT "ConsentLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserConsent_userId_type_idx" ON "public"."UserConsent"("userId", "type");

-- CreateIndex
CREATE INDEX "UserConsent_granted_timestamp_idx" ON "public"."UserConsent"("granted", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "UserConsent_userId_type_key" ON "public"."UserConsent"("userId", "type");

-- CreateIndex
CREATE INDEX "ConsentLog_userId_timestamp_idx" ON "public"."ConsentLog"("userId", "timestamp");

-- CreateIndex
CREATE INDEX "ConsentLog_type_action_idx" ON "public"."ConsentLog"("type", "action");

-- AddForeignKey
ALTER TABLE "public"."UserConsent" ADD CONSTRAINT "UserConsent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ConsentLog" ADD CONSTRAINT "ConsentLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;