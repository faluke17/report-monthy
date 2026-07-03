-- Link obstacles auto-synced from PDCA area reports back to their source,
-- so edits to an area report update the same tracker row instead of creating duplicates.
ALTER TABLE obstacles
  ADD COLUMN IF NOT EXISTS area_report_id UUID REFERENCES area_monthly_reports(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_obstacles_area_report_id ON obstacles(area_report_id);
