CREATE TABLE "AttendanceJustification" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "memberId" TEXT NOT NULL REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "weekStartsOn" DATE NOT NULL,
  "reason" VARCHAR(40) NOT NULL,
  "details" TEXT NOT NULL,
  "status" VARCHAR(16) NOT NULL DEFAULT 'PENDING',
  "reviewedById" TEXT REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "reviewerName" VARCHAR(200),
  "reviewNote" TEXT,
  "reviewedAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AttendanceJustification_status_check" CHECK ("status" IN ('PENDING', 'APPROVED', 'REJECTED')),
  CONSTRAINT "AttendanceJustification_monday_check" CHECK (EXTRACT(ISODOW FROM "weekStartsOn") = 1)
);
CREATE INDEX "AttendanceJustification_memberId_weekStartsOn_idx" ON "AttendanceJustification"("memberId", "weekStartsOn");
CREATE INDEX "AttendanceJustification_status_createdAt_id_idx" ON "AttendanceJustification"("status", "createdAt", "id");
-- A rejected request may be appealed again; pending/approved requests cannot be duplicated.
CREATE UNIQUE INDEX "AttendanceJustification_active_week_key" ON "AttendanceJustification"("memberId", "weekStartsOn") WHERE "status" IN ('PENDING', 'APPROVED');
ALTER TABLE "AttendanceJustification" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "AttendanceJustification" FROM PUBLIC;
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN REVOKE ALL ON TABLE "AttendanceJustification" FROM anon; END IF;
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN REVOKE ALL ON TABLE "AttendanceJustification" FROM authenticated; END IF;
END $$;
