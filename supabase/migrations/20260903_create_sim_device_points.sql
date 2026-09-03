-- Migration: SIM Device Point Catalog (ใช้เป็นรายการ dropdown จุดติดตั้งอุปกรณ์ ในฟอร์มเพิ่ม/แก้ไข SIM หน้า /sims)
-- ที่มาข้อมูลเริ่มต้น: ไฟล์ "รายงานความผิดปกติของอุปกรณ์ Data Logger.xlsx" (รายชื่อจุดติดตั้ง DMA/MM/P3
-- ทางการของแต่ละสาขา ทั้ง 26 สาขา) — นำเข้าด้วย scripts/import-device-points.mjs
-- เมื่อผู้ใช้พิมพ์จุดติดตั้งใหม่ที่ยังไม่มีในรายการผ่านฟอร์ม /sims ระบบจะเพิ่มแถวใหม่ที่นี่ให้อัตโนมัติ
-- (source = 'custom') เพื่อให้ขึ้นเป็นตัวเลือก dropdown ในครั้งถัดไป — ดู ensureDevicePoint() ใน
-- app/actions/sim-inventory.ts

CREATE TABLE IF NOT EXISTS sim_device_points (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id    UUID REFERENCES branches(id),      -- NULL = กลุ่มพิเศษที่ไม่ผูกสาขาจริง ("-", "งานน้ำสูญเสีย กรจ.10")
  branch_label TEXT NOT NULL,                       -- ชื่อสาขาดิบ เช่น "สาขานครสวรรค์" (ให้ตรงกับ sim_inventory.branch_label)
  device_point TEXT NOT NULL,                       -- จุดติดตั้ง DMA / อุปกรณ์ เช่น "DMA-02-หน้าไปรษณีย์เก้าเลี้ยว"
  source       TEXT NOT NULL DEFAULT 'catalog',     -- 'catalog' = นำเข้าจากไฟล์ Excel ต้นฉบับ, 'existing' = backfill จาก sim_inventory ที่มีอยู่ก่อน, 'custom' = พิมพ์เพิ่มเองผ่านฟอร์ม
  created_by   TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (branch_label, device_point)
);

CREATE INDEX IF NOT EXISTS idx_sim_device_points_branch_id ON sim_device_points(branch_id);

ALTER TABLE sim_device_points ENABLE ROW LEVEL SECURITY;
-- ไม่มี policy ตั้งใจ (เหมือน sim_inventory): อ่าน/เขียนได้เฉพาะผ่าน server action (service role key)
-- ที่เช็ค allowlist user ใน lib/sim-access.ts เท่านั้น — anon/authenticated key เข้าไม่ได้เลย
