ALTER TABLE obstacles
  ADD COLUMN IF NOT EXISTS report_month INTEGER,
  ADD COLUMN IF NOT EXISTS report_year  INTEGER;

-- backfill ข้อมูลเก่าให้ใช้เดือน/ปีจาก created_at
UPDATE obstacles
SET
  report_month = EXTRACT(MONTH FROM created_at)::INTEGER,
  report_year  = EXTRACT(YEAR  FROM created_at)::INTEGER
WHERE report_month IS NULL OR report_year IS NULL;
