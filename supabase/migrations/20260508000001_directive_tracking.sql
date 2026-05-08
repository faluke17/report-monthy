-- Migration: Executive Directive Tracking System
-- Date: 2026-05-08

-- 1. Add resolution_id FK to action_items
ALTER TABLE action_items
  ADD COLUMN IF NOT EXISTS resolution_id UUID REFERENCES meeting_resolutions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_action_items_resolution_id
  ON action_items (resolution_id)
  WHERE resolution_id IS NOT NULL;

-- 2. Resolution progress log (one row per branch update)
CREATE TABLE IF NOT EXISTS resolution_progress_log (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  resolution_id     UUID NOT NULL REFERENCES meeting_resolutions(id) ON DELETE CASCADE,
  action_item_id    UUID REFERENCES action_items(id) ON DELETE SET NULL,
  branch_costcenter TEXT NOT NULL,
  branch_name       TEXT NOT NULL,
  progress_pct      INTEGER NOT NULL CHECK (progress_pct BETWEEN 0 AND 100),
  note              TEXT,
  updated_by        TEXT NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_res_progress_log_resolution
  ON resolution_progress_log (resolution_id, created_at DESC);

ALTER TABLE resolution_progress_log ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'res_progress_log_read' AND tablename = 'resolution_progress_log') THEN
    CREATE POLICY "res_progress_log_read" ON resolution_progress_log FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'res_progress_log_write' AND tablename = 'resolution_progress_log') THEN
    CREATE POLICY "res_progress_log_write" ON resolution_progress_log FOR INSERT WITH CHECK (true);
  END IF;
END $$;

-- 3. Resolution steps (sub-tasks within a directive)
CREATE TABLE IF NOT EXISTS resolution_steps (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  resolution_id  UUID NOT NULL REFERENCES meeting_resolutions(id) ON DELETE CASCADE,
  step_no        INTEGER NOT NULL,
  title          TEXT NOT NULL,
  description    TEXT,
  is_complete    BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at   TIMESTAMPTZ,
  completed_by   TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (resolution_id, step_no)
);

ALTER TABLE resolution_steps ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'resolution_steps_read' AND tablename = 'resolution_steps') THEN
    CREATE POLICY "resolution_steps_read" ON resolution_steps FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'resolution_steps_write' AND tablename = 'resolution_steps') THEN
    CREATE POLICY "resolution_steps_write" ON resolution_steps FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
