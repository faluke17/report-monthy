-- เพิ่ม logger_id, self_supply, dmama_area_label ให้ water_nodes
--
-- logger_id : รหัส logger ใน DMAMA
--   รูปแบบ: logger_{id}_{suffix}
--   suffix "_usage" = ค่าน้ำจ่าย (outbound / water distributed) ← ส่วนใหญ่ในระบบ
--   ใช้เป็น ตัวเศษในสูตร NRW = (น้ำจ่าย - น้ำจำหน่าย) / น้ำจ่าย × 100
--
-- self_supply : MM จ่ายน้ำให้ผู้ใช้ในโซนตัวเองด้วยหรือไม่
--   false (default) = MM เป็นแค่จุดกระจาย ไม่มีลูกค้าตรง
--     → NRW ของแต่ละ DMA = water_distributed(DMA) - water_sold(DMA)
--   true = MM มีลูกค้าตรงในโซนตัวเองด้วย
--     → MM_net = outbound(MM) - Σ outbound(child DMAs)
--     → NRW(MM zone) = MM_net - water_sold(MM direct customers)
--
-- dmama_area_label : เชื่อมกับ nrw_area_stats.area_label

ALTER TABLE water_nodes
  ADD COLUMN IF NOT EXISTS logger_id        TEXT,
  ADD COLUMN IF NOT EXISTS self_supply      BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS dmama_area_label TEXT;

COMMENT ON COLUMN water_nodes.logger_id        IS 'DMAMA logger ID เช่น logger_2303_usage — suffix _usage = ค่าน้ำจ่าย (outbound)';
COMMENT ON COLUMN water_nodes.self_supply      IS 'MM เท่านั้น: true = MM จ่ายน้ำให้ลูกค้าตรงในโซนตัวเองด้วย ต้องหักลบก่อนคำนวณ NRW';
COMMENT ON COLUMN water_nodes.dmama_area_label IS 'เชื่อมกับ nrw_area_stats.area_label เพื่อดึงข้อมูล water_in/water_sold';
