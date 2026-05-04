-- Migration: Create plans table
CREATE TABLE IF NOT EXISTS plans (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code                 TEXT UNIQUE NOT NULL,
  branch_id            UUID NOT NULL REFERENCES branches(id),
  owner_level          TEXT CHECK (owner_level IN ('region', 'branch')),
  plan_type            TEXT NOT NULL,
  approach_group       TEXT NOT NULL,
  area                 TEXT,

  -- Baseline
  baseline_nrw         NUMERIC(5,2),
  baseline_mnf         NUMERIC(8,2),
  baseline_daily_supply NUMERIC(10,2),
  baseline_daily_sale  NUMERIC(10,2),

  -- Targets
  target_nrw           NUMERIC(5,2),
  target_mnf           NUMERIC(8,2),
  target_water_save    NUMERIC(10,2),

  -- Plan details
  action_plan          TEXT,
  resources            TEXT,
  priority             TEXT CHECK (priority IN ('สูง', 'กลาง', 'ต่ำ')),
  start_date           DATE,
  end_date             DATE,
  pic                  TEXT,

  -- Status
  status               TEXT DEFAULT 'ระหว่างดำเนินการ'
    CHECK (status IN ('ระหว่างดำเนินการ', 'สำเร็จ', 'ล่าช้า', 'ยกเลิก', 'รออนุมัติ')),
  progress_pct         INTEGER DEFAULT 0 CHECK (progress_pct BETWEEN 0 AND 100),

  -- Meta
  created_by           UUID REFERENCES auth.users(id),
  approved_by          UUID REFERENCES auth.users(id),
  approved_at          TIMESTAMPTZ,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);
