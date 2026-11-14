-- Add targetTeam (TECH vs MANAGEMENT) to FeedbackItem and create Notification + NotificationRule tables

DO $$ BEGIN
    CREATE TYPE "FeedbackTargetTeam" AS ENUM ('TECH', 'MANAGEMENT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "FeedbackItem"
    ADD COLUMN IF NOT EXISTS "targetTeam" "FeedbackTargetTeam" NOT NULL DEFAULT 'TECH';

UPDATE "FeedbackItem"
SET "targetTeam" = 'MANAGEMENT'
WHERE "scope" IN ('LABORATORIO', 'EQUIPE')
  AND ("assignedArea" IS NULL OR "assignedArea" NOT IN ('Sistema / Dev', 'Site Institucional', 'Software'));

CREATE INDEX IF NOT EXISTS "FeedbackItem_targetTeam_status_idx"
    ON "FeedbackItem"("targetTeam", "status");

CREATE TABLE IF NOT EXISTS "Notification" (
    "id" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "link" TEXT,
    "readAt" TIMESTAMPTZ(3),
    "actorName" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Notification_recipientId_readAt_createdAt_idx"
    ON "Notification"("recipientId", "readAt", "createdAt");

CREATE INDEX IF NOT EXISTS "Notification_recipientId_createdAt_idx"
    ON "Notification"("recipientId", "createdAt");

CREATE INDEX IF NOT EXISTS "Notification_category_createdAt_idx"
    ON "Notification"("category", "createdAt");

DO $$ BEGIN
    ALTER TABLE "Notification"
        ADD CONSTRAINT "Notification_recipientId_fkey"
        FOREIGN KEY ("recipientId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "NotificationRule" (
    "category" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "sendToManagement" BOOLEAN NOT NULL DEFAULT false,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationRule_pkey" PRIMARY KEY ("category")
);

ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "NotificationRule" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "Notification" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE "NotificationRule" FROM PUBLIC, anon, authenticated;
