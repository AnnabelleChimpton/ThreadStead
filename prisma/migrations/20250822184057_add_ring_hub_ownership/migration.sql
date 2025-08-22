-- CreateTable
CREATE TABLE "RingHubOwnership" (
    "id" TEXT NOT NULL,
    "ringSlug" TEXT NOT NULL,
    "ringUri" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "serverDID" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RingHubOwnership_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RingHubOwnership_ringSlug_key" ON "RingHubOwnership"("ringSlug");

-- CreateIndex
CREATE INDEX "RingHubOwnership_ownerUserId_idx" ON "RingHubOwnership"("ownerUserId");

-- CreateIndex
CREATE INDEX "RingHubOwnership_serverDID_idx" ON "RingHubOwnership"("serverDID");

-- AddForeignKey
ALTER TABLE "RingHubOwnership" ADD CONSTRAINT "RingHubOwnership_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
