-- Add t2_repaired_points to five_topics_reports

ALTER TABLE five_topics_reports
  ADD COLUMN IF NOT EXISTS t2_repaired_points integer;
