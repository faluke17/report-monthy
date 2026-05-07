-- Migration: Resolution notifications for branch alerting
CREATE TABLE IF NOT EXISTS resolution_notifications (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  resolution_id     UUID NOT NULL REFERENCES meeting_resolutions(id) ON DELETE CASCADE,
  meeting_id        UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  branch_costcenter TEXT NOT NULL,
  title             TEXT NOT NULL,
  detail            TEXT,
  is_read           BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_res_notif_branch ON resolution_notifications (branch_costcenter, is_read);

ALTER TABLE resolution_notifications ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'res_notif_read' AND tablename = 'resolution_notifications') THEN
    CREATE POLICY "res_notif_read" ON resolution_notifications FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'res_notif_write' AND tablename = 'resolution_notifications') THEN
    CREATE POLICY "res_notif_write" ON resolution_notifications FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
