-- Idempotent migration for AttendanceVacationWeek, AttendanceAlertLog & AttendanceSettings.autoWarningStartsOn.

ALTER TABLE "AttendanceSettings"
  ADD COLUMN IF NOT EXISTS "autoWarningStartsOn" DATE;

CREATE TABLE IF NOT EXISTS "AttendanceVacationWeek" (
  "id" TEXT PRIMARY KEY,
  "weekStartsOn" DATE NOT NULL UNIQUE,
  "label" TEXT,
  "createdById" TEXT REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "AttendanceAlertLog" (
  "id" TEXT PRIMARY KEY,
  "kind" TEXT NOT NULL,
  "periodKey" TEXT NOT NULL,
  "memberId" TEXT NOT NULL REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "warningId" TEXT,
  "sentAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("kind", "periodKey", "memberId")
);

CREATE INDEX IF NOT EXISTS "AttendanceAlertLog_memberId_sentAt_idx"
  ON "AttendanceAlertLog"("memberId", "sentAt");

ALTER TABLE "AttendanceVacationWeek" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AttendanceAlertLog" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "AttendanceVacationWeek" FROM PUBLIC;
REVOKE ALL ON TABLE "AttendanceAlertLog" FROM PUBLIC;

DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_roles WHERE rolname='anon') THEN
    REVOKE ALL ON TABLE "AttendanceVacationWeek" FROM anon;
    REVOKE ALL ON TABLE "AttendanceAlertLog" FROM anon;
  END IF;
  IF EXISTS (SELECT FROM pg_roles WHERE rolname='authenticated') THEN
    REVOKE ALL ON TABLE "AttendanceVacationWeek" FROM authenticated;
    REVOKE ALL ON TABLE "AttendanceAlertLog" FROM authenticated;
  END IF;
END $$;
