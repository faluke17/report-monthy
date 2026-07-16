-- Add t1_areas (jsonb) and t3_p3_pm_count to five_topics_reports

ALTER TABLE five_topics_reports
  ADD COLUMN IF NOT EXISTS t1_areas jsonb,
  ADD COLUMN IF NOT EXISTS t3_p3_pm_count integer;
