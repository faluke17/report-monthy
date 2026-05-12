-- Fix: remove precision limit on nrw_branch_monthly columns
-- NUMERIC(14,2) and NUMERIC(6,2) can overflow with large water volume values

ALTER TABLE nrw_branch_monthly
  ALTER COLUMN water_produced TYPE NUMERIC,
  ALTER COLUMN water_sold     TYPE NUMERIC,
  ALTER COLUMN water_free     TYPE NUMERIC,
  ALTER COLUMN blow_off       TYPE NUMERIC;
