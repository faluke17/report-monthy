-- Migration: Create meeting agenda tables

CREATE TABLE IF NOT EXISTS meeting_agenda_headers (
  id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meeting_id                  UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  start_time                  TEXT NOT NULL DEFAULT '09:00',

  agenda1_detail              TEXT,
  agenda1_resolution          TEXT NOT NULL DEFAULT 'รับทราบ',
  agenda1_resolution_detail   TEXT,

  agenda2_meeting_no          TEXT,
  agenda2_resolution          TEXT NOT NULL DEFAULT 'รับทราบ',
  agenda2_resolution_detail   TEXT,

  agenda4_type                TEXT NOT NULL DEFAULT 'เรื่องสืบเนื่อง',

  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT meeting_agenda_headers_meeting_id_key UNIQUE (meeting_id)
);

CREATE TABLE IF NOT EXISTS meeting_agenda_subitems (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meeting_id        UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  agenda_no         INTEGER NOT NULL,
  item_no           INTEGER NOT NULL,
  title             TEXT NOT NULL DEFAULT '',
  detail            TEXT,
  detail_table      JSONB,
  resolution        TEXT NOT NULL DEFAULT 'รับทราบ',
  resolution_detail TEXT,
  sort_order        INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE meeting_agenda_headers  ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_agenda_subitems ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read agenda
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'agenda_headers_read'   AND tablename = 'meeting_agenda_headers')  THEN
    CREATE POLICY "agenda_headers_read"   ON meeting_agenda_headers  FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'agenda_subitems_read'  AND tablename = 'meeting_agenda_subitems') THEN
    CREATE POLICY "agenda_subitems_read"  ON meeting_agenda_subitems FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'agenda_headers_write'  AND tablename = 'meeting_agenda_headers')  THEN
    CREATE POLICY "agenda_headers_write"  ON meeting_agenda_headers  FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'agenda_subitems_write' AND tablename = 'meeting_agenda_subitems') THEN
    CREATE POLICY "agenda_subitems_write" ON meeting_agenda_subitems FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
