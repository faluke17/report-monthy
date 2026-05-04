-- Migration: Create branches table and seed 26 branches of กปภ.เขต 10
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

CREATE TABLE IF NOT EXISTS branches (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code        TEXT UNIQUE NOT NULL,
  name_th     TEXT NOT NULL,
  province_th TEXT NOT NULL,
  region      TEXT NOT NULL DEFAULT 'R10',
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Seed all 26 branches of กปภ.เขต 10
INSERT INTO branches (code, name_th, province_th) VALUES
  -- จังหวัดนครสวรรค์ (4 สาขา)
  ('NKS', 'นครสวรรค์',        'นครสวรรค์'),
  ('TTK', 'ท่าตะโก',           'นครสวรรค์'),
  ('LYW', 'ลาดยาว',            'นครสวรรค์'),
  ('PYK', 'พยุหะคีรี',         'นครสวรรค์'),
  -- จังหวัดชัยนาท (1 สาขา)
  ('CNT', 'ชัยนาท',            'ชัยนาท'),
  -- จังหวัดอุทัยธานี (1 สาขา)
  ('UTN', 'อุทัยธานี',         'อุทัยธานี'),
  -- จังหวัดกำแพงเพชร (2 สาขา)
  ('KPP', 'กำแพงเพชร',        'กำแพงเพชร'),
  ('KNU', 'ขาณุวรลักษบุรี',    'กำแพงเพชร'),
  -- จังหวัดตาก (2 สาขา)
  ('TAK', 'ตาก',               'ตาก'),
  ('MSO', 'แม่สอด',            'ตาก'),
  -- จังหวัดสุโขทัย (5 สาขา)
  ('SKT', 'สุโขทัย',           'สุโขทัย'),
  ('TSL', 'ทุ่งเสลี่ยม',       'สุโขทัย'),
  ('SRR', 'ศรีสำโรง',          'สุโขทัย'),
  ('SWK', 'สวรรคโลก',          'สุโขทัย'),
  ('SSN', 'ศรีสัชนาลัย',       'สุโขทัย'),
  -- จังหวัดอุตรดิตถ์ (1 สาขา)
  ('UTT', 'อุตรดิตถ์',         'อุตรดิตถ์'),
  -- จังหวัดพิษณุโลก (2 สาขา)
  ('PKM', 'พิษณุโลก',          'พิษณุโลก'),
  ('NKT', 'นครไทย',            'พิษณุโลก'),
  -- จังหวัดพิจิตร (3 สาขา)
  ('PCT', 'พิจิตร',            'พิจิตร'),
  ('BML', 'บางมูลนาก',         'พิจิตร'),
  ('TPH', 'ตะพานหิน',          'พิจิตร'),
  -- จังหวัดเพชรบูรณ์ (5 สาขา)
  ('PBC', 'เพชรบูรณ์',         'เพชรบูรณ์'),
  ('LOM', 'หล่มสัก',           'เพชรบูรณ์'),
  ('CHN', 'ชนแดน',             'เพชรบูรณ์'),
  ('NNP', 'หนองไผ่',           'เพชรบูรณ์'),
  ('VCB', 'วิเชียรบุรี',       'เพชรบูรณ์');
