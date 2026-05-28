-- ============================================================
-- Auth Profile Robustness
-- ============================================================
-- Problem: users_profile rows can be lost when DB migrations are
-- re-run (supabase db push / db reset), while auth.users rows
-- survive because Supabase Auth is a separate system. This causes
-- pwa-login to return 404 even though credentials are correct.
--
-- Fixes applied:
-- 1. Rebuild handle_new_user trigger with ON CONFLICT DO NOTHING
--    so it is idempotent and won't fail on duplicate.
-- 2. Repair: back-fill profiles for any auth users that currently
--    have no profile row (the immediate fix for the current issue).
-- 3. Add INSERT policy on users_profile so service-role and
--    trigger SECURITY DEFINER can always write.
-- ============================================================

-- ── 1. Idempotent trigger ──────────────────────────────────────
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.users_profile (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(
      CASE
        WHEN NEW.raw_user_meta_data->>'role' IN (
          'region_admin', 'region_viewer', 'branch_manager', 'branch_staff'
        ) THEN NEW.raw_user_meta_data->>'role'
      END,
      'branch_staff'
    )
  )
  ON CONFLICT (id) DO NOTHING; -- safe if profile already exists
  RETURN NEW;
END;
$$;

-- Re-attach trigger (idempotent: drop + recreate)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ── 2. Repair: back-fill any auth users with no profile ────────
-- Covers the case where DB was reset but auth.users still has rows.
INSERT INTO public.users_profile (id, full_name, role)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data->>'full_name', u.email),
  COALESCE(
    CASE
      WHEN u.raw_user_meta_data->>'role' IN (
        'region_admin', 'region_viewer', 'branch_manager', 'branch_staff'
      ) THEN u.raw_user_meta_data->>'role'
    END,
    'branch_staff'
  )
FROM auth.users u
LEFT JOIN public.users_profile p ON p.id = u.id
WHERE p.id IS NULL
  AND u.email LIKE '%@pwa.local'   -- only accounts created by this app
  AND u.deleted_at IS NULL;

-- ── 3. INSERT policy so service-role writes always work ────────
-- (service_role already bypasses RLS, but explicit policy prevents
-- confusion and covers future anon-client usage)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'users_profile' AND policyname = 'profile_insert_service'
  ) THEN
    CREATE POLICY profile_insert_service ON public.users_profile
      FOR INSERT WITH CHECK (true);
  END IF;
END $$;
