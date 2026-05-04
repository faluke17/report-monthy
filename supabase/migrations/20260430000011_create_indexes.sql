-- Migration: Performance indexes

CREATE INDEX IF NOT EXISTS idx_monthly_branch_month
  ON monthly_reports(branch_id, report_year, report_month);
CREATE INDEX IF NOT EXISTS idx_monthly_status
  ON monthly_reports(status);

CREATE INDEX IF NOT EXISTS idx_plans_branch
  ON plans(branch_id, status);

CREATE INDEX IF NOT EXISTS idx_obstacles_branch
  ON obstacles(branch_id, status);
CREATE INDEX IF NOT EXISTS idx_obstacles_priority
  ON obstacles(priority_order, status);

CREATE INDEX IF NOT EXISTS idx_actions_branch
  ON action_items(branch_id, status);
CREATE INDEX IF NOT EXISTS idx_actions_due
  ON action_items(due_date, status);

CREATE INDEX IF NOT EXISTS idx_km_verification
  ON km_cases(verification_status);

CREATE INDEX IF NOT EXISTS idx_meetings_date
  ON meetings(scheduled_date, status);

-- Full-text search on plan action_plan and obstacles resolution_plan
CREATE INDEX IF NOT EXISTS idx_plans_fts
  ON plans USING gin(to_tsvector('thai', COALESCE(action_plan, '')));
