-- Existing installations created meetings before migration history covered them.
-- Create only missing structures; preserve every meeting and attendance already stored.
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'COORDINATOR';
ALTER TABLE "Member" ADD COLUMN IF NOT EXISTS "teamId" INTEGER;
DO $$ BEGIN
  CREATE TYPE "MeetingAttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'JUSTIFIED', 'LATE', 'NO_MEETING', 'NOT_A_MEMBER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE TABLE IF NOT EXISTS "Meeting" (
  "id" TEXT PRIMARY KEY, "title" TEXT NOT NULL, "date" DATE NOT NULL,
  "area" TEXT NOT NULL, "teamId" INTEGER, "period" TEXT NOT NULL DEFAULT '26.2',
  "description" TEXT, "createdById" TEXT REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMPTZ(3) NOT NULL
);
CREATE INDEX IF NOT EXISTS "Meeting_area_teamId_idx" ON "Meeting"("area", "teamId");
CREATE INDEX IF NOT EXISTS "Meeting_period_idx" ON "Meeting"("period");
CREATE INDEX IF NOT EXISTS "Meeting_date_idx" ON "Meeting"("date");
CREATE TABLE IF NOT EXISTS "MeetingAttendance" (
  "id" TEXT PRIMARY KEY, "meetingId" TEXT NOT NULL REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "memberId" TEXT NOT NULL REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "status" "MeetingAttendanceStatus" NOT NULL DEFAULT 'NOT_A_MEMBER', "notes" TEXT,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMPTZ(3) NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "MeetingAttendance_meetingId_memberId_key" ON "MeetingAttendance"("meetingId", "memberId");
CREATE INDEX IF NOT EXISTS "MeetingAttendance_memberId_idx" ON "MeetingAttendance"("memberId");
CREATE INDEX IF NOT EXISTS "MeetingAttendance_meetingId_idx" ON "MeetingAttendance"("meetingId");
ALTER TABLE "MeetingAttendance" ALTER COLUMN "status" SET DEFAULT 'NOT_A_MEMBER';
ALTER TABLE "Meeting" ADD COLUMN IF NOT EXISTS "minutes" TEXT,
  ADD COLUMN IF NOT EXISTS "minutesSummary" TEXT,
  ADD COLUMN IF NOT EXISTS "minutesSummarySource" VARCHAR(16),
  ADD COLUMN IF NOT EXISTS "minutesUpdatedAt" TIMESTAMPTZ(3);
ALTER TABLE "Meeting" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MeetingAttendance" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "Meeting", "MeetingAttendance" FROM PUBLIC;
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_roles WHERE rolname='anon') THEN REVOKE ALL ON TABLE "Meeting", "MeetingAttendance" FROM anon; END IF;
  IF EXISTS (SELECT FROM pg_roles WHERE rolname='authenticated') THEN REVOKE ALL ON TABLE "Meeting", "MeetingAttendance" FROM authenticated; END IF;
END $$;
