-- The application authenticates requests on the server through Prisma.
-- Supabase's public API roles must never bypass that authentication.
DO $$
DECLARE
  table_name TEXT;
  api_role TEXT;
  sequence_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'User', 'Session', 'AuthRateLimit', 'Course', 'Module', 'Lesson', 'Exercise',
    'CourseProgress', 'LessonProgress', 'ExerciseProgress', 'Team', 'Member', 'Project',
    '_prisma_migrations'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM PUBLIC', table_name);
    FOR api_role IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon', 'authenticated') LOOP
      EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM %I', table_name, api_role);
    END LOOP;
  END LOOP;
  FOREACH sequence_name IN ARRAY ARRAY['Team_id_seq', 'Member_id_seq', 'Project_id_seq'] LOOP
    EXECUTE format('REVOKE ALL PRIVILEGES ON SEQUENCE public.%I FROM PUBLIC', sequence_name);
    FOR api_role IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon', 'authenticated') LOOP
      EXECUTE format('REVOKE ALL PRIVILEGES ON SEQUENCE public.%I FROM %I', sequence_name, api_role);
    END LOOP;
  END LOOP;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM PUBLIC;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM PUBLIC;
  FOR api_role IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon', 'authenticated') LOOP
    EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM %I', api_role);
    EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM %I', api_role);
  END LOOP;
END $$;
