-- Add cancelledAt to project_invites
ALTER TABLE "project_invites" ADD COLUMN "cancelledAt" TIMESTAMP(3);

-- Add new ActivityEventType values
ALTER TYPE "ActivityEventType" ADD VALUE IF NOT EXISTS 'INVITATION_CANCELLED';
ALTER TYPE "ActivityEventType" ADD VALUE IF NOT EXISTS 'INVITATION_RESENT';
