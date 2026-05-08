# MNF EMA Alert System — บันทึกการคิดและการทำงาน

---

## 1. ปัญหาที่ต้องการแก้

ระบบมี 26 สาขา แต่ละสาขามีหลาย DMA/MM node (logger)
แต่ละวัน DMAMA API ส่งค่า MNF (Minimum Night Flow) รายวันมาเก็บใน `mnf_daily`

**ปัญหาเดิม:** แจ้งเตือนทุกวันโดยเปรียบกับค่าเฉลี่ย 7 วัน
→ มีสัญญาณมากเกินไป (noise) ทุกสาขาทุกวัน
→ ทีมเขตจะ "ชินชา" กับ alert และหยุดดูในที่สุด

**สิ่งที่ต้องการ:** ระบบที่แจ้งเตือนเฉพาะเมื่อ "ผิดปกติจริงๆ"
โดยใช้ EMA เป็น baseline แทนค่าเฉลี่ยธรรมดา

---

## 2. ทำไมถึงเลือก EMA (Exponential Moving Average)

| ค่าเฉลี่ยธรรมดา | EMA |
|----------------|-----|
| ทุกวันมีน้ำหนักเท่ากัน | วันใหม่มีน้ำหนักมากกว่าวันเก่า |
| ถ้าเกิด spike เดือนที่แล้ว ยังส่งผลอยู่ | spike เก่าค่อยๆ ลดน้ำหนักลง |
| ตอบสนองช้าต่อแนวโน้มใหม่ | ตอบสนองเร็วกว่า แต่ยังกรอง noise ได้ |

EMA เหมือนเส้นแนวโน้มของหุ้น — ดูว่า MNF ตอนนี้สูงกว่าแนวโน้มล่าสุดเท่าไหร่

**สูตร:**
```
EMA วันนี้ = MNF วันนี้ × 0.1333 + EMA เมื่อวาน × 0.8667
Diff%      = (MNF วันนี้ - EMA เมื่อวาน) / EMA เมื่อวาน × 100
```

Multiplier = 2 / (14 + 1) = 0.1333 → ใช้ period 14 วัน

---

## 3. การค้นพบจากข้อมูลจริง (ต.ค. 2568 – พ.ค. 2569)

### 3.1 CV% สูงมากกว่าที่คาด

หลังจาก query ความผันผวนจากข้อมูลจริง พบว่า:

- **node ที่เสถียรที่สุดในระบบ** ยังมี CV% = 23%
- หมายความว่า MNF ผันผวนตามธรรมชาติ ±23% จากค่าเฉลี่ยอยู่แล้ว
- ถ้าตั้ง WARNING_LIMIT = 10% → จะ alert ทุกวัน ทุก node

### 3.2 พบ 3 pattern ในข้อมูล

**Pattern A — Tiny nodes** (median < 1 m³/hr)
- น้ำไหลแทบไม่มี ไม่มีนัยสำคัญทางปฏิบัติ
- ตัวอย่าง: DMA-09 branch 45 (median = 0.40), DMA-04 branch 33 (median = 0.12)

**Pattern B — Bimodal nodes** (q1 < median × 10%)
- Q1 กับ median ต่างกันมากผิดปกติ
- แปลว่า node นี้มีช่วงที่ค่าเกือบเป็นศูนย์บ่อยๆ
  (zone ถูกปิดวาล์ว / logger offline / ไม่มีน้ำผ่าน)
- EMA จะถูกดึงลงในช่วง near-zero ทำให้ alert ผิดพลาด
- ตัวอย่าง: MM-07 branch 38 (q1=1.58 แต่ median=386)

**Pattern C — Normal nodes** (ที่เหลือ)
- ข้อมูลสม่ำเสมอ ใช้ EMA ได้
- IQR/median อยู่ที่ ~25–90% แล้วแต่ node

### 3.3 Threshold ที่ควรเป็น

