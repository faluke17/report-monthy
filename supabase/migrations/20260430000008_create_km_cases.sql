-- Migration: Create km_cases table
CREATE TABLE IF NOT EXISTS km_cases (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code                  TEXT UNIQUE NOT NULL,
  branch_id             UUID NOT NULL REFERENCES branches(id),
  plan_id               UUID REFERENCES plans(id),

  title                 TEXT NOT NULL,
  approach_tags         TEXT[],

  -- Results
  nrw_before            NUMERIC(5,2),
  nrw_after             NUMERIC(5,2),
  mnf_before            NUMERIC(8,2),
  mnf_after             NUMERIC(8,2),
  water_saved_daily     NUMERIC(10,2),
  value_saved_monthly   NUMERIC(12,2),

  -- Content
  key_approach          TEXT,
  lessons_learned       TEXT,
  applicable_branches   UUID[],

  -- Verification
  verification_status   TEXT DEFAULT 'รอยืนยันรอบ 2'
    CHECK (verification_status IN ('รอยืนยันรอบ 1', 'รอยืนยันรอบ 2', 'ยืนยันแล้ว')),
  verified_rounds       INTEGER DEFAULT 0,
  verified_at           TIMESTAMPTZ,

  created_by            UUID REFERENCES auth.users(id),
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);
