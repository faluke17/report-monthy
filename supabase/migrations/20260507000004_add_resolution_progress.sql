-- Migration: Add progress tracking fields to meeting_resolutions
ALTER TABLE meeting_resolutions
  ADD COLUMN IF NOT EXISTS progress_pct        INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS progress_note       TEXT,
  ADD COLUMN IF NOT EXISTS progress_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS progress_updated_by TEXT;
