-- CreateTable
CREATE TABLE "public"."UserHomeConfig" (
    "userId" TEXT NOT NULL,
    "houseTemplate" TEXT NOT NULL DEFAULT 'cottage_v1',
    "palette" TEXT NOT NULL DEFAULT 'thread_sage',
    "bookSkin" TEXT DEFAULT 'linen_v1',
    "seasonalOptIn" BOOLEAN NOT NULL DEFAULT false,
    "preferPixelHome" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserHomeConfig_pkey" PRIMARY KEY ("userId")
);

-- AddForeignKey
ALTER TABLE "public"."UserHomeConfig" ADD CONSTRAINT "UserHomeConfig_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
