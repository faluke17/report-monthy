-- ============================================================
-- NRW Tracker — Full Schema (PWA Auth version)
-- Run this ONCE in Supabase SQL Editor
-- Auth is handled by PWA session cookie, NOT Supabase auth
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================
-- 1. BRANCHES
-- ============================================================
CREATE TABLE IF NOT EXISTS branches (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code        TEXT UNIQUE NOT NULL,
  name_th     TEXT NOT NULL,
  province_th TEXT NOT NULL,
  region      TEXT NOT NULL DEFAULT 'R10',
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO branches (code, name_th, province_th) VALUES
  ('NKS', 'นครสวรรค์',        'นครสวรรค์'),
  ('TTK', 'ท่าตะโก',           'นครสวรรค์'),
  ('LYW', 'ลาดยาว',            'นครสวรรค์'),
  ('PYK', 'พยุหะคีรี',         'นครสวรรค์'),
  ('CNT', 'ชัยนาท',            'ชัยนาท'),
  ('UTN', 'อุทัยธานี',         'อุทัยธานี'),
  ('KPP', 'กำแพงเพชร',        'กำแพงเพชร'),
  ('KNU', 'ขาณุวรลักษบุรี',    'กำแพงเพชร'),
  ('TAK', 'ตาก',               'ตาก'),
  ('MSO', 'แม่สอด',            'ตาก'),
  ('SKT', 'สุโขทัย',           'สุโขทัย'),
  ('TSL', 'ทุ่งเสลี่ยม',       'สุโขทัย'),
  ('SRR', 'ศรีสำโรง',          'สุโขทัย'),
  ('SWK', 'สวรรคโลก',          'สุโขทัย'),
  ('SSN', 'ศรีสัชนาลัย',       'สุโขทัย'),
  ('UTT', 'อุตรดิตถ์',         'อุตรดิตถ์'),
  ('PKM', 'พิษณุโลก',          'พิษณุโลก'),
  ('NKT', 'นครไทย',            'พิษณุโลก'),
  ('PCT', 'พิจิตร',            'พิจิตร'),
  ('BML', 'บางมูลนาก',         'พิจิตร'),
  ('TPH', 'ตะพานหิน',          'พิจิตร'),
  ('PBC', 'เพชรบูรณ์',         'เพชรบูรณ์'),
  ('LOM', 'หล่มสัก',           'เพชรบูรณ์'),
  ('CHN', 'ชนแดน',             'เพชรบูรณ์'),
  ('NNP', 'หนองไผ่',           'เพชรบูรณ์'),
  ('VCB', 'วิเชียรบุรี',       'เพชรบูรณ์')
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- 2. PLANS
-- ============================================================
CREATE TABLE IF NOT EXISTS plans (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code                  TEXT UNIQUE NOT NULL,
  branch_id             UUID NOT NULL REFERENCES branches(id),
  owner_level           TEXT CHECK (owner_level IN ('region', 'branch')),
  plan_type             TEXT NOT NULL,
  approach_group        TEXT NOT NULL,
  area                  TEXT,
  baseline_nrw          NUMERIC(5,2),
  baseline_mnf          NUMERIC(8,2),
  baseline_daily_supply NUMERIC(10,2),
  baseline_daily_sale   NUMERIC(10,2),
  target_nrw            NUMERIC(5,2),
  target_mnf            NUMERIC(8,2),
  target_water_save     NUMERIC(10,2),
  action_plan           TEXT,
  resources             TEXT,
  priority              TEXT CHECK (priority IN ('สูง', 'กลาง', 'ต่ำ')),
  start_date            DATE,
  end_date              DATE,
  pic                   TEXT,
  status                TEXT DEFAULT 'ระหว่างดำเนินการ'
    CHECK (status IN ('ระหว่างดำเนินการ', 'สำเร็จ', 'ล่าช้า', 'ยกเลิก', 'รออนุมัติ')),
  progress_pct          INTEGER DEFAULT 0 CHECK (progress_pct BETWEEN 0 AND 100),
  created_by            TEXT,
  approved_by           TEXT,
  approved_at           TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. MONTHLY REPORTS
-- ============================================================
CREATE TABLE IF NOT EXISTS monthly_reports (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id           UUID NOT NULL REFERENCES branches(id),
  plan_id             UUID REFERENCES plans(id),
  report_year         INTEGER NOT NULL,
  report_month        INTEGER NOT NULL CHECK (report_month BETWEEN 1 AND 12),
  volume_distributed  NUMERIC(12,2),
  volume_sold         NUMERIC(12,2),
  days_in_month       INTEGER DEFAULT 30,
  mnf_latest          NUMERIC(8,2),
  mnf_measured_date   DATE,
  daily_supply        NUMERIC(10,2),
  nrw_pct             NUMERIC(5,2) GENERATED ALWAYS AS (
    CASE WHEN volume_distributed > 0
    THEN ROUND(((volume_distributed - volume_sold) / volume_distributed * 100)::NUMERIC, 2)
    ELSE NULL END
  ) STORED,
  mnf_factor          NUMERIC(5,3) GENERATED ALWAYS AS (
    CASE WHEN daily_supply > 0
    THEN ROUND((mnf_latest / (daily_supply / 24.0))::NUMERIC, 3)
    ELSE NULL END
  ) STORED,
  leaks_found         INTEGER DEFAULT 0,
  leaks_repaired      INTEGER DEFAULT 0,
  leaks_pending       INTEGER DEFAULT 0,
  leaks_repeat        INTEGER DEFAULT 0,
  meters_abnormal     INTEGER DEFAULT 0,
  pdca_do             TEXT,
  pdca_act            TEXT,
  status              TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'reviewed')),
  submitted_at        TIMESTAMPTZ,
  created_by          TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(branch_id, report_year, report_month)
);

