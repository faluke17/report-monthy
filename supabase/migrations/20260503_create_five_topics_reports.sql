-- ============================================================
-- Five Topics Reports — รายงาน 5 หัวข้อ (กปภ. มาตรฐาน)
-- ============================================================

CREATE TABLE IF NOT EXISTS five_topics_reports (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id       uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  report_year     integer NOT NULL,
  report_month    integer NOT NULL CHECK (report_month BETWEEN 1 AND 12),

  -- ข้อ 1: การวิเคราะห์พื้นที่หาท่อแตกท่อรั่ว (Step Test)
  t1_dma_count        integer,
  t1_conducted_date   date,
  t1_notes            text,

  -- ข้อ 2: การสำรวจน้ำสูญเสียเชิงรุก (ALC)
  t2_frequency        integer,
  t2_leak_points      integer,
  t2_water_loss_m3h   numeric(10,2),
  t2_notes            text,

  -- ข้อ 3: การ PM ระบบจ่ายน้ำ
  t3_dma_pm_count     integer,
  t3_prv_pm_count     integer,
  t3_notes            text,

  -- ข้อ 4: การระบายตะกอนระบบท่อจ่ายน้ำ
  t4_flush_points     integer,
  t4_volume_m3        numeric(10,2),
  t4_notes            text,

  -- ข้อ 5: การเปลี่ยนมาตรวัดน้ำชำรุด
  t5_meters_replaced  integer,
  t5_notes            text,

  status          text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted')),
  submitted_at    timestamptz,
  created_by      text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  UNIQUE (branch_id, report_year, report_month)
);

-- RLS
ALTER TABLE five_topics_reports ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'five_topics_reports' AND policyname = 'Allow all'
  ) THEN
    CREATE POLICY "Allow all" ON five_topics_reports FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- updated_at function (idempotent)
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_five_topics_updated_at ON five_topics_reports;
CREATE TRIGGER trg_five_topics_updated_at
  BEFORE UPDATE ON five_topics_reports
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
