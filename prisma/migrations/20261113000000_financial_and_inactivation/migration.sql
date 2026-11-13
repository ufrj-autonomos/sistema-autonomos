-- Idempotent migration for production sync: Member inactivation/pix columns, DisciplinaryWarning, MeetingPeriod, and Financial tables.

ALTER TABLE "Member"
  ADD COLUMN IF NOT EXISTS "inactivatedAt" DATE,
  ADD COLUMN IF NOT EXISTS "inactivationReason" TEXT,
  ADD COLUMN IF NOT EXISTS "pixKey" TEXT,
  ADD COLUMN IF NOT EXISTS "pixKeyType" TEXT;

-- DisciplinaryWarningType & DisciplinaryWarning (if not created via earlier db push)
DO $$ BEGIN
  CREATE TYPE "DisciplinaryWarningType" AS ENUM ('AVISO', 'ADVERTENCIA_DIRETA');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "DisciplinaryWarning" (
  "id" TEXT PRIMARY KEY,
  "memberId" TEXT NOT NULL REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "type" "DisciplinaryWarningType" NOT NULL DEFAULT 'AVISO',
  "reason" TEXT NOT NULL,
  "notes" TEXT,
  "issuedById" TEXT REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL
);

CREATE INDEX IF NOT EXISTS "DisciplinaryWarning_memberId_idx" ON "DisciplinaryWarning"("memberId");
CREATE INDEX IF NOT EXISTS "DisciplinaryWarning_issuedById_idx" ON "DisciplinaryWarning"("issuedById");
CREATE INDEX IF NOT EXISTS "DisciplinaryWarning_type_idx" ON "DisciplinaryWarning"("type");
CREATE INDEX IF NOT EXISTS "DisciplinaryWarning_createdAt_idx" ON "DisciplinaryWarning"("createdAt");

-- MeetingPeriod (if not created via earlier db push)
CREATE TABLE IF NOT EXISTS "MeetingPeriod" (
  "id" TEXT PRIMARY KEY,
  "code" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "startsAt" DATE,
  "endsAt" DATE,
  "isCurrent" BOOLEAN NOT NULL DEFAULT false,
  "archivedAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL
);

CREATE INDEX IF NOT EXISTS "MeetingPeriod_code_idx" ON "MeetingPeriod"("code");
CREATE INDEX IF NOT EXISTS "MeetingPeriod_isCurrent_idx" ON "MeetingPeriod"("isCurrent");

-- Financial enums & tables
DO $$ BEGIN
  CREATE TYPE "FinancialEntryType" AS ENUM ('ENTRADA', 'SAIDA');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "FinancialEntryStatus" AS ENUM ('PENDENTE', 'APROVADO', 'AGUARDANDO_REEMBOLSO', 'AGUARDANDO_NF', 'PAGO', 'RECUSADO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "FinancialEntry" (
  "id" TEXT PRIMARY KEY,
  "code" TEXT NOT NULL UNIQUE,
  "type" "FinancialEntryType" NOT NULL,
  "isReimbursement" BOOLEAN NOT NULL DEFAULT false,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "category" TEXT NOT NULL DEFAULT 'Administrativo',
  "fundSource" TEXT NOT NULL DEFAULT 'Dinheiro Livre',
  "team" TEXT NOT NULL DEFAULT 'Geral',
  "amountCents" INTEGER NOT NULL,
  "occurredAt" DATE,
  "status" "FinancialEntryStatus" NOT NULL DEFAULT 'PENDENTE',
  "requesterId" TEXT REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "requesterName" TEXT NOT NULL,
  "pixKey" TEXT,
  "pixKeyType" TEXT,
  "driveFolderId" TEXT,
  "driveFolderUrl" TEXT,
  "reviewNotes" TEXT,
  "reviewedById" TEXT REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "reviewedAt" TIMESTAMPTZ(3),
  "paidAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL
);

CREATE INDEX IF NOT EXISTS "FinancialEntry_type_status_idx" ON "FinancialEntry"("type", "status");
CREATE INDEX IF NOT EXISTS "FinancialEntry_isReimbursement_status_idx" ON "FinancialEntry"("isReimbursement", "status");
CREATE INDEX IF NOT EXISTS "FinancialEntry_requesterId_idx" ON "FinancialEntry"("requesterId");
CREATE INDEX IF NOT EXISTS "FinancialEntry_occurredAt_idx" ON "FinancialEntry"("occurredAt");
CREATE INDEX IF NOT EXISTS "FinancialEntry_category_idx" ON "FinancialEntry"("category");

CREATE TABLE IF NOT EXISTS "FinancialAttachment" (
  "id" TEXT PRIMARY KEY,
  "entryId" TEXT NOT NULL REFERENCES "FinancialEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "name" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "driveFileId" TEXT,
  "mimeType" TEXT,
  "kind" TEXT NOT NULL DEFAULT 'RECEIPT',
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "FinancialAttachment_entryId_idx" ON "FinancialAttachment"("entryId");

-- Row Level Security
ALTER TABLE "DisciplinaryWarning" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MeetingPeriod" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FinancialEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FinancialAttachment" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "DisciplinaryWarning", "MeetingPeriod", "FinancialEntry", "FinancialAttachment" FROM PUBLIC;
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_roles WHERE rolname='anon') THEN
    REVOKE ALL ON TABLE "DisciplinaryWarning", "MeetingPeriod", "FinancialEntry", "FinancialAttachment" FROM anon;
  END IF;
  IF EXISTS (SELECT FROM pg_roles WHERE rolname='authenticated') THEN
    REVOKE ALL ON TABLE "DisciplinaryWarning", "MeetingPeriod", "FinancialEntry", "FinancialAttachment" FROM authenticated;
  END IF;
END $$;
