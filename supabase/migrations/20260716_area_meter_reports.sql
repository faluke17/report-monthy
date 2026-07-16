-- ============================================================
-- Area Meter Reports — กิจกรรมตรวจ/เปลี่ยนมาตรวัดน้ำรายเดือน (PDCA)
-- หนึ่งแถวต่อสาขา/เดือน (ไม่ผูกกับพื้นที่ใดพื้นที่หนึ่ง) — มาจากส่วน
-- "มาตรวัดน้ำ (ทางเลือก)" ใน public/pdca-tool.html
-- ============================================================

CREATE TABLE IF NOT EXISTS area_meter_reports (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id       uuid REFERENCES branches(id) ON DELETE CASCADE,
  report_year     integer NOT NULL,
  report_month    integer NOT NULL,

  -- 1. เปลี่ยนมาตรชำรุด / มาตรตาย / มาตรแนวโน้มชำรุด
  changed_count     integer,
  recovered_water   numeric,
  recovered_value   numeric,
  meter_size        text,
  cumulative_fy     integer,

  -- 2. ตรวจสอบมาตร 0 คิว
  zero_checked      integer,
  zero_under12      integer,
  zero_over12       integer,
  zero_dead         integer,

  -- 3. ตรวจสอบมาตรแนวโน้มชำรุด (Dmama / WATCH Center)
  trend_checked     integer,
  trend_normal      integer,
  trend_broken      integer,
  trend_reason      text,

  -- 4. ตรวจน้ำสูง-ต่ำ ที่พนักงานอ่านมาตรแจ้ง
  highlow_reported  integer,
  highlow_abnormal  integer,

  -- 5. สุ่มตรวจมาตร (5%)
  sample_checked    integer,
  sample_abnormal   integer,
  sample_normal     integer,

  -- 6. อ่านมาตร / ติดตามมาตรรายใหญ่
  bigmeter_read     integer,
  watch_followup    text,

  -- 7. โครงการเปลี่ยนมาตรตามอายุ
  project_target    integer,
  project_done      integer,
  project_status    text,

  -- 9. ติดตั้งมาตรชั่วคราว / เฉพาะกิจ
  temp_desc         text,
  temp_volume       numeric,
  temp_value        numeric,

  created_by  text,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now(),

  UNIQUE (branch_id, report_year, report_month)
);

ALTER TABLE area_meter_reports ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='area_meter_reports' AND policyname='Allow all') THEN
    CREATE POLICY "Allow all" ON area_meter_reports FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

DROP TRIGGER IF EXISTS trg_area_meter_reports_updated_at ON area_meter_reports;
CREATE TRIGGER trg_area_meter_reports_updated_at
  BEFORE UPDATE ON area_meter_reports
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
