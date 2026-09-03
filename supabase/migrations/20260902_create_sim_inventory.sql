-- Migration: SIM & Data Logger Inventory Management (หน้า /sims)
-- เก็บว่าเบอร์ SIM แต่ละเบอร์ถูกเสียบอยู่ในอุปกรณ์ (data logger) จุดไหน ของสาขาไหน
-- เข้าถึงหน้านี้ได้เฉพาะ 2 user (18074, admin) — บังคับที่ app layer (lib/sim-access.ts)
-- ไม่ใช่ผ่าน role ปกติ จึงไม่ผูก RLS policy กับ users_profile.role

CREATE TABLE IF NOT EXISTS sim_inventory (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seq          INTEGER,                          -- ลำดับเดิมจากไฟล์ Excel ต้นฉบับ (เก็บไว้อ้างอิง ไม่ใช่ unique key)
  branch_id    UUID REFERENCES branches(id),      -- NULL = ยังไม่ระบุสาขา ("-") หรือเป็นของส่วนกลาง
  branch_label TEXT NOT NULL,                      -- ชื่อสาขาดิบจากไฟล์ต้นฉบับ เช่น "สาขานครสวรรค์", "-", "งานน้ำสูญเสีย กรจ.10"
  device_point TEXT NOT NULL DEFAULT '',            -- จุดติดตั้ง DMA / อุปกรณ์ (เช่น "MM-04-หนองกระโดน", "ไม่ได้ใช้งาน")
  phone_number TEXT,                                -- เบอร์โทรศัพท์ SIM
  serial_no    TEXT,                                -- Serial No. ของ SIM (เก็บเป็น TEXT เสมอ กัน Excel ปัดเศษเลขยาว)
  network      TEXT,                                -- เครือข่าย เช่น AIS / TRUE / DTAC
  note         TEXT,
  created_by   TEXT,
  updated_by   TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sim_inventory_branch_id ON sim_inventory(branch_id);
CREATE INDEX IF NOT EXISTS idx_sim_inventory_phone ON sim_inventory(phone_number);

ALTER TABLE sim_inventory ENABLE ROW LEVEL SECURITY;
-- ไม่มี policy ตั้งใจ: อ่าน/เขียนได้เฉพาะผ่าน server action (service role key) ที่เช็ค
-- allowlist user ใน lib/sim-access.ts เท่านั้น — anon/authenticated key เข้าไม่ได้เลย