-- ============================================================
-- 4. OBSTACLES
-- ============================================================
CREATE TABLE IF NOT EXISTS obstacles (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code                  TEXT UNIQUE NOT NULL,
  branch_id             UUID NOT NULL REFERENCES branches(id),
  plan_id               UUID REFERENCES plans(id),
  obstacle_type         TEXT NOT NULL,
  category              TEXT NOT NULL CHECK (category IN ('MM', 'DMA', 'P3', 'อื่นๆ')),
  area                  TEXT,
  data_quality_impact   TEXT,
  resolution_plan       TEXT,
  region_support_needed TEXT,
  progress_pct          INTEGER DEFAULT 0 CHECK (progress_pct BETWEEN 0 AND 100),
  due_date              DATE,
  status                TEXT DEFAULT 'รายงานใหม่'
    CHECK (status IN ('รายงานใหม่', 'ระหว่างแก้', 'รอสนับสนุน', 'ล่าช้า', 'เกินกำหนด', 'ปิดประเด็น')),
  auto_create_action    BOOLEAN DEFAULT true,
  send_to_meeting       BOOLEAN DEFAULT true,
  show_in_monthly_alert BOOLEAN DEFAULT true,
  priority_order        INTEGER,
  created_by            TEXT,
  resolved_by           TEXT,
  resolved_at           TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 5. ACTION ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS action_items (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code         TEXT UNIQUE NOT NULL,
  branch_id    UUID NOT NULL REFERENCES branches(id),
  plan_id      UUID REFERENCES plans(id),
  obstacle_id  UUID REFERENCES obstacles(id),
  meeting_id   UUID,
  title        TEXT NOT NULL,
  detail       TEXT,
  owner        TEXT NOT NULL,
  due_date     DATE,
  status       TEXT DEFAULT 'รอดำเนินการ'
    CHECK (status IN ('รอดำเนินการ', 'ระหว่างดำเนินการ', 'รออนุมัติ', 'แล้วเสร็จ', 'เกินกำหนด', 'ยกเลิก')),
  evidence_url TEXT[],
  notes        TEXT,
  completed_at TIMESTAMPTZ,
  created_by   TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 6. MEETINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS meetings (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code                 TEXT UNIQUE NOT NULL,
  title                TEXT NOT NULL,
  meeting_type         TEXT NOT NULL,
  scheduled_date       DATE NOT NULL,
  scheduled_time       TIME NOT NULL,
  location             TEXT,
  meeting_link         TEXT,
  target_audience      TEXT DEFAULT 'ทุกสาขา',
  prep_required        TEXT,
  notification_message TEXT,
  status               TEXT DEFAULT 'กำหนดแล้ว'
    CHECK (status IN ('กำหนดแล้ว', 'เสร็จสิ้น', 'เลื่อน', 'ยกเลิก')),
  created_by           TEXT,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_action_meeting') THEN
    ALTER TABLE action_items
      ADD CONSTRAINT fk_action_meeting
      FOREIGN KEY (meeting_id) REFERENCES meetings(id)
      NOT VALID;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS meeting_resolutions (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meeting_id        UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  sequence_no       INTEGER NOT NULL,
  title             TEXT NOT NULL,
  responsible_party TEXT,
  due_date          DATE,
  status            TEXT DEFAULT 'ระหว่างดำเนินการ',
  notes             TEXT,
  action_item_id    UUID REFERENCES action_items(id),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 7. KM CASES
-- ============================================================
CREATE TABLE IF NOT EXISTS km_cases (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code                TEXT UNIQUE NOT NULL,
  branch_id           UUID NOT NULL REFERENCES branches(id),
  plan_id             UUID REFERENCES plans(id),
  title               TEXT NOT NULL,
  approach_tags       TEXT[],
  nrw_before          NUMERIC(5,2),
  nrw_after           NUMERIC(5,2),
  mnf_before          NUMERIC(8,2),
  mnf_after           NUMERIC(8,2),
  water_saved_daily   NUMERIC(10,2),
  value_saved_monthly NUMERIC(12,2),
  key_approach        TEXT,
  lessons_learned     TEXT,
  applicable_branches TEXT[],
  verification_status TEXT DEFAULT 'รอยืนยันรอบ 2'
    CHECK (verification_status IN ('รอยืนยันรอบ 1', 'รอยืนยันรอบ 2', 'ยืนยันแล้ว')),
  verified_rounds     INTEGER DEFAULT 0,
  verified_at         TIMESTAMPTZ,
  created_by          TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 8. AREA MONTHLY REPORTS (MM / DMA)
-- ============================================================
CREATE TABLE IF NOT EXISTS area_monthly_reports (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id       UUID REFERENCES branches(id) ON DELETE CASCADE,
  report_year     INTEGER NOT NULL,
  report_month    INTEGER NOT NULL,
  area_name       TEXT NOT NULL,
  water_dist_before NUMERIC,
  water_sold_before NUMERIC,
  mnf_before        NUMERIC,
  water_dist_after  NUMERIC,
  water_sold_after  NUMERIC,
  mnf_after         NUMERIC,
  pdca_do           TEXT,
  pdca_act          TEXT,
  status            TEXT DEFAULT 'draft' CHECK (status IN ('draft','submitted')),
  created_by        TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (branch_id, report_year, report_month, area_name)
);

CREATE TABLE IF NOT EXISTS step_test_results (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  area_report_id  UUID REFERENCES area_monthly_reports(id) ON DELETE CASCADE,
  step_no         INTEGER NOT NULL,
  estimated_loss  NUMERIC,
  leaks_found     INTEGER DEFAULT 0,
  repair_status   TEXT DEFAULT 'รอซ่อม'
    CHECK (repair_status IN ('รอซ่อม','ซ่อมแล้ว','ซ่อมไม่ได้')),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS area_obstacles (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  area_report_id   UUID REFERENCES area_monthly_reports(id) ON DELETE CASCADE,
  obstacle_type    TEXT NOT NULL,
  other_description TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 9. RLS — Allow all (auth handled at app layer via PWA session)
-- ============================================================
ALTER TABLE branches              ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_reports       ENABLE ROW LEVEL SECURITY;
ALTER TABLE obstacles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_items          ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings              ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_resolutions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE km_cases              ENABLE ROW LEVEL SECURITY;
ALTER TABLE area_monthly_reports  ENABLE ROW LEVEL SECURITY;
ALTER TABLE step_test_results     ENABLE ROW LEVEL SECURITY;
ALTER TABLE area_obstacles        ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='branches'            AND policyname='allow_all') THEN CREATE POLICY allow_all ON branches            FOR ALL USING (true) WITH CHECK (true); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='plans'               AND policyname='allow_all') THEN CREATE POLICY allow_all ON plans               FOR ALL USING (true) WITH CHECK (true); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='monthly_reports'     AND policyname='allow_all') THEN CREATE POLICY allow_all ON monthly_reports     FOR ALL USING (true) WITH CHECK (true); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='obstacles'           AND policyname='allow_all') THEN CREATE POLICY allow_all ON obstacles           FOR ALL USING (true) WITH CHECK (true); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='action_items'        AND policyname='allow_all') THEN CREATE POLICY allow_all ON action_items        FOR ALL USING (true) WITH CHECK (true); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='meetings'            AND policyname='allow_all') THEN CREATE POLICY allow_all ON meetings            FOR ALL USING (true) WITH CHECK (true); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='meeting_resolutions' AND policyname='allow_all') THEN CREATE POLICY allow_all ON meeting_resolutions FOR ALL USING (true) WITH CHECK (true); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='km_cases'            AND policyname='allow_all') THEN CREATE POLICY allow_all ON km_cases            FOR ALL USING (true) WITH CHECK (true); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='area_monthly_reports' AND policyname='allow_all') THEN CREATE POLICY allow_all ON area_monthly_reports FOR ALL USING (true) WITH CHECK (true); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='step_test_results'   AND policyname='allow_all') THEN CREATE POLICY allow_all ON step_test_results   FOR ALL USING (true) WITH CHECK (true); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='area_obstacles'      AND policyname='allow_all') THEN CREATE POLICY allow_all ON area_obstacles      FOR ALL USING (true) WITH CHECK (true); END IF;
END $$;

