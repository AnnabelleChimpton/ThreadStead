-- CreateEnum
CREATE TYPE "public"."BetaSignupStatus" AS ENUM ('started', 'completed', 'abandoned');

-- CreateTable
CREATE TABLE "public"."BetaLandingPage" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "content" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPaused" BOOLEAN NOT NULL DEFAULT false,
    "signupLimit" INTEGER NOT NULL DEFAULT 50,
    "signupCount" INTEGER NOT NULL DEFAULT 0,
    "limitReached" BOOLEAN NOT NULL DEFAULT false,
    "endedAt" TIMESTAMP(3),
    "endedBy" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BetaLandingPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BetaLandingSignup" (
    "id" TEXT NOT NULL,
    "landingPageId" TEXT NOT NULL,
    "userId" TEXT,
    "betaCode" TEXT,
    "signupStartedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "signupCompletedAt" TIMESTAMP(3),
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "status" "public"."BetaSignupStatus" NOT NULL DEFAULT 'started',

    CONSTRAINT "BetaLandingSignup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."IpSignupTracking" (
    "id" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "signupAttempts" INTEGER NOT NULL DEFAULT 1,
    "successfulSignups" INTEGER NOT NULL DEFAULT 0,
    "firstAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isBlocked" BOOLEAN NOT NULL DEFAULT false,
    "blockedAt" TIMESTAMP(3),
    "blockedBy" TEXT,
    "blockedReason" TEXT,
    "autoBlocked" BOOLEAN NOT NULL DEFAULT false,
    "unblockAt" TIMESTAMP(3),

    CONSTRAINT "IpSignupTracking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SignupAttempt" (
    "id" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "userAgent" TEXT,
    "landingPageId" TEXT,
    "betaCode" TEXT,
    "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "success" BOOLEAN NOT NULL DEFAULT false,
    "failureReason" TEXT,
    "userId" TEXT,
    "suspicious" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "SignupAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BetaInviteShare" (
    "id" TEXT NOT NULL,
    "codeId" TEXT NOT NULL,
    "sharedBy" TEXT NOT NULL,
    "shareMethod" TEXT NOT NULL,
    "sharedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "referrer" TEXT,
    "platform" TEXT,

    CONSTRAINT "BetaInviteShare_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BetaLandingPage_slug_key" ON "public"."BetaLandingPage"("slug");

-- CreateIndex
CREATE INDEX "BetaLandingPage_slug_idx" ON "public"."BetaLandingPage"("slug");

-- CreateIndex
CREATE INDEX "BetaLandingPage_isActive_isPaused_idx" ON "public"."BetaLandingPage"("isActive", "isPaused");

-- CreateIndex
CREATE INDEX "BetaLandingPage_createdBy_idx" ON "public"."BetaLandingPage"("createdBy");

-- CreateIndex
CREATE INDEX "BetaLandingPage_limitReached_idx" ON "public"."BetaLandingPage"("limitReached");

-- CreateIndex
CREATE INDEX "BetaLandingSignup_landingPageId_status_idx" ON "public"."BetaLandingSignup"("landingPageId", "status");

-- CreateIndex
CREATE INDEX "BetaLandingSignup_userId_idx" ON "public"."BetaLandingSignup"("userId");

-- CreateIndex
CREATE INDEX "BetaLandingSignup_ipAddress_signupStartedAt_idx" ON "public"."BetaLandingSignup"("ipAddress", "signupStartedAt");

-- CreateIndex
CREATE UNIQUE INDEX "IpSignupTracking_ipAddress_key" ON "public"."IpSignupTracking"("ipAddress");

-- CreateIndex
CREATE INDEX "IpSignupTracking_ipAddress_idx" ON "public"."IpSignupTracking"("ipAddress");

-- CreateIndex
CREATE INDEX "IpSignupTracking_isBlocked_idx" ON "public"."IpSignupTracking"("isBlocked");

-- CreateIndex
CREATE INDEX "IpSignupTracking_lastAttemptAt_idx" ON "public"."IpSignupTracking"("lastAttemptAt");

-- CreateIndex
CREATE INDEX "IpSignupTracking_autoBlocked_unblockAt_idx" ON "public"."IpSignupTracking"("autoBlocked", "unblockAt");

-- CreateIndex
CREATE INDEX "SignupAttempt_ipAddress_attemptedAt_idx" ON "public"."SignupAttempt"("ipAddress", "attemptedAt");

-- CreateIndex
CREATE INDEX "SignupAttempt_landingPageId_attemptedAt_idx" ON "public"."SignupAttempt"("landingPageId", "attemptedAt");

-- CreateIndex
CREATE INDEX "SignupAttempt_success_idx" ON "public"."SignupAttempt"("success");

-- CreateIndex
CREATE INDEX "SignupAttempt_suspicious_idx" ON "public"."SignupAttempt"("suspicious");

-- CreateIndex
CREATE INDEX "BetaInviteShare_codeId_sharedAt_idx" ON "public"."BetaInviteShare"("codeId", "sharedAt");

-- CreateIndex
CREATE INDEX "BetaInviteShare_sharedBy_sharedAt_idx" ON "public"."BetaInviteShare"("sharedBy", "sharedAt");

-- CreateIndex
CREATE INDEX "BetaInviteShare_shareMethod_idx" ON "public"."BetaInviteShare"("shareMethod");

-- AddForeignKey
ALTER TABLE "public"."BetaLandingPage" ADD CONSTRAINT "BetaLandingPage_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BetaLandingPage" ADD CONSTRAINT "BetaLandingPage_endedBy_fkey" FOREIGN KEY ("endedBy") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BetaLandingSignup" ADD CONSTRAINT "BetaLandingSignup_landingPageId_fkey" FOREIGN KEY ("landingPageId") REFERENCES "public"."BetaLandingPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BetaLandingSignup" ADD CONSTRAINT "BetaLandingSignup_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."IpSignupTracking" ADD CONSTRAINT "IpSignupTracking_blockedBy_fkey" FOREIGN KEY ("blockedBy") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SignupAttempt" ADD CONSTRAINT "SignupAttempt_landingPageId_fkey" FOREIGN KEY ("landingPageId") REFERENCES "public"."BetaLandingPage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SignupAttempt" ADD CONSTRAINT "SignupAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BetaInviteShare" ADD CONSTRAINT "BetaInviteShare_codeId_fkey" FOREIGN KEY ("codeId") REFERENCES "public"."BetaInviteCode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BetaInviteShare" ADD CONSTRAINT "BetaInviteShare_sharedBy_fkey" FOREIGN KEY ("sharedBy") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
