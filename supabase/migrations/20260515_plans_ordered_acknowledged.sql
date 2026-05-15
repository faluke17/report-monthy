-- Add ordered_by (creator display name) and acknowledged_by/at to plans
ALTER TABLE plans
  ADD COLUMN IF NOT EXISTS ordered_by      TEXT,
  ADD COLUMN IF NOT EXISTS acknowledged_by TEXT,
  ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMPTZ;
