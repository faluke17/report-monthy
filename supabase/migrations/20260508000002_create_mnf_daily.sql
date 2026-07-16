-- mnf_daily: daily MNF per logger/node from dmama flow_rate_in_mnf API
-- logger_id = numeric ID extracted from "logger_XXXX" key
-- node_label = display name from meta.header (e.g. "MM-01", "DMA-03")
CREATE TABLE IF NOT EXISTS mnf_daily (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  dmama_branch_id INTEGER NOT NULL,
  logger_id       INTEGER NOT NULL,
  node_label      TEXT NOT NULL,
  record_date     DATE NOT NULL,
  mnf_flow        NUMERIC,
  min_pressure    NUMERIC,
  mnf_at          TEXT,
  report_year     INTEGER NOT NULL,
  report_month    INTEGER NOT NULL,
  fetched_at      TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE (dmama_branch_id, logger_id, record_date)
);

ALTER TABLE mnf_daily ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'mnf_daily' AND policyname = 'Allow all'
  ) THEN
    CREATE POLICY "Allow all" ON mnf_daily FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_mnf_daily_branch_month
  ON mnf_daily(dmama_branch_id, report_year, report_month);

CREATE INDEX IF NOT EXISTS idx_mnf_daily_date
  ON mnf_daily(record_date);
