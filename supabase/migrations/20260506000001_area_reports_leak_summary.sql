ALTER TABLE area_monthly_reports
  ADD COLUMN IF NOT EXISTS leaks_repaired integer,
  ADD COLUMN IF NOT EXISTS leaks_pending  integer;
