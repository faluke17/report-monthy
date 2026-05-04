-- Migration: Meeting Acknowledgments (สาขากดรับทราบการแจ้งเตือนประชุม)
CREATE TABLE IF NOT EXISTS meeting_acknowledgments (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meeting_id        UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  branch_name       TEXT NOT NULL,
  acknowledged_by   TEXT NOT NULL,
  acknowledged_name TEXT,
  acknowledged_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(meeting_id, branch_name)
);

CREATE INDEX IF NOT EXISTS idx_meeting_acks_meeting_id ON meeting_acknowledgments(meeting_id);
