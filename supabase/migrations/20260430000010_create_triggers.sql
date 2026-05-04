-- Migration: Create triggers and database functions

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER tr_plans_updated BEFORE UPDATE ON plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_monthly_updated BEFORE UPDATE ON monthly_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_obstacles_updated BEFORE UPDATE ON obstacles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_actions_updated BEFORE UPDATE ON action_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_meetings_updated BEFORE UPDATE ON meetings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_resolutions_updated BEFORE UPDATE ON meeting_resolutions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_km_updated BEFORE UPDATE ON km_cases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_profile_updated BEFORE UPDATE ON users_profile
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Set obstacle priority_order based on category
CREATE OR REPLACE FUNCTION set_obstacle_priority()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.priority_order = CASE NEW.category
    WHEN 'MM'  THEN 1
    WHEN 'DMA' THEN 2
    WHEN 'P3'  THEN 3
    ELSE 4
  END;
  RETURN NEW;
END;
$$;

CREATE TRIGGER tr_obstacle_priority BEFORE INSERT OR UPDATE ON obstacles
  FOR EACH ROW EXECUTE FUNCTION set_obstacle_priority();

-- Auto-create action_item when obstacle is created (if flag set)
CREATE OR REPLACE FUNCTION auto_create_action_from_obstacle()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_branch_code TEXT;
  v_seq         INTEGER;
  v_code        TEXT;
BEGIN
  IF NOT NEW.auto_create_action THEN
    RETURN NEW;
  END IF;

  SELECT code INTO v_branch_code FROM branches WHERE id = NEW.branch_id;
  SELECT COUNT(*) + 1 INTO v_seq FROM action_items WHERE branch_id = NEW.branch_id;
  v_code := 'ORD-' || v_branch_code || '-' || LPAD(v_seq::TEXT, 4, '0');

  INSERT INTO action_items (
    code, branch_id, obstacle_id, plan_id, title, owner, due_date, status, created_by
  ) VALUES (
    v_code,
    NEW.branch_id,
    NEW.id,
    NEW.plan_id,
    'เร่งแก้ไขอุปสรรค: ' || NEW.obstacle_type || COALESCE(' · ' || NEW.area, ''),
    'ผจก.สาขา',
    NEW.due_date,
    'รอดำเนินการ',
    NEW.created_by
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER tr_auto_action AFTER INSERT ON obstacles
  FOR EACH ROW EXECUTE FUNCTION auto_create_action_from_obstacle();

-- Supabase Realtime: enable for relevant tables
ALTER PUBLICATION supabase_realtime ADD TABLE monthly_reports;
ALTER PUBLICATION supabase_realtime ADD TABLE obstacles;
ALTER PUBLICATION supabase_realtime ADD TABLE action_items;
ALTER PUBLICATION supabase_realtime ADD TABLE meetings;
