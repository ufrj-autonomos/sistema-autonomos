-- Unified Member Architecture Migration
-- Unifies User, Member, and MemberDetails into a single Member table,
-- moves password hashes into MemberCredential (linked by memberId),
-- adds AuthChallenge and MemberProfileChange, and removes duplicate/demo tables.

-- 1. Rename legacy Role enum values if present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'Role' AND e.enumlabel = 'STUDENT'
  ) THEN
    ALTER TYPE "Role" RENAME VALUE 'STUDENT' TO 'TRAINEE';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'Role' AND e.enumlabel = 'INSTRUCTOR'
  ) THEN
    ALTER TYPE "Role" RENAME VALUE 'INSTRUCTOR' TO 'MANAGEMENT';
  END IF;
END $$;

-- 2. Create ChangeRequestStatus enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ChangeRequestStatus') THEN
    CREATE TYPE "ChangeRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
  END IF;
END $$;

-- 3. Remove demo/discarded accounts before migrating
DELETE FROM "User"
WHERE "email" IN (
  'gvassaocosta@gmail.com',
  'admin@autonomos.ufrj.br',
  'membro@autonomos.ufrj.br',
  'aluno@autonomos.ufrj.br'
);

-- 4. Create unified Member table (initially as Member_v2)
CREATE TABLE "Member_v2" (
    "id" TEXT NOT NULL,
    "institutionalMemberId" INTEGER,
    "email" TEXT,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'TRAINEE',
    "status" "AccountStatus" NOT NULL DEFAULT 'PENDING',
    "avatar" TEXT,
    "area" TEXT NOT NULL DEFAULT 'Não informada',
    "cpf" TEXT,
    "phone" TEXT,
    "dre" TEXT,
    "birthDate" DATE,
    "course" TEXT,
    "academicPeriod" TEXT,
    "emergencyContactName" TEXT,
    "emergencyContactPhone" TEXT,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "profileCompletedAt" TIMESTAMPTZ(3),
    "memberDirectoryPreferences" JSONB,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Member_v2_pkey" PRIMARY KEY ("id")
);

-- 5. Create MemberCredential, AuthChallenge, and MemberProfileChange
CREATE TABLE "MemberCredential" (
    "memberId" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "passwordChangedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastLoginAt" TIMESTAMPTZ(3),

    CONSTRAINT "MemberCredential_pkey" PRIMARY KEY ("memberId")
);

CREATE TABLE "AuthChallenge" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "purpose" TEXT NOT NULL DEFAULT 'PASSWORD_RESET',
    "codeHash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "consumedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthChallenge_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MemberProfileChange" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "institutionalMemberId" INTEGER NOT NULL,
    "changes" JSONB NOT NULL,
    "status" "ChangeRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMPTZ(3),
    "reviewNote" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MemberProfileChange_pkey" PRIMARY KEY ("id")
);

-- 6. Migrate existing valid Users + their linked Member/MemberDetails into Member_v2
INSERT INTO "Member_v2" (
    "id",
    "institutionalMemberId",
    "email",
    "name",
    "role",
    "status",
    "avatar",
    "area",
    "cpf",
    "phone",
    "dre",
    "birthDate",
    "course",
    "academicPeriod",
    "emergencyContactName",
    "emergencyContactPhone",
    "notes",
    "active",
    "profileCompletedAt",
    "memberDirectoryPreferences",
    "createdAt",
    "updatedAt"
)
SELECT
    u."id",
    CASE
      WHEN lower(u."email") = 'gabrielgaspar.20251@poli.ufrj.br' THEN 77
      WHEN lower(u."email") = 'henriqueprfragoso.20231@poli.ufrj.br' THEN 74
      WHEN lower(u."email") = 'ufrjautonomos@gmail.com' THEN 108
      ELSE md."institutionalMemberId"
    END AS "institutionalMemberId",
    lower(trim(u."email")),
    COALESCE(md."name", u."name"),
    u."role",
    u."status",
    u."avatar",
    COALESCE(md."area", CASE WHEN lower(u."email") IN ('gabrielgaspar.20251@poli.ufrj.br', 'henriqueprfragoso.20231@poli.ufrj.br', 'ufrjautonomos@gmail.com') THEN 'Gestão' ELSE m."area" END, 'Não informada'),
    md."cpf",
    md."phone",
    md."dre",
    md."birthDate",
    COALESCE(md."course", m."course"),
    md."academicPeriod",
    md."emergencyContactName",
    md."emergencyContactPhone",
    md."notes",
    COALESCE(m."active", true),
    CASE WHEN u."status" = 'APPROVED' THEN CURRENT_TIMESTAMP ELSE NULL END,
    u."memberDirectoryPreferences",
    u."createdAt",
    u."updatedAt"
