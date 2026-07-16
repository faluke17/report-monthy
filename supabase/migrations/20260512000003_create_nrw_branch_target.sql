-- nrw_branch_target: annual NRW target per branch per fiscal year
-- Separated from monthly data so users enter once per year

CREATE TABLE IF NOT EXISTS nrw_branch_target (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_name TEXT NOT NULL,
  fiscal_year INTEGER NOT NULL,
  target_nrw  NUMERIC,
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (branch_name, fiscal_year)
);

ALTER TABLE nrw_branch_target ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'nrw_branch_target' AND policyname = 'Allow all'
  ) THEN
    CREATE POLICY "Allow all" ON nrw_branch_target FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_nrw_branch_target_year
  ON nrw_branch_target(fiscal_year);
