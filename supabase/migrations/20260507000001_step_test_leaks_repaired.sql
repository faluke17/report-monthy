ALTER TABLE step_test_results
  ADD COLUMN IF NOT EXISTS leaks_repaired integer;
