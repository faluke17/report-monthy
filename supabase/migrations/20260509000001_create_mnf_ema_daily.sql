-- mnf_ema_daily: computed EMA-14 alert status per logger/node pair
-- Derived from mnf_daily after each sync via computeEmaForDateRange()
CREATE TABLE IF NOT EXISTS mnf_ema_daily (
  id                UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  dmama_branch_id   INTEGER     NOT NULL,
  logger_id         INTEGER     NOT NULL,
  node_label        TEXT        NOT NULL,
  record_date       DATE        NOT NULL,
  mnf_flow          NUMERIC,
  ema_value         NUMERIC     NOT NULL,
  diff_percent      NUMERIC     NOT NULL,
  consecutive_count INTEGER     NOT NULL DEFAULT 0,
  alert_status      TEXT        NOT NULL
    CHECK (alert_status IN ('green','yellow','red_spike','red_accumulated')),
  computed_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (dmama_branch_id, logger_id, record_date)
);

ALTER TABLE mnf_ema_daily ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'mnf_ema_daily' AND policyname = 'Allow all'
  ) THEN
    CREATE POLICY "Allow all" ON mnf_ema_daily FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_mnf_ema_daily_branch_date
  ON mnf_ema_daily (dmama_branch_id, record_date DESC);

CREATE INDEX IF NOT EXISTS idx_mnf_ema_daily_status_date
  ON mnf_ema_daily (alert_status, record_date DESC);

CREATE INDEX IF NOT EXISTS idx_mnf_ema_daily_node_date
  ON mnf_ema_daily (dmama_branch_id, logger_id, record_date);

-- View: latest row per node — used by AlertPanel and /mnf-monitor page
CREATE OR REPLACE VIEW mnf_ema_latest AS
SELECT DISTINCT ON (dmama_branch_id, logger_id)
  dmama_branch_id,
  logger_id,
  node_label,
  record_date,
  mnf_flow,
  ema_value,
  diff_percent,
  consecutive_count,
  alert_status,
  computed_at
FROM mnf_ema_daily
ORDER BY dmama_branch_id, logger_id, record_date DESC;
