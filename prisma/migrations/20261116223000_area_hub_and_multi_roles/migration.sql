-- AlterTable Member: múltiplos cargos no sistema
ALTER TABLE "Member"
ADD COLUMN IF NOT EXISTS "roles" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- AlterTable Course: vinculação opcional a uma área/equipe e link externo
ALTER TABLE "Course"
ADD COLUMN IF NOT EXISTS "scopeKey" TEXT,
ADD COLUMN IF NOT EXISTS "area" TEXT,
ADD COLUMN IF NOT EXISTS "teamId" INTEGER,
ADD COLUMN IF NOT EXISTS "externalUrl" TEXT,
ADD COLUMN IF NOT EXISTS "createdById" TEXT;

CREATE INDEX IF NOT EXISTS "Course_scopeKey_idx" ON "Course"("scopeKey");
CREATE INDEX IF NOT EXISTS "Course_area_idx" ON "Course"("area");

-- CreateTable AreaTask
CREATE TABLE IF NOT EXISTS "AreaTask" (
    "id" TEXT NOT NULL,
    "scopeKey" TEXT NOT NULL,
    "teamId" INTEGER,
    "area" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'TODO',
    "priority" TEXT NOT NULL DEFAULT 'MEDIA',
    "dueDate" DATE,
    "referenceUrl" TEXT,
    "handoffNotes" TEXT NOT NULL DEFAULT '',
    "deliveryUrl" TEXT,
    "createdById" TEXT,
    "createdByName" TEXT NOT NULL,
    "updatedByName" TEXT,
    "completedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "AreaTask_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AreaTask_scopeKey_status_idx" ON "AreaTask"("scopeKey", "status");
CREATE INDEX IF NOT EXISTS "AreaTask_area_idx" ON "AreaTask"("area");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'AreaTask_createdById_fkey'
  ) THEN
    ALTER TABLE "AreaTask"
      ADD CONSTRAINT "AreaTask_createdById_fkey"
      FOREIGN KEY ("createdById") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- CreateTable AreaTaskAssignment
CREATE TABLE IF NOT EXISTS "AreaTaskAssignment" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "memberName" TEXT NOT NULL,
    "assignedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AreaTaskAssignment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AreaTaskAssignment_taskId_memberId_key" ON "AreaTaskAssignment"("taskId", "memberId");
CREATE INDEX IF NOT EXISTS "AreaTaskAssignment_memberId_idx" ON "AreaTaskAssignment"("memberId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'AreaTaskAssignment_taskId_fkey'
  ) THEN
    ALTER TABLE "AreaTaskAssignment"
      ADD CONSTRAINT "AreaTaskAssignment_taskId_fkey"
      FOREIGN KEY ("taskId") REFERENCES "AreaTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'AreaTaskAssignment_memberId_fkey'
  ) THEN
    ALTER TABLE "AreaTaskAssignment"
      ADD CONSTRAINT "AreaTaskAssignment_memberId_fkey"
      FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "AreaTask" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AreaTaskAssignment" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "AreaTask", "AreaTaskAssignment" FROM PUBLIC, anon, authenticated;
