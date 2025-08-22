-- Fix for RingHubOwnership migration issue
-- This creates the table if it doesn't exist

CREATE TABLE IF NOT EXISTS "RingHubOwnership" (
    "id" TEXT NOT NULL,
    "ringSlug" TEXT NOT NULL,
    "ringUri" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "serverDID" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RingHubOwnership_pkey" PRIMARY KEY ("id")
);

-- Create indexes if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'RingHubOwnership_ringSlug_key') THEN
        CREATE UNIQUE INDEX "RingHubOwnership_ringSlug_key" ON "RingHubOwnership"("ringSlug");
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'RingHubOwnership_ownerUserId_idx') THEN
        CREATE INDEX "RingHubOwnership_ownerUserId_idx" ON "RingHubOwnership"("ownerUserId");
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'RingHubOwnership_serverDID_idx') THEN
        CREATE INDEX "RingHubOwnership_serverDID_idx" ON "RingHubOwnership"("serverDID");
    END IF;
END $$;

-- Add foreign key if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'RingHubOwnership_ownerUserId_fkey'
    ) THEN
        ALTER TABLE "RingHubOwnership" ADD CONSTRAINT "RingHubOwnership_ownerUserId_fkey" 
            FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;