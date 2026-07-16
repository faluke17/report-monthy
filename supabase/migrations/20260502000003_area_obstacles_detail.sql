ALTER TABLE area_obstacles
  ADD COLUMN IF NOT EXISTS obstacle_detail       text,
  ADD COLUMN IF NOT EXISTS resolution_plan       text,
  ADD COLUMN IF NOT EXISTS impact                text,
  ADD COLUMN IF NOT EXISTS region_support_needed text;
