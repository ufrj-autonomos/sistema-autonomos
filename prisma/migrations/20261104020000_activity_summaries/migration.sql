ALTER TABLE "ActivityLog" ADD COLUMN "summaryKey" VARCHAR(64), ADD COLUMN "occurrences" INTEGER NOT NULL DEFAULT 1, ADD COLUMN "lastOccurredAt" TIMESTAMPTZ(3);
UPDATE "ActivityLog" SET "lastOccurredAt" = "createdAt";
ALTER TABLE "ActivityLog" ALTER COLUMN "lastOccurredAt" SET DEFAULT CURRENT_TIMESTAMP, ALTER COLUMN "lastOccurredAt" SET NOT NULL;
CREATE UNIQUE INDEX "ActivityLog_summaryKey_key" ON "ActivityLog"("summaryKey");
CREATE INDEX "ActivityLog_lastOccurredAt_id_idx" ON "ActivityLog"("lastOccurredAt", "id");
