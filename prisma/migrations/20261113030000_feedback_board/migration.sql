-- Idempotent migration for FeedbackItem & FeedbackVote (Bugs, Melhorias, Ideias).

DO $$ BEGIN
  CREATE TYPE "FeedbackScope" AS ENUM ('SISTEMA', 'SITE', 'LABORATORIO', 'EQUIPE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "FeedbackCategory" AS ENUM ('BUG', 'MELHORIA', 'IDEIA', 'PROBLEMA_LAB', 'PROCESSO');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "FeedbackStatus" AS ENUM ('RECEBIDA', 'EM_ANALISE', 'APROVADA', 'EM_ANDAMENTO', 'APLICADA', 'ARQUIVADA');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "FeedbackValidity" AS ENUM ('PENDENTE', 'VALIDA', 'PARCIALMENTE_VALIDA', 'INVALIDA_OU_DUPLICADA');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "FeedbackPriority" AS ENUM ('BAIXA', 'MEDIA', 'ALTA', 'CRITICA');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "FeedbackItem" (
  "id" TEXT PRIMARY KEY,
  "code" TEXT NOT NULL UNIQUE,
  "scope" "FeedbackScope" NOT NULL DEFAULT 'SISTEMA',
  "category" "FeedbackCategory" NOT NULL DEFAULT 'IDEIA',
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "pageOrLocation" TEXT,
  "stepsToReproduce" TEXT,
  "expectedOutcome" TEXT,
  "attachmentUrl" TEXT,
  "attachmentName" TEXT,
  "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
  "authorId" TEXT REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "authorName" TEXT NOT NULL,
  "status" "FeedbackStatus" NOT NULL DEFAULT 'RECEBIDA',
  "validity" "FeedbackValidity" NOT NULL DEFAULT 'PENDENTE',
  "priority" "FeedbackPriority" NOT NULL DEFAULT 'MEDIA',
  "assignedArea" TEXT,
  "assignedToId" TEXT REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "responseNotes" TEXT,
  "appliedAt" TIMESTAMPTZ(3),
  "reviewedById" TEXT REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "reviewedAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL
);

CREATE INDEX IF NOT EXISTS "FeedbackItem_scope_status_idx" ON "FeedbackItem"("scope", "status");
CREATE INDEX IF NOT EXISTS "FeedbackItem_category_status_idx" ON "FeedbackItem"("category", "status");
CREATE INDEX IF NOT EXISTS "FeedbackItem_validity_idx" ON "FeedbackItem"("validity");
CREATE INDEX IF NOT EXISTS "FeedbackItem_authorId_idx" ON "FeedbackItem"("authorId");
CREATE INDEX IF NOT EXISTS "FeedbackItem_createdAt_idx" ON "FeedbackItem"("createdAt");

CREATE TABLE IF NOT EXISTS "FeedbackVote" (
  "id" TEXT PRIMARY KEY,
  "feedbackId" TEXT NOT NULL REFERENCES "FeedbackItem"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "memberId" TEXT NOT NULL REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("feedbackId", "memberId")
);

CREATE INDEX IF NOT EXISTS "FeedbackVote_memberId_idx" ON "FeedbackVote"("memberId");

ALTER TABLE "FeedbackItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FeedbackVote" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "FeedbackItem" FROM PUBLIC;
REVOKE ALL ON TABLE "FeedbackVote" FROM PUBLIC;
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_roles WHERE rolname='anon') THEN
    REVOKE ALL ON TABLE "FeedbackItem" FROM anon;
    REVOKE ALL ON TABLE "FeedbackVote" FROM anon;
  END IF;
  IF EXISTS (SELECT FROM pg_roles WHERE rolname='authenticated') THEN
    REVOKE ALL ON TABLE "FeedbackItem" FROM authenticated;
    REVOKE ALL ON TABLE "FeedbackVote" FROM authenticated;
  END IF;
END $$;
