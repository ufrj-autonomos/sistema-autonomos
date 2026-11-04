CREATE TABLE "ActivityLog" (
  "id" TEXT NOT NULL,
  "clientEventId" VARCHAR(64),
  "actorId" TEXT,
  "actorName" VARCHAR(200),
  "actorRole" VARCHAR(24),
  "kind" VARCHAR(24) NOT NULL,
  "action" VARCHAR(100) NOT NULL,
  "path" VARCHAR(300) NOT NULL,
  "targetPath" VARCHAR(300),
  "control" VARCHAR(60),
  "outcome" VARCHAR(16) NOT NULL,
  "method" VARCHAR(8),
  "statusCode" INTEGER,
  "durationMs" INTEGER,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ActivityLog_clientEventId_key" ON "ActivityLog"("clientEventId");
CREATE INDEX "ActivityLog_createdAt_id_idx" ON "ActivityLog"("createdAt", "id");
CREATE INDEX "ActivityLog_actorId_createdAt_idx" ON "ActivityLog"("actorId", "createdAt");
CREATE INDEX "ActivityLog_kind_createdAt_idx" ON "ActivityLog"("kind", "createdAt");
CREATE INDEX "ActivityLog_outcome_createdAt_idx" ON "ActivityLog"("outcome", "createdAt");
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ActivityLog" ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE "ActivityLog" FROM PUBLIC;
DO $$ DECLARE api_role TEXT; BEGIN
  FOR api_role IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon', 'authenticated') LOOP
    EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public."ActivityLog" FROM %I', api_role);
  END LOOP;
END $$;