```
จาก IQR analysis พบว่า:
  - วันปกติ MNF ของ normal node ผันผวนจาก EMA ได้ถึง ±20–40%
  - ดังนั้น WARNING ต้องสูงกว่า 40% ถึงจะมีความหมาย

ผลสรุป:
  WARNING_LIMIT (เดิม 10%)  → ปรับเป็น  50%
  SPIKE_LIMIT   (เดิม 30%)  → ปรับเป็น 200%
  DAYS_TO_ALERT             → คงไว้ 3 วัน
```

---

## 4. Logic การทำงานทั้งระบบ

```
[ทุกวัน / ทุกครั้งที่ sync]

STEP 1: mnf-sync ดึงข้อมูลจาก DMAMA API
        → upsert เข้า mnf_daily

STEP 2: เรียก computeEmaForDateRange() อัตโนมัติ
        → ดึงข้อมูลย้อนหลัง 60 วัน (warmup window)

STEP 3: จัดกลุ่มแต่ละ node (dmama_branch_id + logger_id)

STEP 4: classify แต่ละ node
        tiny    → skip ไม่คำนวณ
        bimodal → skip ไม่คำนวณ
        normal  → คำนวณ EMA ต่อไป

STEP 5: computeEmaSeries() สำหรับ normal nodes
        - วันแรกที่มีค่า → EMA = ค่านั้น, Diff% = 0
        - วันถัดมา →
            ema_new = flow × 0.1333 + ema_prev × 0.8667
            diff%   = (flow - ema_prev) / ema_prev × 100
            consecutive = diff% >= 50% ? prev+1 : reset 0
            status  = ประเมินตาม 4 tier

STEP 6: filter เอาเฉพาะวันที่ >= fromDate (ตัด warmup rows)
        → upsert เข้า mnf_ema_daily ทีละ 500 rows
```

---

## 5. 4 Status Tiers

| Status | สี | เงื่อนไข | ความหมาย | การดำเนินการ |
|--------|---|---------|----------|------------|
| green | 🟢 | Diff% < 50% | ปกติ | ไม่ทำอะไร |
| yellow | 🟡 | Diff% ≥ 50% แต่ consecutive < 3 วัน | เริ่มสูงขึ้น เฝ้าดู | ทีมเขตเห็นบน dashboard เท่านั้น |
| red_accumulated | 🔴 | consecutive ≥ 3 วันติดกัน | รั่วซึมค่อยๆ ขยาย | แนะนำ Step Test |
| red_spike | 🔴 | Diff% ≥ 200% (ทันที) | พุ่งทะยานกระทันหัน | สงสัยท่อแตก แจ้งด่วน |

**หมายเหตุ:** red_spike ตรวจสอบก่อน red_accumulated
เพราะการพุ่งทะยานฉับพลันอันตรายกว่าการสะสม

---

## 6. การจัดการ Edge Cases

| กรณี | การจัดการ |
|------|---------|
| ข้อมูลว่าง (null) ก่อนมีค่าแรก | ข้ามทั้งหมด ไม่มี output row |
| ข้อมูลว่าง (null) หลังมีค่าแล้ว | carry EMA ไปข้างหน้า, Diff%=0, status=green, consecutive ไม่เปลี่ยน |
| ข้อมูลน้อยกว่า 14 วัน | EMA เริ่มจากวันแรกที่มีค่า ไม่ต้องรอครบ 14 วัน |
| EMA_prev = 0 | Diff% = 0 (ป้องกัน division by zero) |
| Tiny node (median < 1 m³/hr) | skip ไม่ alert |
| Bimodal node (q1 < median × 10%) | skip ไม่ alert |

---

## 7. ข้อมูลที่เก็บใน Database

### Table: `mnf_daily` (raw data จาก DMAMA)
```
dmama_branch_id, logger_id, node_label, record_date,
mnf_flow, min_pressure, mnf_at, report_year, report_month
```

