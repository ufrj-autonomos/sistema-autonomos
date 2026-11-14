-- Idempotent migration for EmailAutomationRule and EmailDispatchLog.htmlBody.

ALTER TABLE "EmailDispatchLog"
  ADD COLUMN IF NOT EXISTS "htmlBody" TEXT;

CREATE TABLE IF NOT EXISTS "EmailAutomationRule" (
  "situationKey" TEXT PRIMARY KEY,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "cooldownDays" INTEGER NOT NULL DEFAULT 7,
  "lastTriggeredAt" TIMESTAMPTZ(3),
  "lastSentCount" INTEGER NOT NULL DEFAULT 0,
  "updatedById" TEXT,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE "EmailAutomationRule" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "EmailAutomationRule" FROM PUBLIC;

DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_roles WHERE rolname='anon') THEN
    REVOKE ALL ON TABLE "EmailAutomationRule" FROM anon;
  END IF;
  IF EXISTS (SELECT FROM pg_roles WHERE rolname='authenticated') THEN
    REVOKE ALL ON TABLE "EmailAutomationRule" FROM authenticated;
  END IF;
END $$;
