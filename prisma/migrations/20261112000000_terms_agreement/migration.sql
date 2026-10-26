-- A resident agreeing to the house rules, terms and privacy policy, recorded
-- when the account is made (signup audit #6 follow-up). Deploy before the
-- code: /api/auth/verify writes a row with every new account.

-- CreateTable
CREATE TABLE "public"."TermsAgreement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "agreedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "version" TEXT NOT NULL,

    CONSTRAINT "TermsAgreement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TermsAgreement_userId_agreedAt_idx" ON "public"."TermsAgreement"("userId", "agreedAt");

-- AddForeignKey
ALTER TABLE "public"."TermsAgreement" ADD CONSTRAINT "TermsAgreement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

