-- Idempotent migration for FinancialStatement (Extratos das contas por data).

CREATE TABLE IF NOT EXISTS "FinancialStatement" (
  "id" TEXT PRIMARY KEY,
  "title" TEXT NOT NULL,
  "fundSource" TEXT NOT NULL DEFAULT 'Dinheiro Livre',
  "referenceDate" DATE NOT NULL,
  "fileName" TEXT NOT NULL,
  "fileUrl" TEXT NOT NULL,
  "mimeType" TEXT,
  "notes" TEXT,
  "uploadedById" TEXT REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL
);

CREATE INDEX IF NOT EXISTS "FinancialStatement_fundSource_referenceDate_idx"
  ON "FinancialStatement"("fundSource", "referenceDate");
CREATE INDEX IF NOT EXISTS "FinancialStatement_referenceDate_idx"
  ON "FinancialStatement"("referenceDate");

ALTER TABLE "FinancialStatement" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "FinancialStatement" FROM PUBLIC;
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_roles WHERE rolname='anon') THEN
    REVOKE ALL ON TABLE "FinancialStatement" FROM anon;
  END IF;
  IF EXISTS (SELECT FROM pg_roles WHERE rolname='authenticated') THEN
    REVOKE ALL ON TABLE "FinancialStatement" FROM authenticated;
  END IF;
END $$;
