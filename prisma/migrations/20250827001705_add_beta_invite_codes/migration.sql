-- CreateTable
CREATE TABLE "public"."BetaInviteCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "generatedBy" TEXT NOT NULL,
    "usedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usedAt" TIMESTAMP(3),

    CONSTRAINT "BetaInviteCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BetaInviteCode_code_key" ON "public"."BetaInviteCode"("code");

-- CreateIndex
CREATE INDEX "BetaInviteCode_generatedBy_idx" ON "public"."BetaInviteCode"("generatedBy");

-- CreateIndex
CREATE INDEX "BetaInviteCode_code_idx" ON "public"."BetaInviteCode"("code");

-- AddForeignKey
ALTER TABLE "public"."BetaInviteCode" ADD CONSTRAINT "BetaInviteCode_generatedBy_fkey" FOREIGN KEY ("generatedBy") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BetaInviteCode" ADD CONSTRAINT "BetaInviteCode_usedBy_fkey" FOREIGN KEY ("usedBy") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
