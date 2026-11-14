-- Make AuthChallenge.memberId nullable so registration verification challenges can be issued before Member creation
ALTER TABLE "AuthChallenge"
  ALTER COLUMN "memberId" DROP NOT NULL;

-- Create EmailChangeRequest table for member email changes verified by code and reviewed by Management
CREATE TABLE IF NOT EXISTS "EmailChangeRequest" (
  "id" TEXT NOT NULL,
  "memberId" TEXT NOT NULL,
  "currentEmail" TEXT NOT NULL,
  "newEmail" TEXT NOT NULL,
  "status" "ChangeRequestStatus" NOT NULL DEFAULT 'PENDING',
  "reviewedById" TEXT,
  "reviewedAt" TIMESTAMPTZ(3),
  "reviewNote" TEXT,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "EmailChangeRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "EmailChangeRequest_memberId_status_idx"
  ON "EmailChangeRequest"("memberId", "status");

CREATE INDEX IF NOT EXISTS "EmailChangeRequest_status_createdAt_idx"
  ON "EmailChangeRequest"("status", "createdAt");

CREATE INDEX IF NOT EXISTS "EmailChangeRequest_newEmail_status_idx"
  ON "EmailChangeRequest"("newEmail", "status");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'EmailChangeRequest_memberId_fkey'
  ) THEN
    ALTER TABLE "EmailChangeRequest"
      ADD CONSTRAINT "EmailChangeRequest_memberId_fkey"
      FOREIGN KEY ("memberId") REFERENCES "Member"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'EmailChangeRequest_reviewedById_fkey'
  ) THEN
    ALTER TABLE "EmailChangeRequest"
      ADD CONSTRAINT "EmailChangeRequest_reviewedById_fkey"
      FOREIGN KEY ("reviewedById") REFERENCES "Member"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "EmailChangeRequest" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "EmailChangeRequest" FROM PUBLIC, anon, authenticated;
