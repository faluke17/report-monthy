-- Migration: Enable RLS and create policies

-- Enable RLS on all tables
ALTER TABLE branches           ENABLE ROW LEVEL SECURITY;
ALTER TABLE users_profile      ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans              ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_reports    ENABLE ROW LEVEL SECURITY;
ALTER TABLE obstacles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_items       ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings           ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_resolutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE km_cases           ENABLE ROW LEVEL SECURITY;

-- Helper functions
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT role FROM users_profile WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION get_my_branch_id()
RETURNS UUID LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT branch_id FROM users_profile WHERE id = auth.uid()
$$;

-- Branches: everyone reads
CREATE POLICY "branches_read_all" ON branches FOR SELECT USING (true);

-- Users profile: user can read own, region_admin reads all
CREATE POLICY "profile_read_own" ON users_profile FOR SELECT
  USING (id = auth.uid() OR get_my_role() IN ('region_admin', 'region_viewer'));
CREATE POLICY "profile_update_own" ON users_profile FOR UPDATE
  USING (id = auth.uid() OR get_my_role() = 'region_admin');

-- Plans: region sees all, branch sees own
CREATE POLICY "plans_read" ON plans FOR SELECT USING (
  get_my_role() IN ('region_admin', 'region_viewer')
  OR branch_id = get_my_branch_id()
);
CREATE POLICY "plans_insert" ON plans FOR INSERT WITH CHECK (
  get_my_role() IN ('region_admin', 'branch_manager')
  AND (get_my_role() = 'region_admin' OR branch_id = get_my_branch_id())
);
CREATE POLICY "plans_update" ON plans FOR UPDATE USING (
  get_my_role() = 'region_admin'
  OR (get_my_role() = 'branch_manager' AND branch_id = get_my_branch_id())
);

-- Monthly reports
CREATE POLICY "monthly_read" ON monthly_reports FOR SELECT USING (
  get_my_role() IN ('region_admin', 'region_viewer')
  OR branch_id = get_my_branch_id()
);
CREATE POLICY "monthly_insert" ON monthly_reports FOR INSERT WITH CHECK (
  (branch_id = get_my_branch_id() AND get_my_role() IN ('branch_manager', 'branch_staff'))
  OR get_my_role() = 'region_admin'
);
CREATE POLICY "monthly_update" ON monthly_reports FOR UPDATE USING (
  (branch_id = get_my_branch_id() AND get_my_role() IN ('branch_manager', 'branch_staff') AND status = 'draft')
  OR get_my_role() = 'region_admin'
);

-- Obstacles
CREATE POLICY "obstacles_read" ON obstacles FOR SELECT USING (
  get_my_role() IN ('region_admin', 'region_viewer')
  OR branch_id = get_my_branch_id()
);
CREATE POLICY "obstacles_insert" ON obstacles FOR INSERT WITH CHECK (
  get_my_role() = 'region_admin'
  OR (branch_id = get_my_branch_id() AND get_my_role() IN ('branch_manager', 'branch_staff'))
);
CREATE POLICY "obstacles_update" ON obstacles FOR UPDATE USING (
  get_my_role() = 'region_admin'
  OR (branch_id = get_my_branch_id() AND get_my_role() IN ('branch_manager', 'branch_staff'))
);

-- Action items
CREATE POLICY "actions_read" ON action_items FOR SELECT USING (
  get_my_role() IN ('region_admin', 'region_viewer')
  OR branch_id = get_my_branch_id()
);
CREATE POLICY "actions_insert" ON action_items FOR INSERT WITH CHECK (
  get_my_role() = 'region_admin'
  OR (branch_id = get_my_branch_id() AND get_my_role() IN ('branch_manager', 'branch_staff'))
);
CREATE POLICY "actions_update" ON action_items FOR UPDATE USING (
  get_my_role() = 'region_admin'
  OR (branch_id = get_my_branch_id() AND get_my_role() IN ('branch_manager', 'branch_staff'))
);

-- Meetings: region creates, all can read
CREATE POLICY "meetings_read" ON meetings FOR SELECT USING (true);
CREATE POLICY "meetings_insert" ON meetings FOR INSERT WITH CHECK (
  get_my_role() = 'region_admin'
);
CREATE POLICY "meetings_update" ON meetings FOR UPDATE USING (
  get_my_role() = 'region_admin'
);

-- Meeting resolutions: all read, region writes
CREATE POLICY "resolutions_read" ON meeting_resolutions FOR SELECT USING (true);
CREATE POLICY "resolutions_write" ON meeting_resolutions FOR ALL USING (
  get_my_role() = 'region_admin'
);

-- KM cases: all read, branch_manager and region write
CREATE POLICY "km_read" ON km_cases FOR SELECT USING (true);
CREATE POLICY "km_insert" ON km_cases FOR INSERT WITH CHECK (
  get_my_role() IN ('region_admin', 'branch_manager')
);
CREATE POLICY "km_update" ON km_cases FOR UPDATE USING (
  get_my_role() = 'region_admin'
  OR (branch_id = get_my_branch_id() AND get_my_role() = 'branch_manager')
);