### Table: `mnf_ema_daily` (computed)
```
dmama_branch_id, logger_id, node_label, record_date,
mnf_flow,       → ค่าจริงวันนั้น
ema_value,      → EMA-14 ที่คำนวณแล้ว
diff_percent,   → % ที่สูงกว่า/ต่ำกว่า EMA
consecutive_count, → จำนวนวันติดกันที่เกิน WARNING_LIMIT
alert_status    → 'green' | 'yellow' | 'red_spike' | 'red_accumulated'
```

### View: `mnf_ema_latest`
- ดึงแค่ row ล่าสุดของแต่ละ node
- ใช้โดย AlertPanel และ /mnf-monitor page

---

## 8. Workflow การใช้งานจริง (ทีมเขต)

```
ทุกเช้า:
  1. ระบบ sync MNF อัตโนมัติ → คำนวณ EMA → อัปเดต status
  2. เปิด Dashboard → AlertPanel แสดง Red nodes (สูงสุด 5)
  3. คลิก "ดูรายละเอียด" → /mnf-monitor

ที่ /mnf-monitor:
  4. ดู Summary Bar: Red_spike / Red_accumulated / Yellow / Green
  5. ดู Table เรียง Red ก่อน
  6. ดูว่า node ไหน สาขาไหน Diff% เท่าไหร่ ติดต่อกันกี่วัน
  7. ตัดสินใจว่าจะส่ง notification ให้สาขาหรือไม่ (Phase 2)

เมื่อตัดสินใจส่ง (Phase 2 ในอนาคต):
  8. กด "แจ้งสาขา" → สร้าง resolution_notification
  9. สาขาเห็นที่หน้า /notify → วางแผน Step Test
```

---

## 9. Parameters ที่อาจต้องปรับในอนาคต

```typescript
// lib/utils/ema-calc.ts

WARNING_LIMIT  = 50    // เปลี่ยนได้หากแจ้งเตือนบ่อยหรือน้อยเกินไป
SPIKE_LIMIT    = 200   // เปลี่ยนได้หากต้องการจับ spike ระดับอื่น
DAYS_TO_ALERT  = 3     // เปลี่ยนได้หากต้องการ sensitivity ต่างกัน
MIN_NODE_MEDIAN = 1.0  // เปลี่ยนได้หากต้องการ filter node ขนาดต่างกัน
BIMODAL_RATIO  = 0.10  // เปลี่ยนได้หาก bimodal detection เข้มงวดเกิน
```

แนะนำให้ทำ config table ใน Supabase ในอนาคต เพื่อให้ admin ปรับได้โดยไม่ต้อง deploy

---

## 10. Query สำคัญสำหรับตรวจสอบระบบ

```sql
-- ดูการกระจาย status ปัจจุบัน
SELECT alert_status, COUNT(*) as nodes
FROM mnf_ema_latest
GROUP BY alert_status;

-- ดู node ที่ถูก skip (tiny/bimodal) — จะไม่มีใน mnf_ema_daily
SELECT d.dmama_branch_id, d.node_label, COUNT(*) as days,
       ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY d.mnf_flow)::numeric, 2) as median,
       ROUND(PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY d.mnf_flow)::numeric, 2) as q1
FROM mnf_daily d
WHERE NOT EXISTS (
  SELECT 1 FROM mnf_ema_daily e
  WHERE e.dmama_branch_id = d.dmama_branch_id
    AND e.logger_id = d.logger_id
)
AND d.mnf_flow IS NOT NULL AND d.mnf_flow > 0
GROUP BY d.dmama_branch_id, d.node_label
HAVING COUNT(*) >= 14;

-- ดู Red nodes ล่าสุด
SELECT * FROM mnf_ema_latest
WHERE alert_status IN ('red_spike', 'red_accumulated')
ORDER BY diff_percent DESC;
```

---

*อัปเดตล่าสุด: พ.ค. 2569*
