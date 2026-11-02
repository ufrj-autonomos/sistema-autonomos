-- Existing administrators keep access. All other existing and new accounts require approval.
-- Idempotent so that reapplying never reactivates a suspended administrator.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AccountStatus') THEN
    CREATE TYPE "AccountStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'User' AND column_name = 'status'
  ) THEN
    ALTER TABLE "User" ADD COLUMN "status" "AccountStatus" NOT NULL DEFAULT 'PENDING';
    UPDATE "User" SET "status" = 'APPROVED' WHERE "role" = 'ADMIN';
  END IF;
END $$;
