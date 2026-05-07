-- nrw_area_stats: monthly outbound & distribute_all per area/DMA from dmama API
CREATE TABLE IF NOT EXISTS nrw_area_stats (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  dmama_branch_id INTEGER NOT NULL,
  report_year     INTEGER NOT NULL,
  report_month    INTEGER NOT NULL,
  area_label      TEXT NOT NULL,
  area_name       TEXT NOT NULL,
  outbound        NUMERIC,
  distribute_all  NUMERIC,
  fetched_at      TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE (dmama_branch_id, report_year, report_month, area_label)
);

ALTER TABLE nrw_area_stats ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'nrw_area_stats' AND policyname = 'Allow all'
  ) THEN
    CREATE POLICY "Allow all" ON nrw_area_stats FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_nrw_area_stats_lookup
  ON nrw_area_stats(dmama_branch_id, report_year, report_month);
