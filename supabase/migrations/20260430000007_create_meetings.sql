-- Migration: Create meetings and meeting_resolutions tables
CREATE TABLE IF NOT EXISTS meetings (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code                 TEXT UNIQUE NOT NULL,
  title                TEXT NOT NULL,
  meeting_type         TEXT NOT NULL,

  scheduled_date       DATE NOT NULL,
  scheduled_time       TIME NOT NULL,
  location             TEXT,
  meeting_link         TEXT,

  target_audience      TEXT DEFAULT 'ทุกสาขา',
  prep_required        TEXT,
  notification_message TEXT,

  status               TEXT DEFAULT 'กำหนดแล้ว'
    CHECK (status IN ('กำหนดแล้ว', 'เสร็จสิ้น', 'เลื่อน', 'ยกเลิก')),

  created_by           UUID REFERENCES auth.users(id),
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

-- Add FK from action_items to meetings (now that meetings exists)
ALTER TABLE action_items
  ADD CONSTRAINT fk_action_meeting
  FOREIGN KEY (meeting_id) REFERENCES meetings(id);

CREATE TABLE IF NOT EXISTS meeting_resolutions (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meeting_id        UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  sequence_no       INTEGER NOT NULL,
  title             TEXT NOT NULL,
  responsible_party TEXT,
  due_date          DATE,
  status            TEXT DEFAULT 'ระหว่างดำเนินการ',
  notes             TEXT,
  action_item_id    UUID REFERENCES action_items(id),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);
