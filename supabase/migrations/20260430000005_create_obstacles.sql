-- Migration: Create obstacles table
CREATE TABLE IF NOT EXISTS obstacles (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code                    TEXT UNIQUE NOT NULL,
  branch_id               UUID NOT NULL REFERENCES branches(id),
  plan_id                 UUID REFERENCES plans(id),

  obstacle_type           TEXT NOT NULL,
  category                TEXT NOT NULL CHECK (category IN ('MM', 'DMA', 'P3', 'อื่นๆ')),
  area                    TEXT,

  data_quality_impact     TEXT,
  resolution_plan         TEXT,
  region_support_needed   TEXT,

  progress_pct            INTEGER DEFAULT 0 CHECK (progress_pct BETWEEN 0 AND 100),
  due_date                DATE,
  status                  TEXT DEFAULT 'รายงานใหม่'
    CHECK (status IN ('รายงานใหม่', 'ระหว่างแก้', 'รอสนับสนุน', 'ล่าช้า', 'เกินกำหนด', 'ปิดประเด็น')),

  -- Linkage flags
  auto_create_action      BOOLEAN DEFAULT true,
  send_to_meeting         BOOLEAN DEFAULT true,
  show_in_monthly_alert   BOOLEAN DEFAULT true,

  priority_order          INTEGER,

  created_by              UUID REFERENCES auth.users(id),
  resolved_by             UUID REFERENCES auth.users(id),
  resolved_at             TIMESTAMPTZ,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);
