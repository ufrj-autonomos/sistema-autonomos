-- Semestral evaluations for members, areas, and coordinators

CREATE TABLE IF NOT EXISTS "MemberEvaluation" (
    "id" TEXT NOT NULL,
    "periodCode" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "evaluatorId" TEXT,
    "evaluatorName" TEXT NOT NULL,
    "teamId" INTEGER,
    "area" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "notes" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MemberEvaluation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "MemberEvaluation_periodCode_memberId_key"
    ON "MemberEvaluation"("periodCode", "memberId");

CREATE INDEX IF NOT EXISTS "MemberEvaluation_periodCode_teamId_area_idx"
    ON "MemberEvaluation"("periodCode", "teamId", "area");

CREATE INDEX IF NOT EXISTS "MemberEvaluation_memberId_idx"
    ON "MemberEvaluation"("memberId");

DO $$ BEGIN
    ALTER TABLE "MemberEvaluation"
        ADD CONSTRAINT "MemberEvaluation_memberId_fkey"
        FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "MemberEvaluation"
        ADD CONSTRAINT "MemberEvaluation_evaluatorId_fkey"
        FOREIGN KEY ("evaluatorId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "AreaEvaluation" (
    "id" TEXT NOT NULL,
    "periodCode" TEXT NOT NULL,
    "scopeKey" TEXT NOT NULL,
    "teamId" INTEGER,
    "area" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "notes" TEXT NOT NULL,
    "evaluatorId" TEXT,
    "evaluatorName" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AreaEvaluation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AreaEvaluation_periodCode_scopeKey_key"
    ON "AreaEvaluation"("periodCode", "scopeKey");

CREATE INDEX IF NOT EXISTS "AreaEvaluation_periodCode_idx"
    ON "AreaEvaluation"("periodCode");

DO $$ BEGIN
    ALTER TABLE "AreaEvaluation"
        ADD CONSTRAINT "AreaEvaluation_evaluatorId_fkey"
        FOREIGN KEY ("evaluatorId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "CoordinatorEvaluation" (
    "id" TEXT NOT NULL,
    "periodCode" TEXT NOT NULL,
    "coordinatorId" TEXT NOT NULL,
    "evaluatorId" TEXT,
    "evaluatorName" TEXT NOT NULL,
    "teamId" INTEGER,
    "area" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "notes" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CoordinatorEvaluation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CoordinatorEvaluation_periodCode_coordinatorId_key"
    ON "CoordinatorEvaluation"("periodCode", "coordinatorId");

CREATE INDEX IF NOT EXISTS "CoordinatorEvaluation_periodCode_idx"
    ON "CoordinatorEvaluation"("periodCode");

CREATE INDEX IF NOT EXISTS "CoordinatorEvaluation_coordinatorId_idx"
    ON "CoordinatorEvaluation"("coordinatorId");

DO $$ BEGIN
    ALTER TABLE "CoordinatorEvaluation"
        ADD CONSTRAINT "CoordinatorEvaluation_coordinatorId_fkey"
        FOREIGN KEY ("coordinatorId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "CoordinatorEvaluation"
        ADD CONSTRAINT "CoordinatorEvaluation_evaluatorId_fkey"
        FOREIGN KEY ("evaluatorId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "MemberEvaluation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AreaEvaluation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CoordinatorEvaluation" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "MemberEvaluation" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE "AreaEvaluation" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE "CoordinatorEvaluation" FROM PUBLIC, anon, authenticated;
