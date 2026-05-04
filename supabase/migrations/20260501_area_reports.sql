-- ============================================================
-- Area Monthly Reports — รายงานรายพื้นที่ (MM / DMA)
-- ============================================================

CREATE TABLE IF NOT EXISTS area_monthly_reports (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id       uuid REFERENCES branches(id) ON DELETE CASCADE,
  report_year     integer NOT NULL,
  report_month    integer NOT NULL,
  area_name       text    NOT NULL,   -- e.g. "DMA-ชื่อdma", "MM-ชื่อmm"

  -- Part 2: ก่อนดำเนินการ
  water_dist_before  numeric,         -- น้ำจ่ายรายเดือน (ลบ.ม.)
  water_sold_before  numeric,         -- น้ำจำหน่ายรายเดือน (ลบ.ม.)
  mnf_before         numeric,         -- MNF (ลบ.ม./ชม.)

  -- Part 4: หลังดำเนินการ
  water_dist_after   numeric,
  water_sold_after   numeric,
  mnf_after          numeric,

  -- Part 5: Do/Act
  pdca_do   text,
  pdca_act  text,

  -- Meta
  status      text DEFAULT 'draft' CHECK (status IN ('draft','submitted')),
  created_by  text,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now(),

  UNIQUE (branch_id, report_year, report_month, area_name)
);

-- ============================================================
-- Step Test Results — ผลการทดสอบ Step Test
-- ============================================================

CREATE TABLE IF NOT EXISTS step_test_results (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  area_report_id  uuid REFERENCES area_monthly_reports(id) ON DELETE CASCADE,
  step_no         integer NOT NULL,
  estimated_loss  numeric,            -- ปริมาณน้ำสูญเสียคาดการณ์ (m3/hr)
  leaks_found     integer DEFAULT 0,  -- Let's (จุด)
  repair_status   text DEFAULT 'รอซ่อม'
    CHECK (repair_status IN ('รอซ่อม','ซ่อมแล้ว','ซ่อมไม่ได้')),
  created_at      timestamptz DEFAULT now()
);

-- ============================================================
-- Area Obstacles — อุปสรรคในพื้นที่
-- ============================================================

CREATE TABLE IF NOT EXISTS area_obstacles (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  area_report_id  uuid REFERENCES area_monthly_reports(id) ON DELETE CASCADE,
  obstacle_type   text NOT NULL,
  other_description text,             -- ใช้เมื่อ obstacle_type = 'อื่นๆ'
  created_at      timestamptz DEFAULT now()
);

-- ============================================================
-- RLS Policies
-- ============================================================

ALTER TABLE area_monthly_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE step_test_results    ENABLE ROW LEVEL SECURITY;
ALTER TABLE area_obstacles       ENABLE ROW LEVEL SECURITY;

-- Allow authenticated service role (server actions use service key)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='area_monthly_reports' AND policyname='Allow all') THEN
    CREATE POLICY "Allow all" ON area_monthly_reports FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='step_test_results' AND policyname='Allow all') THEN
    CREATE POLICY "Allow all" ON step_test_results FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='area_obstacles' AND policyname='Allow all') THEN
    CREATE POLICY "Allow all" ON area_obstacles FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ============================================================
-- Updated-at trigger
-- ============================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_area_reports_updated_at ON area_monthly_reports;
CREATE TRIGGER trg_area_reports_updated_at
  BEFORE UPDATE ON area_monthly_reports
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