FROM "User" u
LEFT JOIN "Member" m ON m."userId" = u."id"
LEFT JOIN "MemberDetails" md ON md."memberId" = m."id";

-- Also migrate any standalone MemberDetails not linked to a User
INSERT INTO "Member_v2" (
    "id",
    "institutionalMemberId",
    "email",
    "name",
    "role",
    "status",
    "area",
    "cpf",
    "phone",
    "dre",
    "birthDate",
    "course",
    "academicPeriod",
    "emergencyContactName",
    "emergencyContactPhone",
    "notes",
    "active",
    "createdAt",
    "updatedAt"
)
SELECT
    md."id",
    md."institutionalMemberId",
    lower(trim(md."email")),
    COALESCE(md."name", 'Integrante'),
    'MEMBER'::"Role",
    'APPROVED'::"AccountStatus",
    COALESCE(md."area", 'Não informada'),
    md."cpf",
    md."phone",
    md."dre",
    md."birthDate",
    md."course",
    md."academicPeriod",
    md."emergencyContactName",
    md."emergencyContactPhone",
    md."notes",
    true,
    CURRENT_TIMESTAMP,
    md."updatedAt"
FROM "MemberDetails" md
WHERE md."memberId" IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM "Member_v2" mv WHERE mv."institutionalMemberId" = md."institutionalMemberId"
  );

-- 7. Migrate password hashes into MemberCredential
INSERT INTO "MemberCredential" ("memberId", "passwordHash", "passwordChangedAt")
SELECT u."id", u."passwordHash", u."updatedAt"
FROM "User" u
INNER JOIN "Member_v2" mv ON mv."id" = u."id"
WHERE u."passwordHash" IS NOT NULL AND u."passwordHash" <> '';

-- 8. Convert Attendance tables from old integer Member.id to new string Member.id (via Member.userId)
ALTER TABLE "AttendancePeriod" DROP CONSTRAINT IF EXISTS "AttendancePeriod_memberId_fkey";
ALTER TABLE "AttendanceVisit" DROP CONSTRAINT IF EXISTS "AttendanceVisit_memberId_fkey";
ALTER TABLE "AttendancePunch" DROP CONSTRAINT IF EXISTS "AttendancePunch_memberId_fkey";
ALTER TABLE "AttendanceAudit" DROP CONSTRAINT IF EXISTS "AttendanceAudit_memberId_fkey";
ALTER TABLE "AttendanceAudit" DROP CONSTRAINT IF EXISTS "AttendanceAudit_actorId_fkey";

ALTER TABLE "AttendancePeriod" ADD COLUMN "newMemberId" TEXT;
UPDATE "AttendancePeriod" ap
SET "newMemberId" = m."userId"
FROM "Member" m
INNER JOIN "Member_v2" mv ON mv."id" = m."userId"
WHERE ap."memberId" = m."id";
DELETE FROM "AttendancePeriod" WHERE "newMemberId" IS NULL;
DROP INDEX IF EXISTS "AttendancePeriod_memberId_startsOn_key";
DROP INDEX IF EXISTS "AttendancePeriod_memberId_endsOn_idx";
ALTER TABLE "AttendancePeriod" DROP COLUMN "memberId";
ALTER TABLE "AttendancePeriod" RENAME COLUMN "newMemberId" TO "memberId";
ALTER TABLE "AttendancePeriod" ALTER COLUMN "memberId" SET NOT NULL;

ALTER TABLE "AttendanceVisit" ADD COLUMN "newMemberId" TEXT;
UPDATE "AttendanceVisit" av
SET "newMemberId" = m."userId"
FROM "Member" m
INNER JOIN "Member_v2" mv ON mv."id" = m."userId"
WHERE av."memberId" = m."id";
DELETE FROM "AttendanceVisit" WHERE "newMemberId" IS NULL;
DROP INDEX IF EXISTS "AttendanceVisit_memberId_checkedInAt_idx";
ALTER TABLE "AttendanceVisit" DROP COLUMN "memberId";
ALTER TABLE "AttendanceVisit" RENAME COLUMN "newMemberId" TO "memberId";
ALTER TABLE "AttendanceVisit" ALTER COLUMN "memberId" SET NOT NULL;

