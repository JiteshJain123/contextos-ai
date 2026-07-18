-- Add clerkId to users table for Clerk authentication
ALTER TABLE "users" ADD COLUMN "clerkId" TEXT NOT NULL DEFAULT '';

-- Remove the default now that backfill is done (column stays NOT NULL)
ALTER TABLE "users" ALTER COLUMN "clerkId" DROP DEFAULT;

-- Unique constraint
ALTER TABLE "users" ADD CONSTRAINT "users_clerkId_key" UNIQUE ("clerkId");

-- Index for fast lookups by clerkId
CREATE INDEX "users_clerkId_idx" ON "users"("clerkId");
