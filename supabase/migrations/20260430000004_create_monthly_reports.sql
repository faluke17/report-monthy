-- Migration: Create monthly_reports table with generated columns
CREATE TABLE IF NOT EXISTS monthly_reports (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id           UUID NOT NULL REFERENCES branches(id),
  plan_id             UUID REFERENCES plans(id),
  report_year         INTEGER NOT NULL,
  report_month        INTEGER NOT NULL CHECK (report_month BETWEEN 1 AND 12),

  -- Water volume data
  volume_distributed  NUMERIC(12,2),
  volume_sold         NUMERIC(12,2),
  days_in_month       INTEGER DEFAULT 30,
  mnf_latest          NUMERIC(8,2),
  mnf_measured_date   DATE,
  daily_supply        NUMERIC(10,2),

  -- Calculated via generated columns (always consistent)
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

  -- Output metrics
  leaks_found         INTEGER DEFAULT 0,
  leaks_repaired      INTEGER DEFAULT 0,
  leaks_pending       INTEGER DEFAULT 0,
  leaks_repeat        INTEGER DEFAULT 0,
  meters_abnormal     INTEGER DEFAULT 0,

  -- PDCA
  pdca_do             TEXT,
  pdca_act            TEXT,

  -- Status
  status              TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'reviewed')),
  submitted_at        TIMESTAMPTZ,

  created_by          UUID REFERENCES auth.users(id),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(branch_id, report_year, report_month)
);
