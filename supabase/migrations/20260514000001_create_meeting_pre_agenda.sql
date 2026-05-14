-- Pre-meeting agenda (วาระก่อนประชุม) — separate from meeting report

CREATE TABLE IF NOT EXISTS meeting_pre_agenda (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meeting_id              UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  agenda1_note            TEXT,
  agenda2_ref_meeting_no  TEXT,
  agenda4_type            TEXT NOT NULL DEFAULT 'เรื่องสืบเนื่อง',
  items3                  JSONB NOT NULL DEFAULT '[]',
  items4                  JSONB NOT NULL DEFAULT '[]',
  items5                  JSONB NOT NULL DEFAULT '[]',
  items6                  JSONB NOT NULL DEFAULT '[]',
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT meeting_pre_agenda_meeting_id_key UNIQUE (meeting_id)
);

ALTER TABLE meeting_pre_agenda ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'pre_agenda_read' AND tablename = 'meeting_pre_agenda'
  ) THEN
    CREATE POLICY "pre_agenda_read"  ON meeting_pre_agenda FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'pre_agenda_write' AND tablename = 'meeting_pre_agenda'
  ) THEN
    CREATE POLICY "pre_agenda_write" ON meeting_pre_agenda FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
