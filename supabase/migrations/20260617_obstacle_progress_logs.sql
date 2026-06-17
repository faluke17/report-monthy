-- obstacle_progress_logs: ประวัติการอัพเดทความคืบหน้าของอุปสรรค
CREATE TABLE IF NOT EXISTS obstacle_progress_logs (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  obstacle_id  uuid        NOT NULL REFERENCES obstacles(id) ON DELETE CASCADE,
  message      text        NOT NULL,
  progress_pct int         CHECK (progress_pct IS NULL OR (progress_pct >= 0 AND progress_pct <= 100)),
  is_closed    bool        NOT NULL DEFAULT false,
  entry_type   varchar(20) NOT NULL DEFAULT 'branch_update', -- 'branch_update' | 'region_note' | 'system'
  created_by   varchar     NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_opl_obstacle_id ON obstacle_progress_logs(obstacle_id, created_at DESC);

-- Denormalized สำหรับแสดง list view โดยไม่ต้อง join logs
ALTER TABLE obstacles ADD COLUMN IF NOT EXISTS last_log_at      timestamptz;
ALTER TABLE obstacles ADD COLUMN IF NOT EXISTS last_log_message text;
