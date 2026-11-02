-- Run as institutional owner, before deploying the unified directory.
-- Additive: preserve all existing records and their current public visibility.
BEGIN;
ALTER TABLE public."Member" ADD COLUMN IF NOT EXISTS "showOnSite" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public."Project" ADD COLUMN IF NOT EXISTS "showOnSite" BOOLEAN NOT NULL DEFAULT true;
DROP POLICY IF EXISTS institutional_reader_access ON public."Member";
CREATE POLICY institutional_reader_access ON public."Member" FOR SELECT TO institutional_reader USING ("showOnSite");
DROP POLICY IF EXISTS institutional_reader_access ON public."Project";
CREATE POLICY institutional_reader_access ON public."Project" FOR SELECT TO institutional_reader USING ("showOnSite");
-- A hidden project's gallery must not reappear in the general/team galleries.
DROP POLICY IF EXISTS institutional_reader_access ON public."GalleryImage";
CREATE POLICY institutional_reader_access ON public."GalleryImage" FOR SELECT TO institutional_reader
USING ("projectId" IS NULL OR EXISTS (SELECT 1 FROM public."Project" p WHERE p.id = "projectId" AND p."showOnSite"));
COMMIT;
