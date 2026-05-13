-- Add notified_at to track when admin explicitly sends notification to branches
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS notified_at TIMESTAMPTZ;