ALTER TABLE "AttendancePunch" ADD COLUMN "newMemberId" TEXT;
UPDATE "AttendancePunch" ap
SET "newMemberId" = m."userId"
FROM "Member" m
INNER JOIN "Member_v2" mv ON mv."id" = m."userId"
WHERE ap."memberId" = m."id";
DELETE FROM "AttendancePunch" WHERE "newMemberId" IS NULL;
DROP INDEX IF EXISTS "AttendancePunch_memberId_registeredAt_idx";
ALTER TABLE "AttendancePunch" DROP COLUMN "memberId";
ALTER TABLE "AttendancePunch" RENAME COLUMN "newMemberId" TO "memberId";
ALTER TABLE "AttendancePunch" ALTER COLUMN "memberId" SET NOT NULL;

ALTER TABLE "AttendanceAudit" ADD COLUMN "newMemberId" TEXT;
UPDATE "AttendanceAudit" aa
SET "newMemberId" = m."userId"
FROM "Member" m
INNER JOIN "Member_v2" mv ON mv."id" = m."userId"
WHERE aa."memberId" = m."id";
DELETE FROM "AttendanceAudit" WHERE "newMemberId" IS NULL;
UPDATE "AttendanceAudit" SET "actorId" = NULL WHERE "actorId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "Member_v2" mv WHERE mv."id" = "AttendanceAudit"."actorId");
DROP INDEX IF EXISTS "AttendanceAudit_memberId_createdAt_idx";
ALTER TABLE "AttendanceAudit" DROP COLUMN "memberId";
ALTER TABLE "AttendanceAudit" RENAME COLUMN "newMemberId" TO "memberId";
ALTER TABLE "AttendanceAudit" ALTER COLUMN "memberId" SET NOT NULL;

-- 9. Rename userId -> memberId in Session, CourseProgress, LessonProgress, ExerciseProgress
ALTER TABLE "Session" DROP CONSTRAINT IF EXISTS "Session_userId_fkey";
DELETE FROM "Session" WHERE NOT EXISTS (SELECT 1 FROM "Member_v2" mv WHERE mv."id" = "Session"."userId");
DROP INDEX IF EXISTS "Session_userId_idx";
ALTER TABLE "Session" RENAME COLUMN "userId" TO "memberId";

ALTER TABLE "CourseProgress" DROP CONSTRAINT IF EXISTS "CourseProgress_userId_fkey";
DELETE FROM "CourseProgress" WHERE NOT EXISTS (SELECT 1 FROM "Member_v2" mv WHERE mv."id" = "CourseProgress"."userId");
DROP INDEX IF EXISTS "CourseProgress_userId_courseId_key";
DROP INDEX IF EXISTS "CourseProgress_userId_idx";
ALTER TABLE "CourseProgress" RENAME COLUMN "userId" TO "memberId";

ALTER TABLE "LessonProgress" DROP CONSTRAINT IF EXISTS "LessonProgress_userId_fkey";
DELETE FROM "LessonProgress" WHERE NOT EXISTS (SELECT 1 FROM "Member_v2" mv WHERE mv."id" = "LessonProgress"."userId");
DROP INDEX IF EXISTS "LessonProgress_userId_lessonId_key";
DROP INDEX IF EXISTS "LessonProgress_userId_idx";
ALTER TABLE "LessonProgress" RENAME COLUMN "userId" TO "memberId";

ALTER TABLE "ExerciseProgress" DROP CONSTRAINT IF EXISTS "ExerciseProgress_userId_fkey";
DELETE FROM "ExerciseProgress" WHERE NOT EXISTS (SELECT 1 FROM "Member_v2" mv WHERE mv."id" = "ExerciseProgress"."userId");
DROP INDEX IF EXISTS "ExerciseProgress_userId_exerciseId_key";
DROP INDEX IF EXISTS "ExerciseProgress_userId_idx";
ALTER TABLE "ExerciseProgress" RENAME COLUMN "userId" TO "memberId";

-- 10. Drop legacy/duplicate tables and rename Member_v2 -> Member
DROP TABLE "MemberDetails";
DROP TABLE "Member";
DROP TABLE "User";
DROP TABLE "Project";
DROP TABLE "Team";

ALTER TABLE "Member_v2" RENAME TO "Member";
ALTER INDEX "Member_v2_pkey" RENAME TO "Member_pkey";

