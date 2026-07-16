-- node_flow_daily : ข้อมูลน้ำจ่ายรายวันต่อ node (raw + cleaned จาก DMAMA)
-- node_nrw_monthly: NRW สรุปรายเดือนต่อ node (หลัง tree calculation)

CREATE TABLE IF NOT EXISTS node_flow_daily (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  water_node_id  UUID NOT NULL REFERENCES water_nodes(id) ON DELETE CASCADE,
  report_year    SMALLINT NOT NULL,
  report_month   SMALLINT NOT NULL,
  day_num        SMALLINT NOT NULL,       -- 1–31
  raw_value      NUMERIC,                 -- ค่าดิบจาก DMAMA (null = ไม่มีข้อมูล)
  cleaned_value  NUMERIC NOT NULL,        -- ค่าหลัง clean (เติม median ถ้าผิดปกติ)
  flag           TEXT NOT NULL DEFAULT 'ok',
  -- ok | ERROR | ZERO | DEVICE_FAIL | OUTLIER | MISSING
  fill_median    NUMERIC,                 -- median ที่ใช้เติม (null ถ้า flag=ok)
  synced_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT node_flow_daily_uq UNIQUE (water_node_id, report_year, report_month, day_num)
);

CREATE TABLE IF NOT EXISTS node_nrw_monthly (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  water_node_id   UUID NOT NULL REFERENCES water_nodes(id) ON DELETE CASCADE,
  report_year     SMALLINT NOT NULL,
  report_month    SMALLINT NOT NULL,
  gross_flow      NUMERIC,    -- ผลรวม cleaned_value (ปริมาณน้ำจ่ายดิบทั้ง node)
  net_flow        NUMERIC,    -- gross หักโซน child DMA (กรณี MM self_supply=true เท่านั้น)
  days_data       SMALLINT,   -- วันที่มีข้อมูล raw (raw_value IS NOT NULL)
  days_total      SMALLINT,   -- จำนวนวันในเดือน
  has_device_fail BOOLEAN NOT NULL DEFAULT FALSE,
  distribute_all  NUMERIC,    -- น้ำจำหน่าย (จาก nrw_area_stats ผ่าน dmama_area_label)
  nrw_pct         NUMERIC,    -- (net_flow - distribute_all) / net_flow × 100
  data_source     TEXT,       -- 'dmama_logger' | 'device_fail' | 'no_logger'
  computed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT node_nrw_monthly_uq UNIQUE (water_node_id, report_year, report_month)
);

CREATE INDEX IF NOT EXISTS idx_node_flow_daily_month
  ON node_flow_daily (water_node_id, report_year, report_month);

CREATE INDEX IF NOT EXISTS idx_node_nrw_monthly_month
  ON node_nrw_monthly (water_node_id, report_year, report_month);
