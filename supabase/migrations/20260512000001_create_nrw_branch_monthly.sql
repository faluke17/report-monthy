-- nrw_branch_monthly: monthly NRW data for all 26 branches (district-level overview)
-- Water loss formula: water_produced - water_sold - water_free - blow_off
-- NRW rate calculated in app, not stored

CREATE TABLE IF NOT EXISTS nrw_branch_monthly (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_name   TEXT NOT NULL,
  fiscal_year   INTEGER NOT NULL,        -- Thai Buddhist Era, e.g., 2569
  month         INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  water_produced  NUMERIC(14,2),         -- น้ำผลิตจ่าย (ลบ.ม.)
  water_sold      NUMERIC(14,2),         -- น้ำจำหน่าย
  water_free      NUMERIC(14,2),         -- น้ำจ่ายฟรี
  blow_off        NUMERIC(14,2),         -- Blow off
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (branch_name, fiscal_year, month)
);

ALTER TABLE nrw_branch_monthly ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'nrw_branch_monthly' AND policyname = 'Allow all'
  ) THEN
    CREATE POLICY "Allow all" ON nrw_branch_monthly FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_nrw_branch_monthly_lookup
  ON nrw_branch_monthly(fiscal_year, month);

CREATE INDEX IF NOT EXISTS idx_nrw_branch_monthly_branch
  ON nrw_branch_monthly(branch_name, fiscal_year);
