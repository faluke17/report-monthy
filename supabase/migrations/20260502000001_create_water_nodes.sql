-- Migration: water distribution node hierarchy (MM → DMA → SUB)
CREATE TABLE IF NOT EXISTS water_nodes (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id   UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  node_type   TEXT NOT NULL CHECK (node_type IN ('MM', 'DMA', 'SUB', 'VD')),
  code        TEXT NOT NULL,
  name_th     TEXT,
  parent_id   UUID REFERENCES water_nodes(id) ON DELETE CASCADE,
  status      TEXT CHECK (status IN ('จ่าย', 'ส่ง', 'รอปรับโซน')),
  user_count  INTEGER,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (branch_id, code)
);

ALTER TABLE water_nodes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'water_nodes' AND policyname = 'Allow all'
  ) THEN
    CREATE POLICY "Allow all" ON water_nodes FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_water_nodes_branch_type
  ON water_nodes(branch_id, node_type) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_water_nodes_parent
  ON water_nodes(parent_id) WHERE is_active = true;
