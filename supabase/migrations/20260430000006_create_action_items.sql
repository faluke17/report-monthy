-- Migration: Create action_items table
CREATE TABLE IF NOT EXISTS action_items (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code         TEXT UNIQUE NOT NULL,
  branch_id    UUID NOT NULL REFERENCES branches(id),
  plan_id      UUID REFERENCES plans(id),
  obstacle_id  UUID REFERENCES obstacles(id),
  meeting_id   UUID,

  title        TEXT NOT NULL,
  detail       TEXT,
  owner        TEXT NOT NULL,
  due_date     DATE,

  status       TEXT DEFAULT 'รอดำเนินการ'
    CHECK (status IN ('รอดำเนินการ', 'ระหว่างดำเนินการ', 'รออนุมัติ', 'แล้วเสร็จ', 'เกินกำหนด', 'ยกเลิก')),

  evidence_url TEXT[],
  notes        TEXT,
  completed_at TIMESTAMPTZ,

  created_by   UUID REFERENCES auth.users(id),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);
