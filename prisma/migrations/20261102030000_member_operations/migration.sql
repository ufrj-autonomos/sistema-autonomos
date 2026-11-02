-- Operational data and display preferences belong only to the system database.
ALTER TABLE "MemberDetails"
  ADD COLUMN "name" TEXT,
  ADD COLUMN "area" TEXT,
  ADD COLUMN "email" TEXT,
  ADD COLUMN "phone" TEXT,
  ADD COLUMN "dre" TEXT,
  ADD COLUMN "birthDate" DATE,
  ADD COLUMN "course" TEXT,
  ADD COLUMN "academicPeriod" TEXT,
  ADD COLUMN "emergencyContactName" TEXT,
  ADD COLUMN "emergencyContactPhone" TEXT;
CREATE UNIQUE INDEX "MemberDetails_dre_key" ON "MemberDetails"("dre");
ALTER TABLE "User" ADD COLUMN "memberDirectoryPreferences" JSONB;
