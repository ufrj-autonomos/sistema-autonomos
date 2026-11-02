-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('OPEN', 'CLOSED', 'REVIEW', 'VOID');

-- CreateEnum
CREATE TYPE "AttendancePunchType" AS ENUM ('IN', 'OUT');

-- CreateTable
CREATE TABLE "AttendanceSettings" (
    "id" TEXT NOT NULL DEFAULT 'lab',
    "qrCode" TEXT NOT NULL,
    "weeklyTargetSeconds" INTEGER NOT NULL DEFAULT 7200,
    "maxSessionSeconds" INTEGER NOT NULL DEFAULT 43200,
    "startedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendanceSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendancePeriod" (
    "id" TEXT NOT NULL,
    "memberId" INTEGER NOT NULL,
    "startsOn" DATE NOT NULL,
    "endsOn" DATE,
    "targetSeconds" INTEGER NOT NULL DEFAULT 7200,

    CONSTRAINT "AttendancePeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceVisit" (
    "id" TEXT NOT NULL,
    "memberId" INTEGER NOT NULL,
    "checkedInAt" TIMESTAMPTZ(3) NOT NULL,
    "checkedOutAt" TIMESTAMPTZ(3),
    "status" "AttendanceStatus" NOT NULL DEFAULT 'OPEN',
    "source" TEXT NOT NULL DEFAULT 'QR',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "AttendanceVisit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendancePunch" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "memberId" INTEGER NOT NULL,
    "visitId" TEXT NOT NULL,
    "type" "AttendancePunchType" NOT NULL,
    "registeredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendancePunch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceAudit" (
    "id" TEXT NOT NULL,
    "memberId" INTEGER NOT NULL,
    "visitId" TEXT,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendanceAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceSettings_qrCode_key" ON "AttendanceSettings"("qrCode");

-- CreateIndex
CREATE INDEX "AttendancePeriod_memberId_endsOn_idx" ON "AttendancePeriod"("memberId", "endsOn");

-- CreateIndex
CREATE UNIQUE INDEX "AttendancePeriod_memberId_startsOn_key" ON "AttendancePeriod"("memberId", "startsOn");

-- CreateIndex
CREATE INDEX "AttendanceVisit_memberId_checkedInAt_idx" ON "AttendanceVisit"("memberId", "checkedInAt");

-- CreateIndex
CREATE INDEX "AttendanceVisit_status_checkedInAt_idx" ON "AttendanceVisit"("status", "checkedInAt");

-- CreateIndex
CREATE UNIQUE INDEX "AttendancePunch_requestId_key" ON "AttendancePunch"("requestId");

-- CreateIndex
CREATE INDEX "AttendancePunch_memberId_registeredAt_idx" ON "AttendancePunch"("memberId", "registeredAt");

-- CreateIndex
CREATE INDEX "AttendanceAudit_memberId_createdAt_idx" ON "AttendanceAudit"("memberId", "createdAt");

-- AddForeignKey
ALTER TABLE "AttendancePeriod" ADD CONSTRAINT "AttendancePeriod_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceVisit" ADD CONSTRAINT "AttendanceVisit_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendancePunch" ADD CONSTRAINT "AttendancePunch_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendancePunch" ADD CONSTRAINT "AttendancePunch_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "AttendanceVisit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceAudit" ADD CONSTRAINT "AttendanceAudit_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceAudit" ADD CONSTRAINT "AttendanceAudit_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "AttendanceVisit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceAudit" ADD CONSTRAINT "AttendanceAudit_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- One active visit/requirement per member. Entries are half-open time intervals.
CREATE UNIQUE INDEX "AttendanceVisit_one_open_per_member" ON "AttendanceVisit"("memberId") WHERE "status" = 'OPEN';
CREATE UNIQUE INDEX "AttendancePeriod_one_open_per_member" ON "AttendancePeriod"("memberId") WHERE "endsOn" IS NULL;
ALTER TABLE "AttendanceVisit" ADD CONSTRAINT "AttendanceVisit_valid_range" CHECK ("checkedOutAt" IS NULL OR "checkedOutAt" > "checkedInAt");
ALTER TABLE "AttendanceVisit" ADD CONSTRAINT "AttendanceVisit_closed_has_exit" CHECK ("status" <> 'CLOSED' OR "checkedOutAt" IS NOT NULL);
ALTER TABLE "AttendancePeriod" ADD CONSTRAINT "AttendancePeriod_valid_range" CHECK ("endsOn" IS NULL OR "endsOn" >= "startsOn");
ALTER TABLE "AttendancePeriod" ADD CONSTRAINT "AttendancePeriod_positive_target" CHECK ("targetSeconds" > 0);

INSERT INTO "AttendanceSettings" ("id", "qrCode", "weeklyTargetSeconds", "maxSessionSeconds")
VALUES ('lab', replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''), 7200, 43200);

-- Start from this week's Monday. There are no retroactive absences and no sheet import.
INSERT INTO "Member" ("userId", "name", "role", "area", "active")
SELECT u."id", u."name", 'Integrante', 'Não informada', true FROM "User" u
WHERE u."status" = 'APPROVED' AND NOT EXISTS (SELECT 1 FROM "Member" m WHERE m."userId" = u."id");
INSERT INTO "AttendancePeriod" ("id", "memberId", "startsOn", "targetSeconds")
SELECT gen_random_uuid()::text, m."id", date_trunc('week', NOW() AT TIME ZONE 'America/Sao_Paulo')::date, 7200
FROM "Member" m JOIN "User" u ON u."id" = m."userId" WHERE m."active" AND u."status" = 'APPROVED';

DO $$
DECLARE table_name TEXT; api_role TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['AttendanceSettings','AttendancePeriod','AttendanceVisit','AttendancePunch','AttendanceAudit'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM PUBLIC', table_name);
    FOR api_role IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon','authenticated') LOOP
      EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM %I', table_name, api_role);
    END LOOP;
  END LOOP;
END $$;