-- 11. Create all indexes and foreign keys for the unified schema
CREATE UNIQUE INDEX "Member_institutionalMemberId_key" ON "Member"("institutionalMemberId");
CREATE UNIQUE INDEX "Member_email_key" ON "Member"("email");
CREATE UNIQUE INDEX "Member_cpf_key" ON "Member"("cpf");
CREATE UNIQUE INDEX "Member_dre_key" ON "Member"("dre");
CREATE INDEX "Member_email_idx" ON "Member"("email");
CREATE INDEX "Member_institutionalMemberId_idx" ON "Member"("institutionalMemberId");

CREATE INDEX "AuthChallenge_email_purpose_idx" ON "AuthChallenge"("email", "purpose");
CREATE INDEX "AuthChallenge_memberId_idx" ON "AuthChallenge"("memberId");

CREATE INDEX "MemberProfileChange_memberId_status_idx" ON "MemberProfileChange"("memberId", "status");
CREATE INDEX "MemberProfileChange_institutionalMemberId_status_idx" ON "MemberProfileChange"("institutionalMemberId", "status");

CREATE INDEX "Session_memberId_idx" ON "Session"("memberId");

CREATE UNIQUE INDEX "CourseProgress_memberId_courseId_key" ON "CourseProgress"("memberId", "courseId");
CREATE INDEX "CourseProgress_memberId_idx" ON "CourseProgress"("memberId");

CREATE UNIQUE INDEX "LessonProgress_memberId_lessonId_key" ON "LessonProgress"("memberId", "lessonId");
CREATE INDEX "LessonProgress_memberId_idx" ON "LessonProgress"("memberId");

CREATE UNIQUE INDEX "ExerciseProgress_memberId_exerciseId_key" ON "ExerciseProgress"("memberId", "exerciseId");
CREATE INDEX "ExerciseProgress_memberId_idx" ON "ExerciseProgress"("memberId");

CREATE UNIQUE INDEX "AttendancePeriod_memberId_startsOn_key" ON "AttendancePeriod"("memberId", "startsOn");
CREATE INDEX "AttendancePeriod_memberId_endsOn_idx" ON "AttendancePeriod"("memberId", "endsOn");

CREATE INDEX "AttendanceVisit_memberId_checkedInAt_idx" ON "AttendanceVisit"("memberId", "checkedInAt");
CREATE INDEX "AttendancePunch_memberId_registeredAt_idx" ON "AttendancePunch"("memberId", "registeredAt");
CREATE INDEX "AttendanceAudit_memberId_createdAt_idx" ON "AttendanceAudit"("memberId", "createdAt");

ALTER TABLE "MemberCredential" ADD CONSTRAINT "MemberCredential_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuthChallenge" ADD CONSTRAINT "AuthChallenge_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MemberProfileChange" ADD CONSTRAINT "MemberProfileChange_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MemberProfileChange" ADD CONSTRAINT "MemberProfileChange_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Session" ADD CONSTRAINT "Session_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CourseProgress" ADD CONSTRAINT "CourseProgress_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LessonProgress" ADD CONSTRAINT "LessonProgress_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExerciseProgress" ADD CONSTRAINT "ExerciseProgress_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AttendancePeriod" ADD CONSTRAINT "AttendancePeriod_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AttendanceVisit" ADD CONSTRAINT "AttendanceVisit_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AttendancePunch" ADD CONSTRAINT "AttendancePunch_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AttendanceAudit" ADD CONSTRAINT "AttendanceAudit_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AttendanceAudit" ADD CONSTRAINT "AttendanceAudit_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 12. Enable RLS and revoke public privileges on all new and recreated tables
DO $$
DECLARE
  table_name TEXT;
  api_role TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'Member', 'MemberCredential', 'AuthChallenge', 'MemberProfileChange',
    'Session', 'AuthRateLimit', 'Course', 'Module', 'Lesson', 'Exercise',
    'CourseProgress', 'LessonProgress', 'ExerciseProgress', 'ProjectDetails',
    'AttendanceSettings', 'AttendancePeriod', 'AttendanceVisit', 'AttendancePunch', 'AttendanceAudit'
  ] LOOP
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = table_name) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
      EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM PUBLIC', table_name);
      FOR api_role IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon', 'authenticated') LOOP
        EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM %I', table_name, api_role);
      END LOOP;
    END IF;
  END LOOP;
END $$;
