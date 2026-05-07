-- Migration: Add enhanced directive fields to meeting_resolutions
ALTER TABLE meeting_resolutions
  ADD COLUMN IF NOT EXISTS source             TEXT,
  ADD COLUMN IF NOT EXISTS priority           TEXT CHECK (priority IN ('สูง', 'กลาง')),
  ADD COLUMN IF NOT EXISTS detail             TEXT,
  ADD COLUMN IF NOT EXISTS responsible_branch TEXT,
  ADD COLUMN IF NOT EXISTS responsible_dept   TEXT CHECK (responsible_dept IN ('งานบริการ', 'งานอำนวยการ', 'งานผลิต', 'งานจัดเก็บ')),
  ADD COLUMN IF NOT EXISTS admin_notes        TEXT,
  ADD COLUMN IF NOT EXISTS tracking_notes     TEXT;
