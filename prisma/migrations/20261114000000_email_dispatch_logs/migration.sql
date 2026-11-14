-- Idempotent migration for EmailDispatchLog.

CREATE TABLE IF NOT EXISTS "EmailDispatchLog" (
  "id" TEXT PRIMARY KEY,
  "category" TEXT NOT NULL,
  "recipientName" TEXT,
  "recipientEmail" TEXT NOT NULL,
  "memberId" TEXT REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "subject" TEXT NOT NULL,
  "previewText" TEXT,
  "status" TEXT NOT NULL DEFAULT 'SENT',
  "errorMessage" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "EmailDispatchLog_createdAt_idx"
  ON "EmailDispatchLog"("createdAt");

CREATE INDEX IF NOT EXISTS "EmailDispatchLog_category_createdAt_idx"
  ON "EmailDispatchLog"("category", "createdAt");

CREATE INDEX IF NOT EXISTS "EmailDispatchLog_recipientEmail_createdAt_idx"
  ON "EmailDispatchLog"("recipientEmail", "createdAt");

CREATE INDEX IF NOT EXISTS "EmailDispatchLog_status_createdAt_idx"
  ON "EmailDispatchLog"("status", "createdAt");

ALTER TABLE "EmailDispatchLog" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "EmailDispatchLog" FROM PUBLIC;

DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_roles WHERE rolname='anon') THEN
    REVOKE ALL ON TABLE "EmailDispatchLog" FROM anon;
  END IF;
  IF EXISTS (SELECT FROM pg_roles WHERE rolname='authenticated') THEN
    REVOKE ALL ON TABLE "EmailDispatchLog" FROM authenticated;
  END IF;
END $$;
