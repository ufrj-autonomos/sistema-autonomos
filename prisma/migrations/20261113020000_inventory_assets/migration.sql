-- Idempotent migration for InventoryAsset & InventoryAssetEvent (Patrimônio da equipe).

DO $$ BEGIN
  CREATE TYPE "AssetAcquisitionStatus" AS ENUM (
    'PLANEJADO',
    'EM_COTACAO',
    'COMPRADO_AGUARDANDO',
    'ADQUIRIDO',
    'EMPRESTADO',
    'MANUTENCAO',
    'BAIXADO'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "AssetCondition" AS ENUM (
    'NOVO',
    'BOM',
    'DESGASTADO',
    'DEFEITO_PARCIAL',
    'ESTRAGADO'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "InventoryAsset" (
  "id" TEXT PRIMARY KEY,
  "assetTag" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "category" TEXT NOT NULL DEFAULT 'Eletrônica & Embarcados',
  "team" TEXT NOT NULL DEFAULT 'Geral',
  "area" TEXT NOT NULL DEFAULT 'Geral',
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "unit" TEXT NOT NULL DEFAULT 'un',
  "unitPriceCents" INTEGER NOT NULL DEFAULT 0,
  "totalPriceCents" INTEGER NOT NULL DEFAULT 0,
  "acquisitionStatus" "AssetAcquisitionStatus" NOT NULL DEFAULT 'ADQUIRIDO',
  "condition" "AssetCondition" NOT NULL DEFAULT 'BOM',
  "damageNotes" TEXT,
  "acquiredAt" DATE,
  "expectedAcquisitionDate" DATE,
  "warrantyUntil" DATE,
  "acquisitionSource" TEXT DEFAULT 'Dinheiro Livre',
  "supplier" TEXT,
  "purchaseUrl" TEXT,
  "serialNumber" TEXT,
  "location" TEXT,
  "custodianId" TEXT REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "custodianName" TEXT,
  "financialEntryId" TEXT REFERENCES "FinancialEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "photoUrl" TEXT,
  "invoiceUrl" TEXT,
  "invoiceName" TEXT,
  "createdById" TEXT REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "updatedById" TEXT REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL
);

CREATE INDEX IF NOT EXISTS "InventoryAsset_acquisitionStatus_condition_idx"
  ON "InventoryAsset"("acquisitionStatus", "condition");
CREATE INDEX IF NOT EXISTS "InventoryAsset_category_idx"
  ON "InventoryAsset"("category");
CREATE INDEX IF NOT EXISTS "InventoryAsset_team_idx"
  ON "InventoryAsset"("team");
CREATE INDEX IF NOT EXISTS "InventoryAsset_custodianId_idx"
  ON "InventoryAsset"("custodianId");
CREATE INDEX IF NOT EXISTS "InventoryAsset_acquiredAt_idx"
  ON "InventoryAsset"("acquiredAt");

CREATE TABLE IF NOT EXISTS "InventoryAssetEvent" (
  "id" TEXT PRIMARY KEY,
  "assetId" TEXT NOT NULL REFERENCES "InventoryAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "eventType" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "notes" TEXT,
  "actorId" TEXT REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "actorName" TEXT,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "InventoryAssetEvent_assetId_createdAt_idx"
  ON "InventoryAssetEvent"("assetId", "createdAt");

ALTER TABLE "InventoryAsset" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InventoryAssetEvent" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "InventoryAsset" FROM PUBLIC;
REVOKE ALL ON TABLE "InventoryAssetEvent" FROM PUBLIC;
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_roles WHERE rolname='anon') THEN
    REVOKE ALL ON TABLE "InventoryAsset" FROM anon;
    REVOKE ALL ON TABLE "InventoryAssetEvent" FROM anon;
  END IF;
  IF EXISTS (SELECT FROM pg_roles WHERE rolname='authenticated') THEN
    REVOKE ALL ON TABLE "InventoryAsset" FROM authenticated;
    REVOKE ALL ON TABLE "InventoryAssetEvent" FROM authenticated;
  END IF;
END $$;