-- ============================================================
-- 10. TRIGGERS — updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='tr_plans_updated')           THEN CREATE TRIGGER tr_plans_updated           BEFORE UPDATE ON plans              FOR EACH ROW EXECUTE FUNCTION update_updated_at(); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='tr_monthly_updated')         THEN CREATE TRIGGER tr_monthly_updated         BEFORE UPDATE ON monthly_reports    FOR EACH ROW EXECUTE FUNCTION update_updated_at(); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='tr_obstacles_updated')       THEN CREATE TRIGGER tr_obstacles_updated       BEFORE UPDATE ON obstacles          FOR EACH ROW EXECUTE FUNCTION update_updated_at(); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='tr_actions_updated')         THEN CREATE TRIGGER tr_actions_updated         BEFORE UPDATE ON action_items       FOR EACH ROW EXECUTE FUNCTION update_updated_at(); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='tr_meetings_updated')        THEN CREATE TRIGGER tr_meetings_updated        BEFORE UPDATE ON meetings           FOR EACH ROW EXECUTE FUNCTION update_updated_at(); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='tr_resolutions_updated')     THEN CREATE TRIGGER tr_resolutions_updated     BEFORE UPDATE ON meeting_resolutions FOR EACH ROW EXECUTE FUNCTION update_updated_at(); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='tr_km_updated')              THEN CREATE TRIGGER tr_km_updated              BEFORE UPDATE ON km_cases           FOR EACH ROW EXECUTE FUNCTION update_updated_at(); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_area_reports_updated_at') THEN CREATE TRIGGER trg_area_reports_updated_at BEFORE UPDATE ON area_monthly_reports FOR EACH ROW EXECUTE FUNCTION update_updated_at(); END IF;
END $$;

