ALTER TABLE area_obstacles
  ADD COLUMN IF NOT EXISTS priority_order integer DEFAULT 2;
