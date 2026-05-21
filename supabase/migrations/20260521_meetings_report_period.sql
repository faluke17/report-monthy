ALTER TABLE meetings
  ADD COLUMN IF NOT EXISTS report_year  integer,
  ADD COLUMN IF NOT EXISTS report_month integer;
