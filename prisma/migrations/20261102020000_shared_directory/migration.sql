CREATE TABLE "MemberDetails" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "institutionalMemberId" INTEGER NOT NULL,
  "memberId" INTEGER,
  "cpf" TEXT,
  "notes" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MemberDetails_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "MemberDetails_institutionalMemberId_key" ON "MemberDetails"("institutionalMemberId");
CREATE UNIQUE INDEX "MemberDetails_memberId_key" ON "MemberDetails"("memberId");
CREATE UNIQUE INDEX "MemberDetails_cpf_key" ON "MemberDetails"("cpf");
CREATE TABLE "ProjectDetails" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "institutionalProjectId" INTEGER NOT NULL,
  "notes" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "ProjectDetails_institutionalProjectId_key" ON "ProjectDetails"("institutionalProjectId");
DO $$
DECLARE table_name TEXT; api_role TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['MemberDetails','ProjectDetails'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM PUBLIC', table_name);
    FOR api_role IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon','authenticated') LOOP
      EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM %I', table_name, api_role);
    END LOOP;
  END LOOP;
END $$;