-- Obstacle priority
CREATE OR REPLACE FUNCTION set_obstacle_priority()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.priority_order = CASE NEW.category WHEN 'MM' THEN 1 WHEN 'DMA' THEN 2 WHEN 'P3' THEN 3 ELSE 4 END;
  RETURN NEW;
END;
$$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='tr_obstacle_priority') THEN
    CREATE TRIGGER tr_obstacle_priority BEFORE INSERT OR UPDATE ON obstacles
      FOR EACH ROW EXECUTE FUNCTION set_obstacle_priority();
  END IF;
END $$;

-- Auto-create action_item from obstacle
CREATE OR REPLACE FUNCTION auto_create_action_from_obstacle()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v_branch_code TEXT; v_seq INTEGER; v_code TEXT;
BEGIN
  IF NOT NEW.auto_create_action THEN RETURN NEW; END IF;
  SELECT code INTO v_branch_code FROM branches WHERE id = NEW.branch_id;
  SELECT COUNT(*) + 1 INTO v_seq FROM action_items WHERE branch_id = NEW.branch_id;
  v_code := 'ORD-' || v_branch_code || '-' || LPAD(v_seq::TEXT, 4, '0');
  INSERT INTO action_items (code, branch_id, obstacle_id, plan_id, title, owner, due_date, status, created_by)
  VALUES (v_code, NEW.branch_id, NEW.id, NEW.plan_id,
    'เร่งแก้ไขอุปสรรค: ' || NEW.obstacle_type || COALESCE(' · ' || NEW.area, ''),
    'ผจก.สาขา', NEW.due_date, 'รอดำเนินการ', NEW.created_by);
  RETURN NEW;
END;
$$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='tr_auto_action') THEN
    CREATE TRIGGER tr_auto_action AFTER INSERT ON obstacles
      FOR EACH ROW EXECUTE FUNCTION auto_create_action_from_obstacle();
  END IF;
END $$;

-- ============================================================
-- 11. INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_monthly_branch_month  ON monthly_reports(branch_id, report_year, report_month);
CREATE INDEX IF NOT EXISTS idx_monthly_status        ON monthly_reports(status);
CREATE INDEX IF NOT EXISTS idx_plans_branch          ON plans(branch_id, status);
CREATE INDEX IF NOT EXISTS idx_obstacles_branch      ON obstacles(branch_id, status);
CREATE INDEX IF NOT EXISTS idx_obstacles_priority    ON obstacles(priority_order, status);
CREATE INDEX IF NOT EXISTS idx_actions_branch        ON action_items(branch_id, status);
CREATE INDEX IF NOT EXISTS idx_actions_due           ON action_items(due_date, status);
CREATE INDEX IF NOT EXISTS idx_km_verification       ON km_cases(verification_status);
CREATE INDEX IF NOT EXISTS idx_meetings_date         ON meetings(scheduled_date, status);
CREATE INDEX IF NOT EXISTS idx_area_reports          ON area_monthly_reports(branch_id, report_year, report_month);
